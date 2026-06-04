import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClientPropertyDto } from './client-property.dto';

export class MergeResolvedDto {
  @IsString()
  @MaxLength(500)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  document?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @IsOptional()
  @IsString()
  addressFull?: string | null;

  @IsOptional()
  @IsString()
  animalType?: string | null;

  @IsOptional()
  @IsString()
  animalSex?: string | null;

  @IsOptional()
  @IsString()
  livestockCategory?: string | null;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  intentionIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientPropertyDto)
  properties?: ClientPropertyDto[];
}

export class MergeClientsDto {
  @IsUUID()
  masterId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  mergedIds!: string[];

  @ValidateNested()
  @Type(() => MergeResolvedDto)
  resolved!: MergeResolvedDto;
}
