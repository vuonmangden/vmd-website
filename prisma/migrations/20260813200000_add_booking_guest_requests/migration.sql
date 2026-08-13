CREATE TABLE "booking_guest_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "booking_id" UUID NOT NULL,
  "request_type" VARCHAR(30) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
  "requested_data" JSONB NOT NULL,
  "guest_note" TEXT,
  "reception_note" TEXT,
  "reviewed_by" UUID,
  "reviewed_at" TIMESTAMPTZ,
  "decided_by" UUID,
  "decided_at" TIMESTAMPTZ,
  "decision_note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "booking_guest_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "booking_guest_requests_type_check" CHECK ("request_type" IN ('CANCELLATION', 'DATE_CHANGE')),
  CONSTRAINT "booking_guest_requests_status_check" CHECK ("status" IN ('PENDING_REVIEW', 'REVIEWED', 'APPROVED', 'REJECTED'))
);
ALTER TABLE "booking_guest_requests" ADD CONSTRAINT "booking_guest_requests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT;
CREATE INDEX "booking_guest_requests_booking_id_status_created_at_idx" ON "booking_guest_requests"("booking_id", "status", "created_at");
