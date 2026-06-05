import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CLIENT_EXPORT_PURPOSES,
  type ClientExportPurpose,
} from '@docs/shared';

class ClientExportFiltersDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  animalType?: string;

  @IsOptional()
  @IsString()
  animalSex?: string;

  @IsOptional()
  @IsString()
  livestockCategory?: string;

  @IsOptional()
  @IsString()
  intentionId?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  ddd?: string;

  @IsOptional()
  @IsString()
  nearCity?: string;

  @IsOptional()
  @IsString()
  nearState?: string;

  @IsOptional()
  radiusKm?: number;

  @IsOptional()
  boundsSouth?: number;

  @IsOptional()
  boundsNorth?: number;

  @IsOptional()
  boundsWest?: number;

  @IsOptional()
  boundsEast?: number;

  @IsOptional()
  areaCenterLat?: number;

  @IsOptional()
  areaCenterLng?: number;

  @IsOptional()
  areaRadiusKm?: number;
}

export class ExportClientsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ClientExportFiltersDto)
  filters?: ClientExportFiltersDto;

  @IsEnum(CLIENT_EXPORT_PURPOSES)
  purpose!: ClientExportPurpose;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  destination?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
