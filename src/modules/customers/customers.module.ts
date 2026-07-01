import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { CustomerConsent } from './entities/customer-consent.entity';
import { Customer } from './entities/customer.entity';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, CustomerConsent, AuditLog])],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
