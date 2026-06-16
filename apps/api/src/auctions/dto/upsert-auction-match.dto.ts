import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { AUCTION_MATCH_STATUSES } from '@docs/shared';

export class UpsertAuctionMatchDto {
  @IsUUID('4')
  clientId!: string;

  @IsIn([...AUCTION_MATCH_STATUSES])
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
