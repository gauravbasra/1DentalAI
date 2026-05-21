import "server-only";

import { query } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";

export type PlatformOrganizationRow = {
  id: string;
  name: string;
  slug: string;
  orgType: string;
  parentOrgId: string | null;
  status: string;
  baaStatus: string;
  phiEnabled: boolean;
  notes: string | null;
};

export type PlatformUserRow = {
  id: string;
  email: string;
  displayName: string;
  roleKey: string;
  status: string;
  organizationName: string | null;
  membershipRole: string | null;
};

export type RbacRoleRow = {
  roleKey: string;
  title: string;
  scopeType: string;
  description: string;
  permissions: string[];
};

export async function getAdminSettingsData(tenantId = defaultTenantId) {
  const [organizations, users, roles, permissions, signupRequests] = await Promise.all([
    query<PlatformOrganizationRow>(
      `select "id", "name", "slug", "orgType", "parentOrgId", "status", "baaStatus", "phiEnabled", "notes"
       from "PlatformOrganization"
       where "tenantId" = $1
       order by case "orgType" when 'PLATFORM' then 0 when 'DSO' then 1 else 2 end, "name"`,
      [tenantId],
    ),
    query<PlatformUserRow>(
      `select distinct on (u."id")
          u."id", u."email", u."displayName", u."roleKey", u."status",
          o."name" as "organizationName", m."roleKey" as "membershipRole"
       from "AuthUser" u
       left join "PlatformMembership" m on m."userId" = u."id" and m."status" = 'ACTIVE'
       left join "PlatformOrganization" o on o."id" = m."organizationId"
       where u."tenantId" = $1
       order by u."id", u."roleKey", u."displayName"`,
      [tenantId],
    ),
    query<RbacRoleRow>(
      `select r."roleKey", r."title", r."scopeType", r."description",
              coalesce(array_agg(rp."permissionKey" order by rp."permissionKey") filter (where rp."permissionKey" is not null), '{}') as "permissions"
       from "RbacRole" r
       left join "RbacRolePermission" rp on rp."tenantId" = r."tenantId" and rp."roleKey" = r."roleKey"
       where r."tenantId" = $1
       group by r."roleKey", r."title", r."scopeType", r."description"
       order by case r."scopeType" when 'PLATFORM' then 0 when 'DSO' then 1 else 2 end, r."title"`,
      [tenantId],
    ),
    query<{ permissionKey: string; title: string; category: string; phiRisk: string }>(
      `select "permissionKey", "title", "category", "phiRisk"
       from "RbacPermission"
       order by "category", "permissionKey"`,
    ),
    query<{ id: string; practiceName: string; contactName: string; email: string; roleRequested: string; status: string; createdAt: Date }>(
      `select "id", "practiceName", "contactName", "email", "roleRequested", "status", "createdAt"
       from "AuthSignupRequest"
       where "tenantId" = $1
       order by "createdAt" desc
       limit 20`,
      [tenantId],
    ),
  ]);

  return {
    organizations: organizations.rows,
    users: users.rows,
    roles: roles.rows,
    permissions: permissions.rows,
    signupRequests: signupRequests.rows,
  };
}
