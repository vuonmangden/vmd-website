CREATE TABLE "roles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "is_system" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "permissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(100) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_permissions" (
  "role_id" UUID NOT NULL,
  "permission_id" UUID NOT NULL,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id")
);

CREATE TABLE "staff_role_assignments" (
  "staff_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  "assigned_by" UUID,
  "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staff_role_assignments_pkey" PRIMARY KEY ("staff_id", "role_id")
);

CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");
CREATE INDEX "staff_role_assignments_role_id_idx" ON "staff_role_assignments"("role_id");
CREATE INDEX "staff_role_assignments_assigned_by_idx" ON "staff_role_assignments"("assigned_by");

ALTER TABLE "role_permissions"
  ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "staff_role_assignments"
  ADD CONSTRAINT "staff_role_assignments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "staff_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "staff_role_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "staff_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
