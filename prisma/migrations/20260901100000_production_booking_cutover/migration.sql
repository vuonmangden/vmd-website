-- BKG-010: production booking policy snapshots and one-time date changes.
-- Forward-only and backward compatible: existing bookings/rates receive safe
-- standard defaults; no data is deleted or rewritten.
ALTER TABLE "room_rate_rules"
  ADD COLUMN "rate_type" VARCHAR(20) NOT NULL DEFAULT 'STANDARD';

ALTER TABLE "room_rate_rules"
  ADD CONSTRAINT "room_rate_rules_rate_type_check"
  CHECK ("rate_type" IN ('STANDARD', 'HOLIDAY'));

ALTER TABLE "bookings"
  ADD COLUMN "deposit_required_amount" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "deposit_policy" VARCHAR(30) NOT NULL DEFAULT 'STANDARD_50',
  ADD COLUMN "original_check_in_date" DATE,
  ADD COLUMN "original_check_out_date" DATE,
  ADD COLUMN "date_change_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_deposit_amount_check"
    CHECK ("deposit_required_amount" >= 0 AND "deposit_required_amount" <= "total_amount"),
  ADD CONSTRAINT "bookings_deposit_policy_check"
    CHECK ("deposit_policy" IN ('STANDARD_50', 'LAST_MINUTE_100', 'HOLIDAY_100')),
  ADD CONSTRAINT "bookings_date_change_count_check"
    CHECK ("date_change_count" BETWEEN 0 AND 1),
  ADD CONSTRAINT "bookings_original_stay_range_check"
    CHECK (
      ("original_check_in_date" IS NULL AND "original_check_out_date" IS NULL)
      OR
      (
        "original_check_in_date" IS NOT NULL
        AND "original_check_out_date" IS NOT NULL
        AND "original_check_out_date" > "original_check_in_date"
      )
    );

ALTER TABLE "booking_rooms"
  ADD COLUMN "extra_mattress_quantity" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "booking_rooms"
  ADD CONSTRAINT "booking_rooms_extra_mattress_quantity_check"
  CHECK ("extra_mattress_quantity" BETWEEN 0 AND 1);

ALTER TABLE "booking_guest_requests"
  ADD COLUMN "previous_total_amount" BIGINT,
  ADD COLUMN "recalculated_total_amount" BIGINT,
  ADD COLUMN "charged_total_amount" BIGINT,
  ADD COLUMN "additional_amount_due" BIGINT;

ALTER TABLE "booking_guest_requests"
  ADD CONSTRAINT "booking_guest_requests_date_change_amounts_check"
  CHECK (
    ("previous_total_amount" IS NULL OR "previous_total_amount" >= 0)
    AND ("recalculated_total_amount" IS NULL OR "recalculated_total_amount" >= 0)
    AND ("charged_total_amount" IS NULL OR "charged_total_amount" >= 0)
    AND ("additional_amount_due" IS NULL OR "additional_amount_due" >= 0)
  );
