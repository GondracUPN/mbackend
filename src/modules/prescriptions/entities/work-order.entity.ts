import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../organizations/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { Prescription } from './prescription.entity';
import { PrescriptionVersion } from './prescription-version.entity';

@Entity({ name: 'work_orders' })
@Index(['companyId', 'prescriptionId'])
export class WorkOrder extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;
  @Column({ name: 'prescription_id', type: 'uuid' }) prescriptionId!: string;
  @ManyToOne(() => Prescription, (prescription) => prescription.orders, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'prescription_id' })
  prescription!: Prescription;
  @Column({ name: 'prescription_version_id', type: 'uuid' })
  prescriptionVersionId!: string;
  @ManyToOne(() => PrescriptionVersion, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'prescription_version_id' })
  prescriptionVersion!: PrescriptionVersion;
  @Column({ name: 'elaboration_date', type: 'date' }) elaborationDate!: string;
  @Column({ name: 'lens_type', type: 'varchar', length: 160 })
  lensType!: string;
  @Column({ type: 'varchar', length: 160 }) laboratory!: string;
  @Column({ name: 'receipt_number', type: 'varchar', length: 60 })
  receiptNumber!: string;
  @Column({ name: 'sale_price', type: 'numeric', precision: 12, scale: 2 })
  salePrice!: string;
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  discount!: string;
  @Column({ name: 'final_price', type: 'numeric', precision: 12, scale: 2 })
  finalPrice!: string;
  @Column({ name: 'created_by_id', type: 'uuid' }) createdById!: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;
}
