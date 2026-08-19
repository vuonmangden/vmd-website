-- AlterTable
ALTER TABLE "reconciliation_cases"
    ADD COLUMN "resolved_by" UUID,
    ADD COLUMN "resolution_outcome" VARCHAR(30),
    ADD COLUMN "resolution_note" TEXT;
