import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RoleName } from '../../../common/enums/role-name.enum';
import { User } from './user.entity';

@Entity({ name: 'roles' })
export class Role extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'enum', enum: RoleName })
  name!: RoleName;

  @Column({ type: 'varchar', length: 100 })
  label!: string;

  @ManyToMany(() => User, (user) => user.roles)
  users!: User[];
}
