import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsQuarterDiopter } from '../validators/quarter-diopter.validator';

export class CreatePrescriptionDto {
  @IsDateString({ strict: true }) prescriptionDate!: string;
  @IsString() @MinLength(2) @MaxLength(160) measurementPlace!: string;
  @IsString() @MinLength(2) @MaxLength(160) specialistName!: string;
  @IsString() @MinLength(2) @MaxLength(100) specialistType!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-29)
  @Max(26.75)
  @IsQuarterDiopter()
  rightSphere!: number;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-10)
  @Max(10)
  @IsQuarterDiopter()
  rightCylinder!: number;
  @ValidateIf((dto: CreatePrescriptionDto) => dto.rightCylinder !== 0)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(180)
  rightAxis?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rightAdd?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rightPrism?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-29)
  @Max(26.75)
  @IsQuarterDiopter()
  leftSphere!: number;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-10)
  @Max(10)
  @IsQuarterDiopter()
  leftCylinder!: number;
  @ValidateIf((dto: CreatePrescriptionDto) => dto.leftCylinder !== 0)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(180)
  leftAxis?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  leftAdd?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  leftPrism?: number;
}
