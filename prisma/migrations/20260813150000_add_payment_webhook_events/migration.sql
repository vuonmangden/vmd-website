CREATE TABLE "payment_webhook_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" VARCHAR(30) NOT NULL,
  "provider_event_id" VARCHAR(150) NOT NULL,
  "signature_valid" BOOLEAN NOT NULL,
  "payload" JSONB NOT NULL,
  "headers" JSONB NOT NULL,
  "processing_status" VARCHAR(30) NOT NULL DEFAULT 'RECEIVED',
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ,
  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_webhook_events_provider_event_key" UNIQUE ("provider", "provider_event_id")
);

CREATE INDEX "payment_webhook_events_processing_status_received_at_idx"
  ON "payment_webhook_events"("processing_status", "received_at");
