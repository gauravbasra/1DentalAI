CREATE TABLE IF NOT EXISTS "PlatformOrganization" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "orgType" TEXT NOT NULL,
  "parentOrgId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ONBOARDING',
  "baaStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "phiEnabled" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformOrganization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformOrganization_tenantId_slug_key" ON "PlatformOrganization"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "PlatformOrganization_tenantId_orgType_status_idx" ON "PlatformOrganization"("tenantId", "orgType", "status");
CREATE INDEX IF NOT EXISTS "PlatformOrganization_parentOrgId_idx" ON "PlatformOrganization"("parentOrgId");

CREATE TABLE IF NOT EXISTS "PlatformMembership" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformMembership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformMembership_organizationId_userId_roleKey_key" ON "PlatformMembership"("organizationId", "userId", "roleKey");
CREATE INDEX IF NOT EXISTS "PlatformMembership_tenantId_roleKey_status_idx" ON "PlatformMembership"("tenantId", "roleKey", "status");
CREATE INDEX IF NOT EXISTS "PlatformMembership_userId_status_idx" ON "PlatformMembership"("userId", "status");

CREATE TABLE IF NOT EXISTS "RbacRole" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "roleKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "systemRole" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RbacRole_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RbacRole_tenantId_roleKey_key" ON "RbacRole"("tenantId", "roleKey");
CREATE INDEX IF NOT EXISTS "RbacRole_tenantId_scopeType_idx" ON "RbacRole"("tenantId", "scopeType");

CREATE TABLE IF NOT EXISTS "RbacPermission" (
  "id" TEXT NOT NULL,
  "permissionKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "phiRisk" TEXT NOT NULL DEFAULT 'NONE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RbacPermission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RbacPermission_permissionKey_key" ON "RbacPermission"("permissionKey");

CREATE TABLE IF NOT EXISTS "RbacRolePermission" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "roleKey" TEXT NOT NULL,
  "permissionKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RbacRolePermission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RbacRolePermission_tenantId_roleKey_permissionKey_key" ON "RbacRolePermission"("tenantId", "roleKey", "permissionKey");
CREATE INDEX IF NOT EXISTS "RbacRolePermission_tenantId_roleKey_idx" ON "RbacRolePermission"("tenantId", "roleKey");
CREATE INDEX IF NOT EXISTS "RbacRolePermission_permissionKey_idx" ON "RbacRolePermission"("permissionKey");

INSERT INTO "PlatformOrganization"
  ("id", "tenantId", "name", "slug", "orgType", "status", "baaStatus", "phiEnabled", "notes")
VALUES
  ('org_1dentalai_platform', 'tenant_1dentalai_production', '1DentalAI Platform', '1dentalai-platform', 'PLATFORM', 'ACTIVE', 'INTERNAL', false, 'Internal platform administration organization.'),
  ('org_demo_dso', 'tenant_1dentalai_production', 'Demo Dental Group DSO', 'demo-dental-group-dso', 'DSO', 'ONBOARDING', 'NOT_STARTED', false, 'Demo DSO for onboarding and RBAC setup.'),
  ('org_demo_practice', 'tenant_1dentalai_production', 'Summit Dental Demo Practice', 'summit-dental-demo-practice', 'PRACTICE', 'ONBOARDING', 'NOT_STARTED', false, 'Demo practice workspace with sample data only.')
ON CONFLICT ("tenantId", "slug") DO NOTHING;

UPDATE "PlatformOrganization"
SET "parentOrgId" = 'org_demo_dso'
WHERE "id" = 'org_demo_practice' AND "parentOrgId" IS NULL;

INSERT INTO "RbacRole" ("id", "tenantId", "roleKey", "title", "scopeType", "description", "systemRole")
VALUES
  ('role_super_admin', 'tenant_1dentalai_production', 'super_admin', 'Super admin', 'PLATFORM', 'Can onboard DSOs, practices, users, roles, and compliance setup. Not for routine patient operations.', true),
  ('role_dso_admin', 'tenant_1dentalai_production', 'dso_admin', 'DSO admin', 'DSO', 'Can manage DSO-level practices, users, reporting, and policy setup.', true),
  ('role_practice_admin', 'tenant_1dentalai_production', 'practice_admin', 'Practice admin', 'PRACTICE', 'Can manage practice users, practice settings, and role assignments inside one practice.', true),
  ('role_owner_dentist', 'tenant_1dentalai_production', 'owner_dentist', 'Owner dentist', 'PRACTICE', 'Clinical and business owner operating view.', true),
  ('role_front_desk', 'tenant_1dentalai_production', 'front_desk', 'Front desk', 'PRACTICE', 'Patient-facing scheduling and communications work.', true),
  ('role_billing_rcm', 'tenant_1dentalai_production', 'billing_rcm', 'Billing and RCM', 'PRACTICE', 'Insurance, claims, ledger, and revenue-cycle workflows.', true),
  ('role_marketing_growth', 'tenant_1dentalai_production', 'marketing_growth', 'Marketing and reputation', 'PRACTICE', 'Reviews, listings, campaigns, and patient growth workflows.', true)
ON CONFLICT ("tenantId", "roleKey") DO UPDATE SET
  "title" = excluded."title",
  "scopeType" = excluded."scopeType",
  "description" = excluded."description",
  "systemRole" = excluded."systemRole",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RbacPermission" ("id", "permissionKey", "title", "category", "description", "phiRisk")
VALUES
  ('perm_platform_admin', 'platform.admin', 'Platform administration', 'Platform', 'Manage platform-level configuration and internal operator access.', 'LOW'),
  ('perm_org_onboard', 'org.onboard', 'Onboard organizations', 'Organizations', 'Create DSOs and practices with compliance gates.', 'LOW'),
  ('perm_user_manage', 'user.manage', 'Manage users', 'Access', 'Create users, change status, and assign roles.', 'MEDIUM'),
  ('perm_rbac_manage', 'rbac.manage', 'Manage RBAC', 'Access', 'Create and assign roles and permissions.', 'MEDIUM'),
  ('perm_compliance_manage', 'compliance.manage', 'Manage compliance setup', 'Compliance', 'Track BAA, PHI enablement, audit readiness, and connector gates.', 'MEDIUM'),
  ('perm_practice_admin', 'practice.admin', 'Practice administration', 'Practice', 'Manage one practice settings and staff access.', 'MEDIUM'),
  ('perm_phi_read', 'phi.read', 'Read PHI', 'PHI', 'View patient-identifiable workflow data after BAA and role approval.', 'HIGH'),
  ('perm_phi_write', 'phi.write', 'Write PHI', 'PHI', 'Create or change patient-identifiable workflow data.', 'HIGH')
ON CONFLICT ("permissionKey") DO UPDATE SET
  "title" = excluded."title",
  "category" = excluded."category",
  "description" = excluded."description",
  "phiRisk" = excluded."phiRisk";

INSERT INTO "RbacRolePermission" ("id", "tenantId", "roleKey", "permissionKey")
VALUES
  ('rperm_super_platform', 'tenant_1dentalai_production', 'super_admin', 'platform.admin'),
  ('rperm_super_org', 'tenant_1dentalai_production', 'super_admin', 'org.onboard'),
  ('rperm_super_user', 'tenant_1dentalai_production', 'super_admin', 'user.manage'),
  ('rperm_super_rbac', 'tenant_1dentalai_production', 'super_admin', 'rbac.manage'),
  ('rperm_super_compliance', 'tenant_1dentalai_production', 'super_admin', 'compliance.manage'),
  ('rperm_dso_org', 'tenant_1dentalai_production', 'dso_admin', 'org.onboard'),
  ('rperm_dso_user', 'tenant_1dentalai_production', 'dso_admin', 'user.manage'),
  ('rperm_dso_compliance', 'tenant_1dentalai_production', 'dso_admin', 'compliance.manage'),
  ('rperm_practice_admin', 'tenant_1dentalai_production', 'practice_admin', 'practice.admin'),
  ('rperm_practice_user', 'tenant_1dentalai_production', 'practice_admin', 'user.manage'),
  ('rperm_owner_phi_read', 'tenant_1dentalai_production', 'owner_dentist', 'phi.read'),
  ('rperm_owner_phi_write', 'tenant_1dentalai_production', 'owner_dentist', 'phi.write')
ON CONFLICT ("tenantId", "roleKey", "permissionKey") DO NOTHING;

INSERT INTO "AuthUser"
  ("id", "tenantId", "email", "emailHash", "displayName", "roleKey", "status", "passwordHash", "passwordSalt", "passwordIterations", "mfaRequired", "mustChangePassword")
VALUES
  ('auth_user_super_admin', 'tenant_1dentalai_production', 'gaurav@basraconsultingservices.com', encode(digest(lower('gaurav@basraconsultingservices.com'), 'sha256'), 'hex'), 'Gaurav Basra', 'super_admin', 'ACTIVE', 'PpHiK0-biwRmNPmbcjBYx1dzvB28N5MDHnARvtxyO0g', '0X9fMUeqACu5K-80ZhFsgw', 310000, true, true),
  ('auth_user_demo_practice_admin', 'tenant_1dentalai_production', 'demo@1dentalai.com', encode(digest(lower('demo@1dentalai.com'), 'sha256'), 'hex'), 'Demo Practice Admin', 'practice_admin', 'ACTIVE', 'WBWxQgkpNiYBTEApfV06bWUFcMmv_JTuQ2Xt3IrwcB4', 'Q3vPZ_-DgEFlnZGP4IcjaQ', 310000, true, true),
  ('auth_user_practice_admin', 'tenant_1dentalai_production', 'practiceadmin@1dentalai.com', encode(digest(lower('practiceadmin@1dentalai.com'), 'sha256'), 'hex'), 'Practice Admin Demo', 'practice_admin', 'ACTIVE', 'b9tzyhGaJb6kXdwQJpyPTmfpA-K5KrLqoJThotaX1fM', 'snbu9bMmkSJZ612UAK12DA', 310000, true, true)
ON CONFLICT ("tenantId", "emailHash") DO NOTHING;

UPDATE "AuthUser" SET
  "displayName" = 'Gaurav Basra',
  "roleKey" = 'super_admin',
  "status" = 'ACTIVE',
  "passwordHash" = 'PpHiK0-biwRmNPmbcjBYx1dzvB28N5MDHnARvtxyO0g',
  "passwordSalt" = '0X9fMUeqACu5K-80ZhFsgw',
  "passwordIterations" = 310000,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "tenantId" = 'tenant_1dentalai_production'
  AND "emailHash" = encode(digest(lower('gaurav@basraconsultingservices.com'), 'sha256'), 'hex');

UPDATE "AuthUser" SET
  "displayName" = 'Demo Practice Admin',
  "roleKey" = 'practice_admin',
  "status" = 'ACTIVE',
  "passwordHash" = 'WBWxQgkpNiYBTEApfV06bWUFcMmv_JTuQ2Xt3IrwcB4',
  "passwordSalt" = 'Q3vPZ_-DgEFlnZGP4IcjaQ',
  "passwordIterations" = 310000,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "tenantId" = 'tenant_1dentalai_production'
  AND "emailHash" = encode(digest(lower('demo@1dentalai.com'), 'sha256'), 'hex');

UPDATE "AuthUser" SET
  "displayName" = 'Practice Admin Demo',
  "roleKey" = 'practice_admin',
  "status" = 'ACTIVE',
  "passwordHash" = 'b9tzyhGaJb6kXdwQJpyPTmfpA-K5KrLqoJThotaX1fM',
  "passwordSalt" = 'snbu9bMmkSJZ612UAK12DA',
  "passwordIterations" = 310000,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "tenantId" = 'tenant_1dentalai_production'
  AND "emailHash" = encode(digest(lower('practiceadmin@1dentalai.com'), 'sha256'), 'hex');

INSERT INTO "PlatformMembership" ("id", "tenantId", "organizationId", "userId", "roleKey", "status")
VALUES
  ('member_super_platform', 'tenant_1dentalai_production', 'org_1dentalai_platform', 'auth_user_super_admin', 'super_admin', 'ACTIVE'),
  ('member_demo_practice_admin', 'tenant_1dentalai_production', 'org_demo_practice', 'auth_user_demo_practice_admin', 'practice_admin', 'ACTIVE'),
  ('member_practice_admin', 'tenant_1dentalai_production', 'org_demo_practice', 'auth_user_practice_admin', 'practice_admin', 'ACTIVE')
ON CONFLICT ("organizationId", "userId", "roleKey") DO UPDATE SET
  "status" = excluded."status",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "AuthAuditEvent" ("id", "tenantId", "userId", "eventType", "outcome", "summary", "metadata")
VALUES
  ('auth_audit_seed_super_admin', 'tenant_1dentalai_production', 'auth_user_super_admin', 'AUTH_SUPER_ADMIN_SEEDED', 'ALLOWED', 'Demo super admin seeded for platform onboarding and RBAC setup.', '{"phiStored":false,"requiresPasswordRotation":true}'::jsonb),
  ('auth_audit_seed_demo_practice_admin', 'tenant_1dentalai_production', 'auth_user_demo_practice_admin', 'AUTH_PRACTICE_ADMIN_SEEDED', 'ALLOWED', 'Demo practice admin seeded for workspace verification.', '{"phiStored":false,"requiresPasswordRotation":true}'::jsonb)
ON CONFLICT ("id") DO NOTHING;
