import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PrescriptionQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(120) search?: string;
}
