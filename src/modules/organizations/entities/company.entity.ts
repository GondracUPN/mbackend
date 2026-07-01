import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Branch } from './branch.entity';

@Entity({ name: 'companies' })
export class Company extends BaseEntity {
  @Column({ name: 'legal_name', type: 'varchar', length: 160 })
  legalName!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 60 })
  slug!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(() => Branch, (branch) => branch.company)
  branches!: Branch[];
}
