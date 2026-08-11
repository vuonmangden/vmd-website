CREATE TABLE "staff_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_user_id" UUID NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "email" CITEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'INVITED',
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "staff_profiles_status_check" CHECK ("status" IN ('ACTIVE', 'SUSPENDED', 'INVITED'))
);

CREATE UNIQUE INDEX "staff_profiles_auth_user_id_key" ON "staff_profiles"("auth_user_id");
