CREATE TABLE "rooms" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "room_type_id" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "floor" VARCHAR(50),
  "area_zone" VARCHAR(100),
  "status" VARCHAR(30) NOT NULL DEFAULT 'INACTIVE',
  "maintenance_notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "rooms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rooms_code_key" UNIQUE ("code"),
  CONSTRAINT "rooms_status_check" CHECK ("status" IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE')),
  CONSTRAINT "rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "rooms_room_type_id_status_idx" ON "rooms"("room_type_id", "status");
