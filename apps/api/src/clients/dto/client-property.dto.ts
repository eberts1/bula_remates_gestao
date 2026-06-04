import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ClientPropertyDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  farmName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @IsString()
  @Length(2, 2)
  state!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  routeNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  ie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  nirf?: string;
}
