-- Records the refund decision computed by CancellationPolicyService when a
-- Manager approves a guest CANCELLATION request. Phase 1 never moves money
-- automatically (AGENTS.md §9) — this is the audit record of what staff
-- decided, not a payment instruction.
ALTER TABLE "booking_guest_requests"
    ADD COLUMN "refund_policy" VARCHAR(20),
    ADD COLUMN "refund_tier_code" VARCHAR(50),
    ADD COLUMN "refund_percent" INTEGER,
    ADD COLUMN "refund_amount" BIGINT,
    ADD COLUMN "forfeited_amount" BIGINT;

ALTER TABLE "booking_guest_requests"
    ADD CONSTRAINT "booking_guest_requests_refund_policy_check"
    CHECK ("refund_policy" IS NULL OR "refund_policy" IN ('STANDARD', 'HOLIDAY'));

ALTER TABLE "booking_guest_requests"
    ADD CONSTRAINT "booking_guest_requests_refund_amount_check"
    CHECK ("refund_amount" IS NULL OR ("refund_amount" >= 0 AND "forfeited_amount" >= 0));
