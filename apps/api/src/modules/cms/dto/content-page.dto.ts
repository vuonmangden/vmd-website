import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateContentPageDto {
  @IsString()
  @Length(1, 150)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  declare slug: string;

  @IsString()
  @Length(1, 200)
  declare title: string;

  @IsString()
  @Length(1, 200000)
  declare body: string;
}

export class UpdateContentPageDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200000)
  body?: string;
}
