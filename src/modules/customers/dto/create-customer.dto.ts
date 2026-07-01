import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PERSON_NAME = /^[\p{L} .'-]+$/u;

export class CreateCustomerDto {
  @ApiProperty({ example: '74281234' })
  @Matches(/^\d{8}$/, {
    message: 'El DNI debe contener exactamente 8 dígitos.',
  })
  dni!: string;

  @ApiProperty({ example: 'María Elena' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  @Matches(PERSON_NAME, {
    message: 'Los nombres contienen caracteres no permitidos.',
  })
  firstNames!: string;

  @ApiProperty({ example: 'García López' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  @Matches(PERSON_NAME, {
    message: 'Los apellidos contienen caracteres no permitidos.',
  })
  lastNames!: string;

  @ApiProperty({ example: '1980-06-30' })
  @IsDateString({ strict: true })
  birthDate!: string;

  @ApiProperty({ example: 'Av. Arequipa 123, Lima' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address!: string;

  @ApiProperty({ example: '987654321' })
  @IsString()
  @Matches(/^\+?[\d\s()-]{7,30}$/, { message: 'Ingrese un teléfono válido.' })
  phone!: string;
}
