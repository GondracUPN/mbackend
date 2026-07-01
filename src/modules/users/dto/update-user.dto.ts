import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RoleName } from '../../../common/enums/role-name.enum';

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160) fullName?: string;
  @IsOptional() @IsEmail() @MaxLength(180) email?: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(128) password?: string;
  @IsOptional() @IsEnum(RoleName) role?: RoleName;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
