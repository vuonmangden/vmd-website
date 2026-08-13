import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class SePayWebhookDto {
  @IsString() @IsNotEmpty() @MaxLength(150) id!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) gateway!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) transactionDate!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) accountNumber!: string;
  @IsString() @MaxLength(100) subAccount!: string;
  @IsIn(['in', 'out']) transferType!: 'in' | 'out';
  @Type(() => Number) @IsInt() @Min(1) transferAmount!: number;
  @Type(() => Number) @IsInt() @Min(0) accumulated!: number;
  @IsString() @MaxLength(100) code!: string;
  @IsString() @IsNotEmpty() @MaxLength(255) content!: string;
  @IsString() @MaxLength(150) referenceCode!: string;
  @IsString() @MaxLength(2_000) description!: string;
}
