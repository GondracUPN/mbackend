import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RoleName } from '../../../common/enums/role-name.enum';

export class CreateUserDto {
  @IsString() @MinLength(3) @MaxLength(160) fullName!: string;
  @IsEmail() @MaxLength(180) email!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
  @IsEnum(RoleName) role!: RoleName;
}
