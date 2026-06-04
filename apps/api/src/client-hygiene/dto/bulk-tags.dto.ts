import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class BulkTagsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  clientIds!: string[];

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
  @IsArray()
  @IsUUID('4', { each: true })
  intentionIds?: string[];
}
