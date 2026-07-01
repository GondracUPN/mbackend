import 'dotenv/config';
import { hash } from 'bcryptjs';
import { RoleName } from '../common/enums/role-name.enum';
import { Branch } from '../modules/organizations/entities/branch.entity';
import { Company } from '../modules/organizations/entities/company.entity';
import { Role } from '../modules/users/entities/role.entity';
import { User } from '../modules/users/entities/user.entity';
import dataSource from './data-source';

const roleLabels: Record<RoleName, string> = {
  [RoleName.ADMIN]: 'Administrador',
  [RoleName.SELLER]: 'Vendedor',
  [RoleName.OPTOMETRIST]: 'Optómetra',
  [RoleName.RECEPTIONIST]: 'Recepción',
  [RoleName.READ_ONLY]: 'Solo lectura',
};

async function seed(): Promise<void> {
  await dataSource.initialize();
  await dataSource.transaction(async (manager) => {
    const companyRepository = manager.getRepository(Company);
    const branchRepository = manager.getRepository(Branch);
    const roleRepository = manager.getRepository(Role);
    const userRepository = manager.getRepository(User);

    let company = await companyRepository.findOneBy({
      slug: 'optica-principal',
    });
    company ??= await companyRepository.save(
      companyRepository.create({
        legalName: process.env.INITIAL_COMPANY_NAME ?? 'Óptica Principal',
        slug: 'optica-principal',
        isActive: true,
      }),
    );

    let branch = await branchRepository.findOneBy({
      companyId: company.id,
      code: 'PRINCIPAL',
    });
    branch ??= await branchRepository.save(
      branchRepository.create({
        companyId: company.id,
        name: process.env.INITIAL_BRANCH_NAME ?? 'Sede Principal',
        code: 'PRINCIPAL',
        isActive: true,
      }),
    );

    const roles = new Map<RoleName, Role>();
    for (const roleName of Object.values(RoleName)) {
      let role = await roleRepository.findOneBy({ name: roleName });
      role ??= await roleRepository.save(
        roleRepository.create({ name: roleName, label: roleLabels[roleName] }),
      );
      roles.set(roleName, role);
    }

    const email = (
      process.env.INITIAL_ADMIN_EMAIL ?? 'admin@optica.local'
    ).toLowerCase();
    const existingAdmin = await userRepository.findOneBy({
      companyId: company.id,
      email,
    });
    if (!existingAdmin) {
      const password = process.env.INITIAL_ADMIN_PASSWORD;
      if (!password || password.length < 8) {
        throw new Error(
          'INITIAL_ADMIN_PASSWORD debe contener al menos 8 caracteres.',
        );
      }
      await userRepository.save(
        userRepository.create({
          companyId: company.id,
          branchId: branch.id,
          fullName: process.env.INITIAL_ADMIN_NAME ?? 'Administrador',
          email,
          passwordHash: await hash(password, 12),
          isActive: true,
          roles: [roles.get(RoleName.ADMIN)!],
        }),
      );
    }
  });
  await dataSource.destroy();
}

seed().catch(async (error: unknown) => {
  console.error(error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exitCode = 1;
});
