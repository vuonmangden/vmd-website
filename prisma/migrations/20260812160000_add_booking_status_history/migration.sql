CREATE TABLE "booking_status_history" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "booking_id" UUID NOT NULL, "from_status" VARCHAR(40), "to_status" VARCHAR(40) NOT NULL,
 "reason" TEXT, "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT;
CREATE INDEX "booking_status_history_booking_id_changed_at_idx" ON "booking_status_history"("booking_id", "changed_at");
