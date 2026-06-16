import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ANIMAL_SEXES,
  ANIMAL_TYPES,
  AUCTION_STATUSES,
  LIVESTOCK_CATEGORIES,
} from '@docs/shared';

export class CreateAuctionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @IsOptional()
  @IsIn([...AUCTION_STATUSES])
  status?: string;

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
  @MaxLength(50)
  targetIntentionCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  offersNotes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  isBulaRemates?: boolean;
}
