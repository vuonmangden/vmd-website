CREATE TABLE "bookings" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "booking_code" VARCHAR(30) NOT NULL, "customer_id" UUID NOT NULL,
 "check_in_date" DATE NOT NULL, "check_out_date" DATE NOT NULL, "adults" INTEGER NOT NULL, "children" INTEGER NOT NULL DEFAULT 0,
 "status" VARCHAR(40) NOT NULL, "source" VARCHAR(50) NOT NULL, "total_amount" BIGINT NOT NULL, "currency" CHAR(3) NOT NULL DEFAULT 'VND',
 "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "bookings_pkey" PRIMARY KEY ("id"), CONSTRAINT "bookings_booking_code_key" UNIQUE ("booking_code"),
 CONSTRAINT "bookings_guest_check" CHECK ("adults" >= 1 AND "children" >= 0), CONSTRAINT "bookings_range_check" CHECK ("check_out_date" > "check_in_date"), CONSTRAINT "bookings_amount_check" CHECK ("total_amount" >= 0)
);
CREATE INDEX "bookings_status_check_in_date_idx" ON "bookings"("status", "check_in_date");
CREATE TABLE "booking_rooms" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "booking_id" UUID NOT NULL, "room_id" UUID NOT NULL, "room_type_id" UUID NOT NULL,
 "nightly_rate_snapshot" JSONB NOT NULL, "amount" BIGINT NOT NULL, "adults" INTEGER NOT NULL, "children" INTEGER NOT NULL DEFAULT 0, "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "booking_rooms_pkey" PRIMARY KEY ("id"), CONSTRAINT "booking_rooms_amount_check" CHECK ("amount" >= 0 AND "adults" >= 1 AND "children" >= 0)
);
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT;
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT;
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT;
ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE RESTRICT;
ALTER TABLE "room_occupancies" ADD CONSTRAINT "room_occupancies_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT;
CREATE INDEX "booking_rooms_booking_id_idx" ON "booking_rooms"("booking_id");
