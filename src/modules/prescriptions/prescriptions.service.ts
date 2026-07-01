import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { normalizeSearchText } from '../../common/utils/normalize.util';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerStatus } from '../customers/enums/customer-status.enum';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { PrescriptionQueryDto } from './dto/prescription-query.dto';
import { PrescriptionVersion } from './entities/prescription-version.entity';
import { Prescription } from './entities/prescription.entity';
import { WorkOrder } from './entities/work-order.entity';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptions: Repository<Prescription>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    customerId: string,
    dto: CreatePrescriptionDto,
    user: AuthenticatedUser,
  ) {
    this.validateDate(dto.prescriptionDate);
    return this.dataSource.transaction(async (manager) => {
      const customer = await manager
        .getRepository(Customer)
        .findOneBy({ id: customerId, companyId: user.companyId });
      if (!customer) throw new NotFoundException('Cliente no encontrado.');
      if (customer.status !== CustomerStatus.ACTIVE)
        throw new ConflictException(
          'Debe reactivar al cliente antes de registrar una receta.',
        );
      const prescription = await manager.getRepository(Prescription).save(
        manager.getRepository(Prescription).create({
          companyId: user.companyId,
          customerId,
          currentVersionId: null,
        }),
      );
      const version = await manager
        .getRepository(PrescriptionVersion)
        .save(
          manager
            .getRepository(PrescriptionVersion)
            .create(this.versionData(prescription.id, 1, dto, user.id)),
        );
      prescription.currentVersionId = version.id;
      await manager.getRepository(Prescription).save(prescription);
      return this.findOne(prescription.id, user);
    });
  }

  async correct(
    id: string,
    dto: CreatePrescriptionDto,
    user: AuthenticatedUser,
  ) {
    this.validateDate(dto.prescriptionDate);
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Prescription);
      const prescription = await repository.findOne({
        where: { id, companyId: user.companyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!prescription) throw new NotFoundException('Receta no encontrada.');
      const latest = await manager.getRepository(PrescriptionVersion).findOne({
        where: { prescriptionId: id },
        order: { versionNumber: 'DESC' },
      });
      const version = await manager
        .getRepository(PrescriptionVersion)
        .save(
          manager
            .getRepository(PrescriptionVersion)
            .create(
              this.versionData(
                id,
                (latest?.versionNumber ?? 0) + 1,
                dto,
                user.id,
              ),
            ),
        );
      prescription.currentVersionId = version.id;
      await repository.save(prescription);
    });
    return this.findOne(id, user);
  }

  async list(
    query: PrescriptionQueryDto,
    user: AuthenticatedUser,
    customerId?: string,
  ) {
    const qb = this.prescriptions
      .createQueryBuilder('prescription')
      .leftJoinAndSelect('prescription.customer', 'customer')
      .leftJoinAndSelect('prescription.currentVersion', 'version')
      .where('prescription.companyId = :companyId', {
        companyId: user.companyId,
      })
      .andWhere('prescription.deletedAt IS NULL');
    if (customerId)
      qb.andWhere('prescription.customerId = :customerId', { customerId });
    if (query.search?.trim()) {
      const value = normalizeSearchText(query.search);
      const digits = query.search.replace(/\D/g, '');
      qb.andWhere(
        `(customer.searchText % :value OR customer.searchText ILIKE :contains OR customer.dni LIKE :digits)`,
        {
          value,
          contains: `%${value}%`,
          digits: `${digits}%`,
        },
      );
    }
    qb.orderBy('version.prescriptionDate', 'DESC')
      .addOrderBy('prescription.createdAt', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);
    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((item) => this.summary(item)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const prescription = await this.prescriptions.findOne({
      where: { id, companyId: user.companyId },
      relations: {
        customer: true,
        currentVersion: { createdBy: true },
        versions: { createdBy: true },
        orders: { prescriptionVersion: true, createdBy: true },
      },
      order: {
        versions: { versionNumber: 'DESC' },
        orders: { createdAt: 'DESC' },
      },
    });
    if (!prescription) throw new NotFoundException('Receta no encontrada.');
    return {
      ...this.summary(prescription),
      currentVersion: this.presentVersion(prescription.currentVersion),
      versions: prescription.versions.map((version) =>
        this.presentVersion(version),
      ),
      orders: prescription.orders.map((order) => this.presentOrder(order)),
    };
  }

  async createOrder(
    id: string,
    dto: CreateWorkOrderDto,
    user: AuthenticatedUser,
  ) {
    this.validateDate(dto.elaborationDate);
    if (dto.discount > dto.salePrice)
      throw new BadRequestException(
        'El descuento no puede superar el precio de venta.',
      );
    const prescription = await this.prescriptions.findOne({
      where: { id, companyId: user.companyId },
    });
    if (!prescription?.currentVersionId)
      throw new NotFoundException('Receta no encontrada.');
    const finalPrice =
      (Math.round(dto.salePrice * 100) - Math.round(dto.discount * 100)) / 100;
    const order = await this.dataSource.getRepository(WorkOrder).save(
      this.dataSource.getRepository(WorkOrder).create({
        companyId: user.companyId,
        prescriptionId: id,
        prescriptionVersionId: prescription.currentVersionId,
        elaborationDate: dto.elaborationDate,
        lensType: dto.lensType.trim(),
        laboratory: dto.laboratory.trim(),
        receiptNumber: dto.receiptNumber.trim(),
        salePrice: dto.salePrice.toFixed(2),
        discount: dto.discount.toFixed(2),
        finalPrice: finalPrice.toFixed(2),
        createdById: user.id,
      }),
    );
    return this.presentOrder(order);
  }

  private versionData(
    id: string,
    number: number,
    dto: CreatePrescriptionDto,
    userId: string,
  ) {
    const numberOrNull = (value?: number) =>
      value === undefined ? null : value.toFixed(2);
    return {
      prescriptionId: id,
      versionNumber: number,
      prescriptionDate: dto.prescriptionDate,
      measurementPlace: dto.measurementPlace.trim(),
      specialistName: dto.specialistName.trim(),
      specialistType: dto.specialistType.trim(),
      rightSphere: dto.rightSphere.toFixed(2),
      rightCylinder: dto.rightCylinder.toFixed(2),
      rightAxis: dto.rightCylinder === 0 ? null : (dto.rightAxis ?? null),
      rightAdd: numberOrNull(dto.rightAdd),
      rightPrism: numberOrNull(dto.rightPrism),
      leftSphere: dto.leftSphere.toFixed(2),
      leftCylinder: dto.leftCylinder.toFixed(2),
      leftAxis: dto.leftCylinder === 0 ? null : (dto.leftAxis ?? null),
      leftAdd: numberOrNull(dto.leftAdd),
      leftPrism: numberOrNull(dto.leftPrism),
      createdById: userId,
    };
  }

  private summary(prescription: Prescription) {
    return {
      id: prescription.id,
      customer: prescription.customer
        ? {
            id: prescription.customer.id,
            fullName: `${prescription.customer.lastNames}, ${prescription.customer.firstNames}`,
            dni: prescription.customer.dni,
          }
        : undefined,
      prescriptionDate: prescription.currentVersion?.prescriptionDate,
      versionNumber: prescription.currentVersion?.versionNumber,
      specialistName: prescription.currentVersion?.specialistName,
      createdAt: prescription.createdAt,
    };
  }

  private presentVersion(version: PrescriptionVersion) {
    const numeric = (value: string | null) =>
      value === null ? null : Number(value);
    return {
      id: version.id,
      versionNumber: version.versionNumber,
      prescriptionDate: version.prescriptionDate,
      measurementPlace: version.measurementPlace,
      specialistName: version.specialistName,
      specialistType: version.specialistType,
      rightSphere: Number(version.rightSphere),
      rightCylinder: Number(version.rightCylinder),
      rightAxis: version.rightAxis,
      rightAdd: numeric(version.rightAdd),
      rightPrism: numeric(version.rightPrism),
      leftSphere: Number(version.leftSphere),
      leftCylinder: Number(version.leftCylinder),
      leftAxis: version.leftAxis,
      leftAdd: numeric(version.leftAdd),
      leftPrism: numeric(version.leftPrism),
      createdBy: version.createdBy
        ? { id: version.createdBy.id, fullName: version.createdBy.fullName }
        : undefined,
      createdAt: version.createdAt,
    };
  }

  private presentOrder(order: WorkOrder) {
    return {
      id: order.id,
      elaborationDate: order.elaborationDate,
      lensType: order.lensType,
      laboratory: order.laboratory,
      receiptNumber: order.receiptNumber,
      salePrice: Number(order.salePrice),
      discount: Number(order.discount),
      finalPrice: Number(order.finalPrice),
      prescriptionVersion: order.prescriptionVersion?.versionNumber,
      createdBy: order.createdBy?.fullName,
      createdAt: order.createdAt,
    };
  }

  private validateDate(value: string) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    if (value > today)
      throw new BadRequestException('La fecha no puede estar en el futuro.');
  }
}
