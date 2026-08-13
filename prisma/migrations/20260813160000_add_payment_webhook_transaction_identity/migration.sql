ALTER TABLE "payment_webhook_events"
  ADD COLUMN "provider_transaction_id" VARCHAR(150);

UPDATE "payment_webhook_events"
  SET "provider_transaction_id" = "provider_event_id"
  WHERE "provider_transaction_id" IS NULL;

ALTER TABLE "payment_webhook_events"
  ALTER COLUMN "provider_transaction_id" SET NOT NULL;

ALTER TABLE "payment_webhook_events"
  ADD CONSTRAINT "payment_webhook_events_provider_provider_transaction_id_key"
  UNIQUE ("provider", "provider_transaction_id");
