import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { ATTENDANCE_ACTIVITY_TYPE_KEYS } from '@docs/shared';

export class CreateActivityDto {
  @IsIn([...ATTENDANCE_ACTIVITY_TYPE_KEYS])
  type!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;
}
