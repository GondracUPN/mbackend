import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class SimilarCustomersQueryDto {
  @IsOptional()
  @Matches(/^\d{0,8}$/)
  dni?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstNames?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastNames?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
