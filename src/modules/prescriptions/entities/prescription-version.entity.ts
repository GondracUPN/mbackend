import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Prescription } from './prescription.entity';

@Entity({ name: 'prescription_versions' })
@Unique(['prescriptionId', 'versionNumber'])
@Index(['prescriptionId', 'createdAt'])
export class PrescriptionVersion {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'prescription_id', type: 'uuid' }) prescriptionId!: string;
  @ManyToOne(() => Prescription, (prescription) => prescription.versions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'prescription_id' })
  prescription!: Prescription;
  @Column({ name: 'version_number', type: 'integer' }) versionNumber!: number;
  @Column({ name: 'prescription_date', type: 'date' })
  prescriptionDate!: string;
  @Column({ name: 'measurement_place', type: 'varchar', length: 160 })
  measurementPlace!: string;
  @Column({ name: 'specialist_name', type: 'varchar', length: 160 })
  specialistName!: string;
  @Column({ name: 'specialist_type', type: 'varchar', length: 100 })
  specialistType!: string;

  @Column({ name: 'right_sphere', type: 'numeric', precision: 5, scale: 2 })
  rightSphere!: string;
  @Column({ name: 'right_cylinder', type: 'numeric', precision: 5, scale: 2 })
  rightCylinder!: string;
  @Column({ name: 'right_axis', type: 'smallint', nullable: true }) rightAxis!:
    number | null;
  @Column({
    name: 'right_add',
    type: 'numeric',
    nullable: true,
  })
  rightAdd!: string | null;
  @Column({
    name: 'right_prism',
    type: 'numeric',
    nullable: true,
  })
  rightPrism!: string | null;

  @Column({ name: 'left_sphere', type: 'numeric', precision: 5, scale: 2 })
  leftSphere!: string;
  @Column({ name: 'left_cylinder', type: 'numeric', precision: 5, scale: 2 })
  leftCylinder!: string;
  @Column({ name: 'left_axis', type: 'smallint', nullable: true }) leftAxis!:
    number | null;
  @Column({
    name: 'left_add',
    type: 'numeric',
    nullable: true,
  })
  leftAdd!: string | null;
  @Column({
    name: 'left_prism',
    type: 'numeric',
    nullable: true,
  })
  leftPrism!: string | null;

  @Column({ name: 'created_by_id', type: 'uuid' }) createdById!: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
