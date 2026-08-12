CREATE TABLE "room_rate_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "room_type_id" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL, "date_from" DATE NOT NULL, "date_to" DATE NOT NULL,
  "days_of_week" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[], "nightly_price" BIGINT NOT NULL,
  "extra_adult_price" BIGINT NOT NULL DEFAULT 0, "extra_child_price" BIGINT NOT NULL DEFAULT 0,
  "min_nights" INTEGER NOT NULL DEFAULT 1, "max_nights" INTEGER, "priority" INTEGER NOT NULL DEFAULT 0,
  "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT', "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "room_rate_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "room_rate_rules_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "room_rate_rules_date_range_check" CHECK ("date_to" > "date_from"),
  CONSTRAINT "room_rate_rules_amount_check" CHECK ("nightly_price" >= 0 AND "extra_adult_price" >= 0 AND "extra_child_price" >= 0),
  CONSTRAINT "room_rate_rules_nights_check" CHECK ("min_nights" >= 1 AND ("max_nights" IS NULL OR "max_nights" >= "min_nights")),
  CONSTRAINT "room_rate_rules_status_check" CHECK ("status" IN ('DRAFT', 'ACTIVE', 'INACTIVE'))
);
CREATE INDEX "room_rate_rules_room_type_id_status_priority_idx" ON "room_rate_rules"("room_type_id", "status", "priority");
