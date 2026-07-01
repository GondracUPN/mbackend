import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from './company.entity';

@Entity({ name: 'branches' })
@Index(['companyId', 'code'], { unique: true })
export class Branch extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, (company) => company.branches, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 30 })
  code!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
}
