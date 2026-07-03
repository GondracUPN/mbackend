import { DataSource, EntityManager, Repository } from 'typeorm';
import { RoleName } from '../../common/enums/role-name.enum';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerStatus } from '../customers/enums/customer-status.enum';
import { PrescriptionVersion } from './entities/prescription-version.entity';
import { Prescription } from './entities/prescription.entity';
import { WorkOrder } from './entities/work-order.entity';
import { PrescriptionsService } from './prescriptions.service';

const user: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  companyId: '22222222-2222-4222-8222-222222222222',
  branchId: '33333333-3333-4333-8333-333333333333',
  fullName: 'Optometra',
  email: 'optometra@optica.local',
  roles: [RoleName.OPTOMETRIST],
};

const prescriptionId = '44444444-4444-4444-8444-444444444444';

describe('PrescriptionsService', () => {
  it('consulta la receta nueva solamente después de confirmar la transacción', async () => {
    const customerRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: '55555555-5555-4555-8555-555555555555',
        companyId: user.companyId,
        status: CustomerStatus.ACTIVE,
      }),
    };
    const expirationQuery = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const storedPrescription = Object.assign(new Prescription(), {
      id: prescriptionId,
      companyId: user.companyId,
      customerId: '55555555-5555-4555-8555-555555555555',
      currentVersionId: null,
    });
    const prescriptionRepository = {
      create: jest.fn().mockReturnValue(storedPrescription),
      save: jest.fn().mockResolvedValue(storedPrescription),
      createQueryBuilder: jest.fn().mockReturnValue(expirationQuery),
    };
    const versionRepository = {
      create: jest.fn().mockImplementation((value: object) => value),
      save: jest.fn().mockResolvedValue({
        id: '66666666-6666-4666-8666-666666666666',
      }),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Customer) return customerRepository;
        if (entity === Prescription) return prescriptionRepository;
        return versionRepository;
      }),
    } as unknown as EntityManager;
    let transactionCommitted = false;
    const dataSource = {
      transaction: jest.fn(
        async (callback: (manager: EntityManager) => Promise<string>) => {
          const result = await callback(manager);
          transactionCommitted = true;
          return result;
        },
      ),
    } as unknown as DataSource;
    const service = new PrescriptionsService(
      {} as Repository<Prescription>,
      dataSource,
    );
    const result = { id: prescriptionId };
    const findOneSpy = jest.spyOn(service, 'findOne').mockImplementation(() => {
      expect(transactionCommitted).toBe(true);
      return Promise.resolve(result as never);
    });

    await expect(
      service.create(
        '55555555-5555-4555-8555-555555555555',
        {
          prescriptionDate: '2026-01-01',
          measurementPlace: 'Consultorio',
          specialistName: 'Especialista',
          specialistType: 'Optometra',
          rightSphere: 0,
          rightCylinder: 0,
          leftSphere: 0,
          leftCylinder: 0,
        },
        user,
      ),
    ).resolves.toBe(result);
    expect(expirationQuery.offset).toHaveBeenCalledWith(2);
    expect(findOneSpy).toHaveBeenCalledWith(prescriptionId, user);
  });

  it('elimina las recetas anteriores que exceden las tres permitidas', async () => {
    const expiredIds = [
      '77777777-7777-4777-8777-777777777777',
      '88888888-8888-4888-8888-888888888888',
    ];
    const expirationQuery = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(expiredIds.map((id) => ({ id }))),
    };
    const updateQuery = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const prescriptionDeleteQuery = {
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const orderDeleteQuery = {
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const versionDeleteQuery = {
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const prescriptionRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(expirationQuery)
        .mockReturnValueOnce(updateQuery)
        .mockReturnValueOnce(prescriptionDeleteQuery),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Prescription) return prescriptionRepository;
        if (entity === WorkOrder)
          return { createQueryBuilder: () => orderDeleteQuery };
        if (entity === PrescriptionVersion)
          return { createQueryBuilder: () => versionDeleteQuery };
        throw new Error('Repositorio inesperado');
      }),
    } as unknown as EntityManager;
    const service = new PrescriptionsService(
      {} as Repository<Prescription>,
      {} as DataSource,
    );

    await service['keepLatestThreePrescriptions'](
      manager,
      '55555555-5555-4555-8555-555555555555',
      user.companyId,
      prescriptionId,
    );

    expect(updateQuery.set).toHaveBeenCalledWith({ currentVersionId: null });
    expect(orderDeleteQuery.where).toHaveBeenCalledWith(
      'prescription_id IN (:...ids)',
      { ids: expiredIds },
    );
    expect(versionDeleteQuery.where).toHaveBeenCalledWith(
      'prescription_id IN (:...ids)',
      { ids: expiredIds },
    );
    expect(prescriptionDeleteQuery.where).toHaveBeenCalledWith(
      'id IN (:...ids)',
      { ids: expiredIds },
    );
  });
});
