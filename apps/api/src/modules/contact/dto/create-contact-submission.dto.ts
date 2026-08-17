import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateContactSubmissionDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @Length(2, 150)
  fullName!: string;

  @ApiPropertyOptional({ description: 'Required unless phone is supplied.' })
  @IsOptional()
  @IsEmail()
  @Length(3, 254)
  email?: string;

  @ApiPropertyOptional({ description: 'Vietnamese number. Required unless email is supplied.' })
  @IsOptional()
  @IsString()
  @Matches(/^(?:\+84|0)\d{9,10}$/, { message: 'phone must be a valid Vietnamese number' })
  phone?: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @Length(3, 200)
  subject!: string;

  @ApiProperty({ maxLength: 5000 })
  @IsString()
  @Length(10, 5_000)
  message!: string;
}
