import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsUUID()
  declare bookingId: string;

  @IsString()
  @MaxLength(180)
  declare idempotencyKey: string;
}
