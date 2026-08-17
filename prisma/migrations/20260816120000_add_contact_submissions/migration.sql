-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(150) NOT NULL,
    "email" CITEXT,
    "phone" VARCHAR(20),
    "subject" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'NEW',
    "handled_by" UUID,
    "handled_at" TIMESTAMPTZ,
    "internal_note" TEXT,
    "ip_hash" VARCHAR(64),
    "correlation_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- At least one contact channel must be present so staff can reply.
ALTER TABLE "contact_submissions"
    ADD CONSTRAINT "contact_submissions_contact_channel_check"
    CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);

ALTER TABLE "contact_submissions"
    ADD CONSTRAINT "contact_submissions_status_check"
    CHECK ("status" IN ('NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'));

-- CreateIndex
CREATE INDEX "contact_submissions_status_created_at_idx"
    ON "contact_submissions"("status", "created_at" DESC);
