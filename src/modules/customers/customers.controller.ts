import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '../../common/enums/role-name.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { SimilarCustomersQueryDto } from './dto/similar-customers-query.dto';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@ApiTags('Clientes')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.create(dto, user);
  }

  @Get()
  findAll(
    @Query() query: CustomerQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.findAll(query, user);
  }

  @Roles(RoleName.ADMIN)
  @Get('deleted')
  findDeleted(
    @Query() query: CustomerQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.findAll(query, user, true);
  }

  @Get('similar')
  findSimilar(
    @Query() query: SimilarCustomersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.findSimilar(query, user);
  }

  @Roles(RoleName.ADMIN)
  @Get('deleted/:id')
  findOneDeleted(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.findOne(id, user, true);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.update(id, dto, user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.changeStatus(id, dto.status, user);
  }

  @Roles(RoleName.ADMIN)
  @Delete(':id')
  @HttpCode(204)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.remove(id, user);
  }

  @Roles(RoleName.ADMIN)
  @Post(':id/restore')
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.restore(id, user);
  }
}
