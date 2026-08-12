CREATE TABLE "room_occupancies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "room_id" UUID NOT NULL, "booking_id" UUID NOT NULL,
  "stay_date" DATE NOT NULL, "status" VARCHAR(30) NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "room_occupancies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "room_occupancies_status_check" CHECK ("status" IN ('HOLD', 'CONFIRMED')),
  CONSTRAINT "room_occupancies_room_id_stay_date_key" UNIQUE ("room_id", "stay_date")
);
ALTER TABLE "room_occupancies" ADD CONSTRAINT "room_occupancies_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "room_occupancies_booking_id_idx" ON "room_occupancies"("booking_id");
