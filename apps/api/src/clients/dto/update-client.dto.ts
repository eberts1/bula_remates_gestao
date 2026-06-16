import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ClientPropertyDto } from './client-property.dto';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressFull?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsUUID()
  responsibleId?: string | null;

  @IsOptional()
  @IsUUID()
  ownerId?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientPropertyDto)
  properties?: ClientPropertyDto[];

  @IsOptional()
  @IsString()
  @MaxLength(20)
  animalType?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  animalSex?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  livestockCategory?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  intentionNotes?: string | null;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  intentionIds?: string[];
}
