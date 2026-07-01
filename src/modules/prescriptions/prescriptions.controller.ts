import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { PrescriptionQueryDto } from './dto/prescription-query.dto';
import { PrescriptionsService } from './prescriptions.service';

@ApiTags('Recetas')
@Controller()
export class PrescriptionsController {
  constructor(private readonly service: PrescriptionsService) {}

  @Post('customers/:customerId/prescriptions')
  create(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(customerId, dto, user);
  }
  @Get('customers/:customerId/prescriptions')
  byCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: PrescriptionQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.list(query, user, customerId);
  }
  @Get('prescriptions')
  list(
    @Query() query: PrescriptionQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.list(query, user);
  }
  @Get('prescriptions/:id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user);
  }
  @Post('prescriptions/:id/versions')
  correct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.correct(id, dto, user);
  }
  @Post('prescriptions/:id/orders')
  order(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateWorkOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createOrder(id, dto, user);
  }
}
