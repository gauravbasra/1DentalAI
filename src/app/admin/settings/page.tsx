import Link from "next/link";
import { createOrganizationAction, createUserAction, setSignupStatusAction } from "@/lib/admin-actions";
import { getAdminSettingsData } from "@/lib/admin-repository";
import { requirePlatformAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await requirePlatformAdmin();
  const data = await getAdminSettingsData(session.tenantId);
  const dsoOptions = data.organizations.filter((org) => org.orgType === "DSO");

  return (
    <main className="min-h-screen bg-[#f3f4f6] text-neutral-950">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/" className="text-base font-semibold tracking-tight text-neutral-950">
              1DentalAI
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Super admin settings</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-600">
              Onboard DSOs, practices, practice admins, and role permissions before PHI-capable workflows are enabled.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">{session.displayName}</span>
            <Link href="/app/overview" className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-cyan-700 hover:text-cyan-700">
              Workspace
            </Link>
            <Link href="/logout" className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-rose-700 hover:text-rose-700">
              Logout
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1680px] gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Onboard organization</h2>
          <form action={createOrganizationAction} className="mt-5 grid gap-4">
            <AdminInput name="name" label="Organization name" required />
            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Type</span>
              <select name="orgType" className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm">
                <option value="PRACTICE">Practice</option>
                <option value="DSO">DSO</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Parent DSO</span>
              <select name="parentOrgId" className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm">
                <option value="">None</option>
                {dsoOptions.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">BAA status</span>
              <select name="baaStatus" className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm">
                <option value="NOT_STARTED">Not started</option>
                <option value="IN_REVIEW">In review</option>
                <option value="SIGNED">Signed</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
              <input name="phiEnabled" type="checkbox" className="h-4 w-4 rounded border-neutral-300" />
              Enable PHI workflows
            </label>
            <AdminInput name="notes" label="Notes" />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700">
              Save organization
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Create or update user</h2>
          <form action={createUserAction} className="mt-5 grid gap-4 md:grid-cols-2">
            <AdminInput name="displayName" label="Display name" required />
            <AdminInput name="email" label="Email" type="email" required />
            <AdminInput name="password" label="Temporary password" type="password" required />
            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Organization</span>
              <select name="organizationId" required className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm">
                {data.organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Role</span>
              <select name="roleKey" className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm">
                {data.roles.map((role) => (
                  <option key={role.roleKey} value={role.roleKey}>{role.title}</option>
                ))}
              </select>
            </label>
            <div className="md:col-span-2">
              <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700">
                Save user and RBAC assignment
              </button>
            </div>
          </form>
        </section>

        <AdminPanel title="Organizations">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                <tr><th className="py-2">Name</th><th>Type</th><th>Status</th><th>BAA</th><th>PHI</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.organizations.map((org) => (
                  <tr key={org.id}>
                    <td className="py-3 font-semibold">{org.name}</td>
                    <td>{org.orgType}</td>
                    <td>{org.status}</td>
                    <td>{org.baaStatus}</td>
                    <td>{org.phiEnabled ? "Enabled" : "Off"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel title="Users and assignments">
          <div className="grid gap-3">
            {data.users.map((user) => (
              <div key={user.id} className="rounded-lg bg-neutral-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{user.displayName}</p>
                    <p className="mt-1 text-xs text-neutral-500">{user.email}</p>
                  </div>
                  <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200">
                    {user.roleKey}
                  </span>
                </div>
                <p className="mt-3 text-sm text-neutral-600">{user.organizationName ?? "No organization"} · {user.status}</p>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="RBAC roles">
          <div className="grid gap-3">
            {data.roles.map((role) => (
              <div key={role.roleKey} className="rounded-lg bg-neutral-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">{role.title}</p>
                  <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200">{role.scopeType}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{role.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {role.permissions.map((permission) => (
                    <span key={permission} className="rounded-md bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-800">{permission}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="Signup requests">
          <div className="grid gap-3">
            {data.signupRequests.length ? data.signupRequests.map((request) => (
              <form key={request.id} action={setSignupStatusAction} className="rounded-lg bg-neutral-50 p-4">
                <input type="hidden" name="id" value={request.id} />
                <p className="font-semibold">{request.practiceName}</p>
                <p className="mt-1 text-sm text-neutral-600">{request.contactName} · {request.email} · {request.roleRequested}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <select name="status" defaultValue={request.status} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm">
                    <option value="PENDING_VERIFICATION">Pending verification</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="NEEDS_INFO">Needs info</option>
                  </select>
                  <input name="verificationNote" placeholder="Verification note" className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm" />
                  <button className="rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white">Update</button>
                </div>
              </form>
            )) : <p className="text-sm text-neutral-600">No signup requests yet.</p>}
          </div>
        </AdminPanel>
      </div>
    </main>
  );
}

function AdminPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AdminInput({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <input name={name} type={type} required={required} className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
    </label>
  );
}
