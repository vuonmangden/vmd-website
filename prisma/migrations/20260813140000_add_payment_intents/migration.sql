CREATE TABLE "payment_intents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "booking_id" UUID NOT NULL,
  "provider" VARCHAR(50) NOT NULL DEFAULT 'SEPAY_TEST',
  "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  "amount" BIGINT NOT NULL,
  "paid_amount" BIGINT NOT NULL DEFAULT 0,
  "currency" CHAR(3) NOT NULL DEFAULT 'VND',
  "transfer_content" VARCHAR(25) NOT NULL,
  "qr_payload" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_intents_amount_check" CHECK ("amount" >= 0 AND "paid_amount" >= 0),
  CONSTRAINT "payment_intents_status_check" CHECK ("status" IN ('PENDING', 'PAID', 'PARTIAL', 'EXPIRED', 'CANCELLED')),
  CONSTRAINT "payment_intents_transfer_content_key" UNIQUE ("transfer_content")
);

ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT;
CREATE INDEX "payment_intents_status_expires_at_idx" ON "payment_intents"("status", "expires_at");
CREATE INDEX "payment_intents_booking_id_status_idx" ON "payment_intents"("booking_id", "status");

CREATE TABLE "reconciliation_cases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_intent_id" UUID NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  "reason" VARCHAR(100) NOT NULL,
  "expected_amount" BIGINT NOT NULL,
  "received_amount" BIGINT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMPTZ,
  CONSTRAINT "reconciliation_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reconciliation_cases_amount_check" CHECK ("expected_amount" >= 0 AND "received_amount" > 0)
);
ALTER TABLE "reconciliation_cases" ADD CONSTRAINT "reconciliation_cases_payment_intent_id_fkey"
  FOREIGN KEY ("payment_intent_id") REFERENCES "payment_intents"("id") ON DELETE RESTRICT;
CREATE INDEX "reconciliation_cases_status_created_at_idx" ON "reconciliation_cases"("status", "created_at");
