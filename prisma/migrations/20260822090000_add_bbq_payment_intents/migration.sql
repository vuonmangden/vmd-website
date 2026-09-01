-- Payment intents now support BBQ reservation deposits, not just room
-- bookings. booking_id becomes optional and a new bbq_reservation_id is
-- added; a CHECK constraint keeps exactly one of the two set, so the
-- polymorphism is enforced at the database, not just in application code.
ALTER TABLE "payment_intents" ALTER COLUMN "booking_id" DROP NOT NULL;
ALTER TABLE "payment_intents" ADD COLUMN "bbq_reservation_id" UUID;

ALTER TABLE "payment_intents"
    ADD CONSTRAINT "payment_intents_bbq_reservation_id_fkey"
    FOREIGN KEY ("bbq_reservation_id") REFERENCES "bbq_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "payment_intents_bbq_reservation_id_status_idx" ON "payment_intents"("bbq_reservation_id", "status");

ALTER TABLE "payment_intents"
    ADD CONSTRAINT "payment_intents_reference_check"
    CHECK (
        ("booking_id" IS NOT NULL AND "bbq_reservation_id" IS NULL)
        OR ("booking_id" IS NULL AND "bbq_reservation_id" IS NOT NULL)
    );
