import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrescriptionVersion } from './entities/prescription-version.entity';
import { Prescription } from './entities/prescription.entity';
import { WorkOrder } from './entities/work-order.entity';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prescription, PrescriptionVersion, WorkOrder]),
  ],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
})
export class PrescriptionsModule {}
