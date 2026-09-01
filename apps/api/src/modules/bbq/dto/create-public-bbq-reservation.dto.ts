import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class PublicBbqReservationItemDto {
  @IsIn(['MENU_ITEM', 'COMBO'])
  declare type: 'MENU_ITEM' | 'COMBO';

  @IsString()
  @Length(2, 80)
  @Matches(/^[A-Z0-9_]+$/)
  declare code: string;

  @IsInt()
  @Min(1)
  @Max(999)
  declare quantity: number;
}

export class CreatePublicBbqReservationDto {
  @IsUUID()
  declare tableId: string;

  @IsDateString()
  declare date: string;

  @Matches(HH_MM)
  declare startTime: string;

  @Matches(HH_MM)
  declare endTime: string;

  @IsString()
  @Length(2, 150)
  declare fullName: string;

  @IsString()
  @Matches(/^(?:\+84|84|0)(?:3|5|7|8|9)\d{8}$/)
  declare phone: string;

  @IsOptional()
  @IsEmail()
  @Length(3, 254)
  declare email?: string;

  @IsInt()
  @Min(1)
  declare adults: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PublicBbqReservationItemDto)
  items?: PublicBbqReservationItemDto[];

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  specialRequest?: string;
}

