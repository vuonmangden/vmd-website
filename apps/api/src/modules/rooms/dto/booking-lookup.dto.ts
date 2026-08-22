import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

export class BookingLookupDto {
  @IsString() @Matches(/^[A-Za-z0-9-]{4,30}$/) declare bookingCode: string;
  @IsString() @Matches(/^(?:\+84|84|0)(?:3|5|7|8|9)\d{8}$/) declare phone: string;
}
export class CreateGuestRequestDto {
  @IsIn(['CANCELLATION', 'DATE_CHANGE']) declare requestType: 'CANCELLATION' | 'DATE_CHANGE';
  @IsOptional() @IsString() @Length(1, 1000) declare note?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) declare requestedCheckIn?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) declare requestedCheckOut?: string;
}
export class PublicGuestRequestDto extends BookingLookupDto {
  @IsIn(['CANCELLATION', 'DATE_CHANGE']) declare requestType: 'CANCELLATION' | 'DATE_CHANGE';
  @IsOptional() @IsString() @Length(1, 1000) declare note?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) declare requestedCheckIn?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) declare requestedCheckOut?: string;
}
export class ReviewGuestRequestDto { @IsOptional() @IsString() @Length(1, 1000) declare note?: string; }
export class DecideGuestRequestDto {
  @IsIn(['APPROVED', 'REJECTED']) declare decision: 'APPROVED' | 'REJECTED';
  @IsOptional() @IsString() @Length(1, 1000) declare note?: string;
  // Required only when approving a CANCELLATION: which of the two published
  // refund tables applies. A staff judgment call, not something derived
  // automatically from stored data — see CancellationPolicyService.
  @IsOptional() @IsIn(['STANDARD', 'HOLIDAY']) declare policy?: 'STANDARD' | 'HOLIDAY';
}
