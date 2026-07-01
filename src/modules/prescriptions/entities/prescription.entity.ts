import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Company } from '../../organizations/entities/company.entity';
import { WorkOrder } from './work-order.entity';
import { PrescriptionVersion } from './prescription-version.entity';

@Entity({ name: 'prescriptions' })
@Index(['companyId', 'customerId'])
export class Prescription extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ name: 'customer_id', type: 'uuid' }) customerId!: string;
  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @Column({ name: 'current_version_id', type: 'uuid', nullable: true })
  currentVersionId!: string | null;
  @ManyToOne(() => PrescriptionVersion, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'current_version_id' })
  currentVersion!: PrescriptionVersion;

  @OneToMany(() => PrescriptionVersion, (version) => version.prescription)
  versions!: PrescriptionVersion[];
  @OneToMany(() => WorkOrder, (order) => order.prescription)
  orders!: WorkOrder[];
}
