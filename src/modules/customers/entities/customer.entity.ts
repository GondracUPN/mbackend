import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Branch } from '../../organizations/entities/branch.entity';
import { Company } from '../../organizations/entities/company.entity';
import { CustomerStatus } from '../enums/customer-status.enum';

@Entity({ name: 'customers' })
@Index(['companyId', 'dni'], { unique: true })
@Index(['companyId', 'status'])
export class Customer extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ name: 'created_in_branch_id', type: 'uuid' })
  createdInBranchId!: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_in_branch_id' })
  createdInBranch!: Branch;

  @Column({ type: 'char', length: 8 })
  dni!: string;

  @Column({ name: 'first_names', type: 'varchar', length: 120 })
  firstNames!: string;

  @Column({ name: 'last_names', type: 'varchar', length: 120 })
  lastNames!: string;

  @Column({ name: 'search_text', type: 'varchar', length: 300 })
  searchText!: string;

  @Column({ name: 'birth_date', type: 'date' })
  birthDate!: string;

  @Column({ type: 'varchar', length: 300 })
  address!: string;

  @Column({ type: 'varchar', length: 30 })
  phone!: string;

  @Column({ name: 'phone_normalized', type: 'varchar', length: 20 })
  phoneNormalized!: string;

  @Column({
    type: 'enum',
    enum: CustomerStatus,
    default: CustomerStatus.ACTIVE,
  })
  status!: CustomerStatus;
}
