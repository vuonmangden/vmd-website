-- CreateTable
CREATE TABLE "bbq_areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "min_capacity" INTEGER NOT NULL,
    "max_capacity" INTEGER NOT NULL,
    "cover_media_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "bbq_areas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bbq_areas_code_key" ON "bbq_areas"("code");
CREATE INDEX "bbq_areas_status_sort_idx" ON "bbq_areas"("status", "sort_order");

ALTER TABLE "bbq_areas"
    ADD CONSTRAINT "bbq_areas_capacity_check"
    CHECK ("min_capacity" >= 1 AND "max_capacity" >= "min_capacity");

-- CreateTable
CREATE TABLE "bbq_tables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "area_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "min_capacity" INTEGER NOT NULL,
    "max_capacity" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "turnaround_minutes" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "bbq_tables_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bbq_tables_code_key" ON "bbq_tables"("code");
CREATE INDEX "bbq_tables_area_status_idx" ON "bbq_tables"("area_id", "status");

ALTER TABLE "bbq_tables"
    ADD CONSTRAINT "bbq_tables_capacity_check"
    CHECK ("min_capacity" >= 1 AND "max_capacity" >= "min_capacity");

ALTER TABLE "bbq_tables"
    ADD CONSTRAINT "bbq_tables_turnaround_check"
    CHECK ("turnaround_minutes" >= 0);

ALTER TABLE "bbq_tables"
    ADD CONSTRAINT "bbq_tables_area_id_fkey"
    FOREIGN KEY ("area_id") REFERENCES "bbq_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "bbq_service_slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "area_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "booking_interval_minutes" INTEGER,
    "max_total_guests" INTEGER,
    "days_of_week" INTEGER[] NOT NULL DEFAULT '{}',
    "date_from" DATE,
    "date_to" DATE,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bbq_service_slots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bbq_service_slots_status_idx" ON "bbq_service_slots"("status");

ALTER TABLE "bbq_service_slots"
    ADD CONSTRAINT "bbq_service_slots_time_check"
    CHECK ("start_time" < "end_time");

ALTER TABLE "bbq_service_slots"
    ADD CONSTRAINT "bbq_service_slots_date_range_check"
    CHECK ("date_from" IS NULL OR "date_to" IS NULL OR "date_from" <= "date_to");

ALTER TABLE "bbq_service_slots"
    ADD CONSTRAINT "bbq_service_slots_area_id_fkey"
    FOREIGN KEY ("area_id") REFERENCES "bbq_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
