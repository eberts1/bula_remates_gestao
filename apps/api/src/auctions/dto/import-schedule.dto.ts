import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ANIMAL_SEXES,
  ANIMAL_TYPES,
  LIVESTOCK_CATEGORIES,
} from '@docs/shared';

export class ImportScheduleRowDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsIn([...ANIMAL_TYPES])
  animalType?: string;

  @IsOptional()
  @IsIn([...ANIMAL_SEXES])
  animalSex?: string;

  @IsOptional()
  @IsArray()
  @IsIn([...LIVESTOCK_CATEGORIES], { each: true })
  livestockCategories?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  externalKey?: string;

  @IsOptional()
  @IsBoolean()
  isBulaRemates?: boolean;
}

export class ImportScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportScheduleRowDto)
  rows!: ImportScheduleRowDto[];
}
