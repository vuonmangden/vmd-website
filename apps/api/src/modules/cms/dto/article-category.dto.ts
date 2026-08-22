import { IsIn, IsInt, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateArticleCategoryDto {
  @IsString()
  @Length(1, 150)
  declare name: string;

  @IsString()
  @Length(1, 150)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  declare slug: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateArticleCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 150)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}
