import { IsObject, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @Length(1, 250)
  declare title: string;

  @IsString()
  @Length(1, 250)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  declare slug: string;

  @IsObject()
  declare content: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  excerpt?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  coverMediaId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  canonicalUrl?: string;
}

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @Length(1, 250)
  title?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  excerpt?: string;

  /**
   * Accepts `null` (in addition to being omitted) so a client can explicitly
   * clear a previously-set category — `@IsOptional` treats both `undefined`
   * and `null` as satisfying the decorator, so `@IsUUID()` still runs for
   * any non-null value.
   */
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsUUID()
  coverMediaId?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  canonicalUrl?: string;
}
