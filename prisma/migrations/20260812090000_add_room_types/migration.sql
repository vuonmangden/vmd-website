CREATE TABLE "room_types" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "slug" VARCHAR(180) NOT NULL,
  "short_description" TEXT,
  "description" TEXT,
  "standard_adults" INTEGER NOT NULL,
  "max_adults" INTEGER NOT NULL,
  "max_children" INTEGER NOT NULL DEFAULT 0,
  "max_total_guests" INTEGER NOT NULL,
  "bed_configuration" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "amenities" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "room_types_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "room_types_code_key" UNIQUE ("code"),
  CONSTRAINT "room_types_slug_key" UNIQUE ("slug"),
  CONSTRAINT "room_types_capacity_check" CHECK (
    "standard_adults" >= 1 AND "max_adults" >= "standard_adults" AND
    "max_children" >= 0 AND "max_total_guests" >= "max_adults"
  ),
  CONSTRAINT "room_types_status_check" CHECK ("status" IN ('DRAFT', 'ACTIVE', 'INACTIVE'))
);

CREATE INDEX "room_types_status_sort_order_idx" ON "room_types"("status", "sort_order");
