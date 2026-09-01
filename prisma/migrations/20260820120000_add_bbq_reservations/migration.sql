-- CreateTable
CREATE TABLE "bbq_reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reservation_code" VARCHAR(30) NOT NULL,
    "customer_id" UUID NOT NULL,
    "reservation_date" DATE NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "items_amount" BIGINT NOT NULL DEFAULT 0,
    "deposit_amount" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "special_request" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bbq_reservations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bbq_reservations_reservation_code_key" ON "bbq_reservations"("reservation_code");
CREATE INDEX "bbq_reservations_status_reservation_date_idx" ON "bbq_reservations"("status", "reservation_date");

ALTER TABLE "bbq_reservations"
    ADD CONSTRAINT "bbq_reservations_guest_check"
    CHECK ("adults" >= 1 AND "children" >= 0);

ALTER TABLE "bbq_reservations"
    ADD CONSTRAINT "bbq_reservations_time_check"
    CHECK ("start_time" < "end_time");

ALTER TABLE "bbq_reservations"
    ADD CONSTRAINT "bbq_reservations_amount_check"
    CHECK ("items_amount" >= 0 AND "deposit_amount" >= 0);

ALTER TABLE "bbq_reservations"
    ADD CONSTRAINT "bbq_reservations_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "bbq_reservation_tables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reservation_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bbq_reservation_tables_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bbq_reservation_tables_reservation_id_idx" ON "bbq_reservation_tables"("reservation_id");
CREATE INDEX "bbq_reservation_tables_table_id_status_idx" ON "bbq_reservation_tables"("table_id", "status");

ALTER TABLE "bbq_reservation_tables"
    ADD CONSTRAINT "bbq_reservation_tables_range_check"
    CHECK ("end_at" > "start_at");

ALTER TABLE "bbq_reservation_tables"
    ADD CONSTRAINT "bbq_reservation_tables_status_check"
    CHECK ("status" IN ('ACTIVE', 'RELEASED'));

ALTER TABLE "bbq_reservation_tables"
    ADD CONSTRAINT "bbq_reservation_tables_reservation_id_fkey"
    FOREIGN KEY ("reservation_id") REFERENCES "bbq_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bbq_reservation_tables"
    ADD CONSTRAINT "bbq_reservation_tables_table_id_fkey"
    FOREIGN KEY ("table_id") REFERENCES "bbq_tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bbq_reservation_tables"
    ADD CONSTRAINT "bbq_reservation_tables_area_id_fkey"
    FOREIGN KEY ("area_id") REFERENCES "bbq_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Atomic no-double-booking guarantee for a single table across overlapping
-- time ranges (a plain unique constraint cannot express this since a table
-- may legally be booked twice in one day at non-overlapping times).
-- btree_gist (installed in 20260807000000_initial_foundation) supplies the
-- GiST equality operator class for the uuid column so it composes with the
-- range '&&' operator in one index. Columns are TIMESTAMPTZ, so the range
-- constructor must be tstzrange, not tsrange.
ALTER TABLE "bbq_reservation_tables"
    ADD CONSTRAINT "bbq_reservation_tables_no_overlap"
    EXCLUDE USING gist (
        "table_id" WITH =,
        tstzrange("start_at", "end_at") WITH &&
    ) WHERE ("status" = 'ACTIVE');

-- CreateTable
CREATE TABLE "bbq_reservation_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reservation_id" UUID NOT NULL,
    "item_type" VARCHAR(20) NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name_snapshot" VARCHAR(200) NOT NULL,
    "unit_snapshot" VARCHAR(20),
    "unit_price" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bbq_reservation_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bbq_reservation_items_reservation_id_idx" ON "bbq_reservation_items"("reservation_id");

ALTER TABLE "bbq_reservation_items"
    ADD CONSTRAINT "bbq_reservation_items_type_check"
    CHECK ("item_type" IN ('MENU_ITEM', 'COMBO'));

ALTER TABLE "bbq_reservation_items"
    ADD CONSTRAINT "bbq_reservation_items_amount_check"
    CHECK ("quantity" >= 1 AND "unit_price" >= 0 AND "line_total" >= 0);

ALTER TABLE "bbq_reservation_items"
    ADD CONSTRAINT "bbq_reservation_items_reservation_id_fkey"
    FOREIGN KEY ("reservation_id") REFERENCES "bbq_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "bbq_reservation_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reservation_id" UUID NOT NULL,
    "from_status" VARCHAR(30),
    "to_status" VARCHAR(30) NOT NULL,
    "reason" TEXT,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bbq_reservation_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bbq_reservation_status_history_reservation_id_changed_at_idx" ON "bbq_reservation_status_history"("reservation_id", "changed_at");

ALTER TABLE "bbq_reservation_status_history"
    ADD CONSTRAINT "bbq_reservation_status_history_reservation_id_fkey"
    FOREIGN KEY ("reservation_id") REFERENCES "bbq_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
