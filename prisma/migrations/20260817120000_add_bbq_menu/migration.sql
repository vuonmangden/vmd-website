-- CreateTable
CREATE TABLE "bbq_menu_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "menu_group" VARCHAR(50) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "price" BIGINT NOT NULL,
    "public_description" TEXT,
    -- Margin strategy, sourcing and prep notes from the owner's menu. Never
    -- returned by the public endpoint.
    "internal_note" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bbq_menu_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bbq_menu_items_code_key" ON "bbq_menu_items"("code");
CREATE INDEX "bbq_menu_items_group_order_idx" ON "bbq_menu_items"("menu_group", "display_order");

-- Money is an integer VND amount and may never be negative. A free item such
-- as a dipping sauce is priced zero rather than left null.
ALTER TABLE "bbq_menu_items"
    ADD CONSTRAINT "bbq_menu_items_price_check" CHECK ("price" >= 0);

ALTER TABLE "bbq_menu_items"
    ADD CONSTRAINT "bbq_menu_items_group_check"
    CHECK ("menu_group" IN ('GOI_SALAD_KHAI_VI', 'RAU_MON_AN_NHE', 'MON_NUONG', 'MON_LAU', 'SOT_CHAM'));

-- CreateTable
CREATE TABLE "bbq_combos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "price" BIGINT NOT NULL,
    "min_guests" INTEGER,
    "max_guests" INTEGER,
    -- The owner's menu describes set contents in prose rather than as a strict
    -- item list, so this stays free text instead of a join table.
    "composition" TEXT,
    "internal_note" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bbq_combos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bbq_combos_code_key" ON "bbq_combos"("code");
CREATE INDEX "bbq_combos_order_idx" ON "bbq_combos"("display_order");

ALTER TABLE "bbq_combos"
    ADD CONSTRAINT "bbq_combos_price_check" CHECK ("price" >= 0);

ALTER TABLE "bbq_combos"
    ADD CONSTRAINT "bbq_combos_guest_range_check"
    CHECK ("min_guests" IS NULL OR "max_guests" IS NULL OR "min_guests" <= "max_guests");
