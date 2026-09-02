import { Equals, IsBoolean, IsDateString, IsEmail, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class CreatePublicRoomBookingDto {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) declare roomSlug: string;
  @IsDateString() declare checkIn: string;
  @IsDateString() declare checkOut: string;
  @IsString() @Length(2, 150) declare fullName: string;
  @IsString() @Matches(/^(?:\+84|84|0)(?:3|5|7|8|9)\d{8}$/) declare phone: string;
  @IsOptional() @IsEmail() @Length(3, 254) declare email?: string;
  @IsInt() @Min(1) @Max(20) declare adults: number;
  @IsInt() @Min(0) @Max(20) declare children: number;
  @IsInt() @Min(0) @Max(1) declare extraMattressQuantity: number;
  @IsBoolean() @Equals(true) declare bookingPolicyAccepted: boolean;
  @IsBoolean() @Equals(true) declare privacyPolicyAccepted: boolean;
  @IsOptional() @IsString() @Length(1, 1000) declare specialRequest?: string;
  @IsOptional() @IsString() @Length(1, 50) declare expectedArrivalTime?: string;
}
