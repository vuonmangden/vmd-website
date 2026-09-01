-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bucket" VARCHAR(100) NOT NULL,
    "object_key" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "alt_text" TEXT,
    "visibility" VARCHAR(30) NOT NULL DEFAULT 'PUBLIC',
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "uploaded_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "media_assets_bucket_object_key_key" ON "media_assets"("bucket", "object_key");
CREATE INDEX "media_assets_status_deleted_at_idx" ON "media_assets"("status", "deleted_at");

ALTER TABLE "media_assets"
    ADD CONSTRAINT "media_assets_status_check"
    CHECK ("status" IN ('PENDING', 'CONFIRMED'));

ALTER TABLE "media_assets"
    ADD CONSTRAINT "media_assets_visibility_check"
    CHECK ("visibility" IN ('PUBLIC', 'PRIVATE'));
