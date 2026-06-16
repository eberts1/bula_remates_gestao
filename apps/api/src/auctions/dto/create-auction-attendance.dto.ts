import { IsArray, IsUUID } from 'class-validator';

export class CreateAuctionAttendanceDto {
  @IsArray()
  @IsUUID('4', { each: true })
  clientIds!: string[];
}
