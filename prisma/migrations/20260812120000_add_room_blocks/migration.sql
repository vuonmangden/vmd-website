CREATE TABLE "room_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "block_type" VARCHAR(30) NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMPTZ,

    CONSTRAINT "room_blocks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "room_blocks_date_range_check" CHECK ("end_date" > "start_date")
);

ALTER TABLE "room_blocks"
  ADD CONSTRAINT "room_blocks_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "room_blocks"
  ADD CONSTRAINT "room_blocks_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "room_blocks_room_id_start_date_end_date_idx"
  ON "room_blocks"("room_id", "start_date", "end_date");
