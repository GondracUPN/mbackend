import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateWorkOrderDto {
  @IsDateString({ strict: true }) elaborationDate!: string;
  @IsString() @MinLength(2) @MaxLength(160) lensType!: string;
  @IsString() @MinLength(2) @MaxLength(160) laboratory!: string;
  @IsString() @MinLength(1) @MaxLength(60) receiptNumber!: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  salePrice!: number;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  discount!: number;
}
