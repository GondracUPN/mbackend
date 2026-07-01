import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { RoleName } from '../../common/enums/role-name.enum';
import {
  normalizePhone,
  normalizeSearchText,
} from '../../common/utils/normalize.util';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { SimilarCustomersQueryDto } from './dto/similar-customers-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { CustomerStatus } from './enums/customer-status.enum';
import { Prescription } from '../prescriptions/entities/prescription.entity';

interface PostgresError extends Error {
  code?: string;
  constraint?: string;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateCustomerDto, user: AuthenticatedUser) {
    if (!user.branchId) {
      throw new BadRequestException(
        'El usuario debe tener una sucursal asignada.',
      );
    }
    this.validateBirthDate(dto.birthDate);
    const existing = await this.findByDni(dto.dni, user.companyId, true);
    if (existing) this.throwDniConflict(existing);

    const customer = this.customers.create({
      ...this.clean(dto),
      companyId: user.companyId,
      createdInBranchId: user.branchId,
      status: CustomerStatus.ACTIVE,
    });
    try {
      return this.present(await this.customers.save(customer));
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const duplicate = await this.findByDni(dto.dni, user.companyId, true);
        if (duplicate) this.throwDniConflict(duplicate);
      }
      throw error;
    }
  }

  async findAll(
    query: CustomerQueryDto,
    user: AuthenticatedUser,
    deleted = false,
  ) {
    const qb = this.customers
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.createdInBranch', 'branch')
      .where('customer.companyId = :companyId', { companyId: user.companyId });

    if (deleted) qb.withDeleted().andWhere('customer.deletedAt IS NOT NULL');
    else qb.andWhere('customer.deletedAt IS NULL');

    if (query.status)
      qb.andWhere('customer.status = :status', { status: query.status });
    if (query.search?.trim()) {
      const normalized = normalizeSearchText(query.search);
      const digits = normalizePhone(query.search);
      qb.andWhere(
        `(
          customer.searchText % :normalized
          OR customer.searchText ILIKE :contains
          OR customer.dni LIKE :digitPrefix
          OR customer.phoneNormalized LIKE :digitContains
        )`,
        {
          normalized,
          contains: `%${normalized}%`,
          digitPrefix: `${digits}%`,
          digitContains: `%${digits}%`,
        },
      );
    }

    const sortColumns = {
      lastNames: 'customer.lastNames',
      firstNames: 'customer.firstNames',
      createdAt: 'customer.createdAt',
    } as const;
    qb.orderBy(sortColumns[query.sortBy], query.sortOrder)
      .addOrderBy('customer.id', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((item) => this.present(item)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async findOne(id: string, user: AuthenticatedUser, withDeleted = false) {
    const customer = await this.customers.findOne({
      where: { id, companyId: user.companyId },
      relations: { createdInBranch: true },
      withDeleted,
    });
    if (!customer || (!withDeleted && customer.deletedAt)) {
      throw new NotFoundException('Cliente no encontrado.');
    }
    return this.present(customer);
  }

  async findSimilar(query: SimilarCustomersQueryDto, user: AuthenticatedUser) {
    const dni = query.dni?.trim();
    if (dni?.length === 8) {
      const exact = await this.findByDni(dni, user.companyId, true);
      if (exact) return [this.present(exact, 'DNI_EXACTO')];
    }
    const name = normalizeSearchText(
      `${query.lastNames ?? ''} ${query.firstNames ?? ''}`,
    );
    const phone = normalizePhone(query.phone ?? '');
    if (name.length < 4 && phone.length < 6) return [];

    const qb = this.customers
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.createdInBranch', 'branch')
      .where('customer.companyId = :companyId', { companyId: user.companyId })
      .andWhere('customer.deletedAt IS NULL')
      .andWhere(
        '(customer.searchText % :name OR customer.phoneNormalized = :phone)',
        { name, phone: phone || '__none__' },
      )
      .orderBy('similarity(customer.searchText, :name)', 'DESC')
      .take(5);
    return (await qb.getMany()).map((item) =>
      this.present(item, 'POSIBLE_COINCIDENCIA'),
    );
  }

  async update(id: string, dto: UpdateCustomerDto, user: AuthenticatedUser) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Customer);
      const customer = await repository.findOne({
        where: { id, companyId: user.companyId },
        relations: { createdInBranch: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!customer) throw new NotFoundException('Cliente no encontrado.');
      if (customer.version !== dto.version) {
        throw new ConflictException({
          code: 'CUSTOMER_CHANGED',
          message:
            'Este cliente fue modificado por otro usuario. Actualice la página.',
        });
      }
      if (dto.dni && dto.dni !== customer.dni) {
        this.requireAdmin(
          user,
          'Solo un administrador puede modificar el DNI.',
        );
        const duplicate = await repository.findOne({
          where: { companyId: user.companyId, dni: dto.dni },
          relations: { createdInBranch: true },
          withDeleted: true,
        });
        if (duplicate && duplicate.id !== customer.id)
          this.throwDniConflict(duplicate);
        await this.writeDniAudit(manager, customer, dto.dni, user.id);
      }
      if (dto.birthDate) this.validateBirthDate(dto.birthDate);
      Object.assign(customer, this.clean({ ...customer, ...dto }));
      try {
        return this.present(await repository.save(customer));
      } catch (error) {
        if (this.isUniqueViolation(error)) {
          const duplicate = await this.findByDni(
            dto.dni ?? customer.dni,
            user.companyId,
            true,
          );
          if (duplicate) this.throwDniConflict(duplicate);
        }
        throw error;
      }
    });
  }

  async changeStatus(
    id: string,
    status: CustomerStatus,
    user: AuthenticatedUser,
  ) {
    const customer = await this.customers.findOneBy({
      id,
      companyId: user.companyId,
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');
    customer.status = status;
    return this.present(await this.customers.save(customer));
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    this.requireAdmin(user, 'Solo un administrador puede eliminar clientes.');
    const customer = await this.customers.findOneBy({
      id,
      companyId: user.companyId,
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');
    if (await this.hasRelatedHistory(id)) {
      throw new ConflictException({
        code: 'CUSTOMER_HAS_HISTORY',
        message:
          'Este cliente tiene historial y no puede eliminarse. Puede marcarlo como inactivo.',
      });
    }
    await this.customers.softRemove(customer);
  }

  async restore(id: string, user: AuthenticatedUser) {
    this.requireAdmin(user, 'Solo un administrador puede restaurar clientes.');
    const customer = await this.customers.findOne({
      where: { id, companyId: user.companyId },
      relations: { createdInBranch: true },
      withDeleted: true,
    });
    if (!customer?.deletedAt)
      throw new NotFoundException('Cliente eliminado no encontrado.');
    await this.customers.restore(id);
    customer.deletedAt = null;
    return this.present(customer);
  }

  private clean(
    dto: CreateCustomerDto | (CreateCustomerDto & Record<string, unknown>),
  ) {
    const firstNames = dto.firstNames.trim().replace(/\s+/g, ' ');
    const lastNames = dto.lastNames.trim().replace(/\s+/g, ' ');
    return {
      dni: dto.dni.trim(),
      firstNames,
      lastNames,
      searchText: normalizeSearchText(`${lastNames} ${firstNames}`),
      birthDate: dto.birthDate,
      address: dto.address.trim().replace(/\s+/g, ' '),
      phone: dto.phone.trim(),
      phoneNormalized: normalizePhone(dto.phone),
    };
  }

  private async findByDni(dni: string, companyId: string, withDeleted = false) {
    return this.customers.findOne({
      where: { dni, companyId },
      relations: { createdInBranch: true },
      withDeleted,
    });
  }

  private throwDniConflict(customer: Customer): never {
    throw new ConflictException({
      code: 'DNI_ALREADY_EXISTS',
      message: 'El DNI ya pertenece a un cliente registrado en esta empresa.',
      customer: this.present(customer),
    });
  }

  private async writeDniAudit(
    manager: EntityManager,
    customer: Customer,
    newDni: string,
    userId: string,
  ) {
    await manager.getRepository(AuditLog).save({
      companyId: customer.companyId,
      entityType: 'CUSTOMER',
      entityId: customer.id,
      action: 'FIELD_UPDATED',
      fieldName: 'dni',
      oldValue: customer.dni,
      newValue: newDni,
      userId,
    });
  }

  private validateBirthDate(value: string): void {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match)
      throw new BadRequestException('La fecha de nacimiento no es válida.');
    const [, year, month, day] = match;
    const date = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day)),
    );
    const isRealDate =
      date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() + 1 === Number(month) &&
      date.getUTCDate() === Number(day);
    if (!isRealDate || value > this.todayInLima()) {
      throw new BadRequestException('La fecha de nacimiento no es válida.');
    }
  }

  private requireAdmin(user: AuthenticatedUser, message: string): void {
    if (!user.roles.includes(RoleName.ADMIN))
      throw new ForbiddenException(message);
  }

  private async hasRelatedHistory(customerId: string): Promise<boolean> {
    return (
      (await this.dataSource.getRepository(Prescription).count({
        where: { customerId },
        withDeleted: true,
      })) > 0
    );
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as PostgresError).code === '23505'
    );
  }

  private present(customer: Customer, matchType?: string) {
    return {
      id: customer.id,
      dni: customer.dni,
      firstNames: customer.firstNames,
      lastNames: customer.lastNames,
      fullName: `${customer.lastNames}, ${customer.firstNames}`,
      birthDate: customer.birthDate,
      age: this.calculateAge(customer.birthDate),
      address: customer.address,
      phone: customer.phone,
      status: customer.status,
      createdInBranch: customer.createdInBranch
        ? {
            id: customer.createdInBranch.id,
            name: customer.createdInBranch.name,
          }
        : undefined,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      deletedAt: customer.deletedAt,
      version: customer.version,
      ...(matchType ? { matchType } : {}),
    };
  }

  private calculateAge(birthDate: string): number {
    const [todayYear, todayMonth, todayDay] = this.todayInLima()
      .split('-')
      .map(Number);
    const [year, month, day] = birthDate.split('-').map(Number);
    let age = todayYear - year;
    if (todayMonth < month || (todayMonth === month && todayDay < day)) age--;
    return age;
  }

  private todayInLima(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
  }
}
