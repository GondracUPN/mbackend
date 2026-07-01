import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';
import { CustomerConsent } from '../modules/customers/entities/customer-consent.entity';
import { Customer } from '../modules/customers/entities/customer.entity';
import { Branch } from '../modules/organizations/entities/branch.entity';
import { Company } from '../modules/organizations/entities/company.entity';
import { Role } from '../modules/users/entities/role.entity';
import { User } from '../modules/users/entities/user.entity';
import { InitialSchema1719792000000 } from './migrations/1719792000000-initial-schema';
import { PrescriptionsAndOrders1719878400000 } from './migrations/1719878400000-prescriptions-and-orders';
import { Prescription } from '../modules/prescriptions/entities/prescription.entity';
import { PrescriptionVersion } from '../modules/prescriptions/entities/prescription-version.entity';
import { WorkOrder } from '../modules/prescriptions/entities/work-order.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === 'false'
      ? false
      : { rejectUnauthorized: false },
  entities: [
    Company,
    Branch,
    Role,
    User,
    Customer,
    CustomerConsent,
    AuditLog,
    Prescription,
    PrescriptionVersion,
    WorkOrder,
  ],
  migrations: [InitialSchema1719792000000, PrescriptionsAndOrders1719878400000],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});
