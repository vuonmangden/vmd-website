CREATE TABLE "resource_holds" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "resource_type" VARCHAR(30) NOT NULL, "resource_id" UUID NOT NULL,
  "reference_type" VARCHAR(30) NOT NULL, "reference_id" UUID NOT NULL, "start_at" TIMESTAMPTZ NOT NULL, "end_at" TIMESTAMPTZ NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL, "status" VARCHAR(30) NOT NULL, "idempotency_key" VARCHAR(150) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "confirmed_at" TIMESTAMPTZ, "released_at" TIMESTAMPTZ,
  CONSTRAINT "resource_holds_pkey" PRIMARY KEY ("id"), CONSTRAINT "resource_holds_idempotency_key_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "resource_holds_status_check" CHECK ("status" IN ('ACTIVE', 'CONFIRMED', 'RELEASED', 'EXPIRED')),
  CONSTRAINT "resource_holds_range_check" CHECK ("end_at" > "start_at" AND "expires_at" > "created_at")
);
CREATE INDEX "resource_holds_resource_type_resource_id_status_expires_at_idx" ON "resource_holds"("resource_type", "resource_id", "status", "expires_at");
