import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { RoleName } from '../../common/enums/role-name.enum';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly dataSource: DataSource,
  ) {}

  async list(current: AuthenticatedUser) {
    const users = await this.users.find({
      where: { companyId: current.companyId },
      relations: { branch: true, roles: true },
      order: { isActive: 'DESC', fullName: 'ASC' },
    });
    return users.map((user) => this.present(user));
  }

  async findOne(id: string, current: AuthenticatedUser) {
    const user = await this.users.findOne({
      where: { id, companyId: current.companyId },
      relations: { branch: true, roles: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    return this.present(user);
  }

  async create(dto: CreateUserDto, current: AuthenticatedUser) {
    if (!current.branchId)
      throw new BadRequestException(
        'El administrador debe tener una sucursal asignada.',
      );
    const role = await this.roles.findOneBy({ name: dto.role });
    if (!role) throw new BadRequestException('El rol seleccionado no existe.');
    const email = dto.email.trim().toLowerCase();
    const existing = await this.users.findOneBy({
      companyId: current.companyId,
      email,
    });
    if (existing)
      throw new ConflictException(
        'Ya existe un usuario con este correo en la empresa.',
      );
    try {
      const saved = await this.users.save(
        this.users.create({
          companyId: current.companyId,
          branchId: current.branchId,
          fullName: dto.fullName.trim().replace(/\s+/g, ' '),
          email,
          passwordHash: await hash(dto.password, 12),
          isActive: true,
          roles: [role],
        }),
      );
      return this.findOne(saved.id, current);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          'Ya existe un usuario con este correo en la empresa.',
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto, current: AuthenticatedUser) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(User);
      const user = await repository.findOne({
        where: { id, companyId: current.companyId },
        relations: { branch: true, roles: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado.');
      const currentRole = user.roles[0]?.name;
      const removesAdmin =
        currentRole === RoleName.ADMIN &&
        ((dto.role && dto.role !== RoleName.ADMIN) || dto.isActive === false);
      if (
        id === current.id &&
        (dto.isActive === false || (dto.role && dto.role !== RoleName.ADMIN))
      ) {
        throw new BadRequestException(
          'No puede desactivar su propia cuenta ni quitarse el rol Administrador.',
        );
      }
      if (
        removesAdmin &&
        (await this.activeAdminCount(current.companyId, manager)) <= 1
      ) {
        throw new BadRequestException(
          'Debe existir al menos un administrador activo.',
        );
      }
      if (dto.role) {
        const role = await manager
          .getRepository(Role)
          .findOneBy({ name: dto.role });
        if (!role)
          throw new BadRequestException('El rol seleccionado no existe.');
        user.roles = [role];
      }
      if (dto.fullName)
        user.fullName = dto.fullName.trim().replace(/\s+/g, ' ');
      if (dto.email) user.email = dto.email.trim().toLowerCase();
      if (dto.password) user.passwordHash = await hash(dto.password, 12);
      if (dto.isActive !== undefined) user.isActive = dto.isActive;
      try {
        return this.present(await repository.save(user));
      } catch (error) {
        if (
          error instanceof QueryFailedError &&
          (error.driverError as { code?: string }).code === '23505'
        ) {
          throw new ConflictException(
            'Ya existe un usuario con este correo en la empresa.',
          );
        }
        throw error;
      }
    });
  }

  private activeAdminCount(companyId: string, manager: EntityManager) {
    return manager
      .getRepository(User)
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role', 'role.name = :role', {
        role: RoleName.ADMIN,
      })
      .where('user.companyId = :companyId', { companyId })
      .andWhere('user.isActive = true')
      .andWhere('user.deletedAt IS NULL')
      .getCount();
  }

  private present(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      isActive: user.isActive,
      role: user.roles[0]?.name,
      roleLabel: user.roles[0]?.label,
      branch: user.branch
        ? { id: user.branch.id, name: user.branch.name }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
