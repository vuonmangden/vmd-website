-- CreateTable
CREATE TABLE "article_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "article_categories_slug_key" ON "article_categories"("slug");
CREATE INDEX "article_categories_status_sort_order_idx" ON "article_categories"("status", "sort_order");

ALTER TABLE "article_categories"
    ADD CONSTRAINT "article_categories_status_check"
    CHECK ("status" IN ('ACTIVE', 'INACTIVE'));

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID,
    "title" VARCHAR(250) NOT NULL,
    "slug" VARCHAR(250) NOT NULL,
    "excerpt" TEXT,
    "content" JSONB NOT NULL,
    "cover_media_id" UUID,
    "author_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "seo_title" VARCHAR(200),
    "seo_description" VARCHAR(300),
    "canonical_url" TEXT,
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");
CREATE INDEX "articles_status_published_at_idx" ON "articles"("status", "published_at");
CREATE INDEX "articles_category_id_status_idx" ON "articles"("category_id", "status");

ALTER TABLE "articles"
    ADD CONSTRAINT "articles_status_check"
    CHECK ("status" IN ('DRAFT', 'PUBLISHED'));

ALTER TABLE "articles"
    ADD CONSTRAINT "articles_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "article_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
