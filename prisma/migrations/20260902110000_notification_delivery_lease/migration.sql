-- NTF-007: a notification delivery must be claimed in PostgreSQL before a
-- worker calls a provider. The token also prevents an expired worker from
-- recording a result after another worker has recovered its lease.
ALTER TABLE "notification_jobs"
  ADD COLUMN "claim_token" UUID,
  ADD COLUMN "processing_started_at" TIMESTAMPTZ,
  ADD COLUMN "lease_expires_at" TIMESTAMPTZ;

-- Existing processing rows predate leases. Treat them as immediately
-- recoverable rather than leaving them permanently stranded after deploy.
UPDATE "notification_jobs"
SET "lease_expires_at" = now()
WHERE "status" = 'processing' AND "lease_expires_at" IS NULL;

CREATE INDEX "notification_jobs_status_lease_expires_at_idx"
  ON "notification_jobs"("status", "lease_expires_at");
