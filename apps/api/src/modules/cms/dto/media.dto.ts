import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export const ALLOWED_MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;

export class RequestMediaUploadDto {
  @IsString()
  @Length(1, 255)
  declare filename: string;

  @IsIn(ALLOWED_MEDIA_MIME_TYPES)
  declare contentType: (typeof ALLOWED_MEDIA_MIME_TYPES)[number];

  @IsInt()
  @Min(1)
  @Max(15 * 1024 * 1024)
  declare sizeBytes: number;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  altText?: string;
}

export class CompleteMediaUploadDto {
  @IsUUID()
  declare mediaId: string;
}
