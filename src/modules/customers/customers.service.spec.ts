import { ConflictException, ForbiddenException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { RoleName } from '../../common/enums/role-name.enum';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Customer } from './entities/customer.entity';
import { CustomerStatus } from './enums/customer-status.enum';
import { CustomersService } from './customers.service';

const admin: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  companyId: '22222222-2222-4222-8222-222222222222',
  branchId: '33333333-3333-4333-8333-333333333333',
  fullName: 'Administrador',
  email: 'admin@optica.local',
  roles: [RoleName.ADMIN],
};

function customer(overrides: Partial<Customer> = {}): Customer {
  return Object.assign(new Customer(), {
    id: '44444444-4444-4444-8444-444444444444',
    companyId: admin.companyId,
    createdInBranchId: admin.branchId,
    createdInBranch: { id: admin.branchId, name: 'Sede Principal' },
    dni: '74281234',
    firstNames: 'María Elena',
    lastNames: 'García López',
    searchText: 'garcia lopez maria elena',
    birthDate: '1980-06-30',
    address: 'Av. Arequipa 123',
    phone: '987654321',
    phoneNormalized: '987654321',
    status: CustomerStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    version: 1,
    ...overrides,
  });
}

describe('CustomersService', () => {
  let repository: jest.Mocked<
    Pick<
      Repository<Customer>,
      'findOne' | 'create' | 'save' | 'findOneBy' | 'softRemove'
    >
  >;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let service: CustomersService;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      softRemove: jest.fn(),
    };
    dataSource = { transaction: jest.fn() };
    service = new CustomersService(
      repository as unknown as Repository<Customer>,
      dataSource as unknown as DataSource,
    );
  });

  it('bloquea un DNI repetido dentro de la empresa', async () => {
    repository.findOne.mockResolvedValue(customer());

    await expect(
      service.create(
        {
          dni: '74281234',
          firstNames: 'Otra',
          lastNames: 'Persona',
          birthDate: '1990-01-01',
          address: 'Lima',
          phone: '999999999',
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('normaliza los datos antes de crear el cliente', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.create.mockImplementation((value) =>
      customer(value as Partial<Customer>),
    );
    repository.save.mockResolvedValue(
      customer({ firstNames: 'María Elena', lastNames: 'García López' }),
    );

    const result = await service.create(
      {
        dni: '74281234',
        firstNames: '  María  Elena ',
        lastNames: ' García  López ',
        birthDate: '1980-06-30',
        address: ' Av.  Arequipa  123 ',
        phone: '+51 987-654-321',
      },
      admin,
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        searchText: 'garcia lopez maria elena',
        phoneNormalized: '51987654321',
        companyId: admin.companyId,
        createdInBranchId: admin.branchId,
      }),
    );
    expect(result.fullName).toBe('García López, María Elena');
  });

  it('registra una auditoría al cambiar el DNI', async () => {
    const stored = customer();
    const transactionalRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(stored)
        .mockResolvedValueOnce(null),
      save: jest.fn().mockResolvedValue(stored),
    };
    const auditRepository = { save: jest.fn().mockResolvedValue(undefined) };
    const manager = {
      getRepository: jest.fn((entity: typeof Customer | typeof AuditLog) =>
        entity === Customer ? transactionalRepository : auditRepository,
      ),
    } as unknown as EntityManager;
    dataSource.transaction.mockImplementation(async (callback) => {
      // La firma de TypeORM es genérica; Jest pierde el tipo de retorno del callback.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await callback(manager);
    });

    await service.update(
      stored.id,
      {
        version: 1,
        dni: '87654321',
        firstNames: stored.firstNames,
        lastNames: stored.lastNames,
        birthDate: stored.birthDate,
        address: stored.address,
        phone: stored.phone,
      },
      admin,
    );

    expect(auditRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldName: 'dni',
        oldValue: '74281234',
        newValue: '87654321',
        userId: admin.id,
      }),
    );
  });

  it('impide que un usuario no administrador elimine clientes', async () => {
    await expect(
      service.remove('44444444-4444-4444-8444-444444444444', {
        ...admin,
        roles: [RoleName.SELLER],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.softRemove).not.toHaveBeenCalled();
  });
});
