import { PartialType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @IsInt()
  @Min(1)
  version!: number;
}
