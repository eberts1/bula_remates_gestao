import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ClientFormTokenType } from '@prisma/client';

export class CreateFormTokenDto {
  @IsEnum(ClientFormTokenType)
  type!: ClientFormTokenType;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  expiresInHours?: number;
}
