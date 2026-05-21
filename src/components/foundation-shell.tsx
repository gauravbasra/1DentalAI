import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import {
  foundationPractice,
  getRole,
  roles,
  type RoleKey,
} from "@/lib/foundation-data";

const appNav = [
  { href: "/app/overview", label: "Overview", group: "Practice" },
  { href: "/app/huddle", label: "Morning huddle", group: "Practice" },
  { href: "/app/patient-finder", label: "Patient finder", group: "Practice" },
  { href: "/app/pms", label: "PMS", group: "Clinical ops" },
  { href: "/app/rcm", label: "RCM", group: "Clinical ops" },
  { href: "/app/phone", label: "Patient engagement", group: "Growth" },
  { href: "/app/engagement", label: "Outreach", group: "Growth" },
  { href: "/app/reputation", label: "Reputation", group: "Growth" },
  { href: "/app/marketing", label: "Marketing", group: "Growth" },
  { href: "/app/connectors", label: "Integrations", group: "Admin" },
  { href: "/app/locations", label: "Locations", group: "Admin" },
  { href: "/app/team", label: "Team", group: "Admin" },
  { href: "/app/rooms", label: "Rooms", group: "Admin" },
  { href: "/app/modules", label: "Modules", group: "Admin" },
  { href: "/app/workflows", label: "Rules", group: "Admin" },
  { href: "/app/audit", label: "Audit", group: "Admin" },
];

export async function FoundationShell({
  children,
  active,
  roleKey = "owner_dentist",
}: {
  children: React.ReactNode;
  active: string;
  roleKey?: string;
}) {
  const session = await requireAuth();
  const role = getRole(roleKey);
  const roleParam = `role=${role.key}`;
  const modeLabel = foundationPractice.mode === "PRODUCTION_SETUP" ? "Production setup" : "Live";
  const groups = Array.from(new Set(appNav.map((item) => item.group)));

  return (
    <div className="app-shell min-h-screen bg-[#f6f7f8] text-neutral-950 lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen overflow-y-auto border-r border-neutral-200 bg-white px-4 py-5 lg:block">
        <Link href={`/app/overview?${roleParam}`} className="block text-xl font-semibold tracking-tight text-neutral-950">
          1DentalAI
        </Link>
        <p className="mt-1 text-xs leading-5 text-neutral-500">{foundationPractice.label}</p>
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          {modeLabel}
        </div>
        <nav aria-label="Application navigation" className="mt-5 space-y-5">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{group}</p>
              <div className="mt-2 space-y-1">
                {appNav.filter((item) => item.group === group).map((item) => {
                  const selected = active === item.href || (item.href !== "/app/overview" && active.startsWith(`${item.href}/`));
                  return (
                    <Link
                      key={item.href}
                      href={`${item.href}?${roleParam}`}
                      className={`flex min-h-9 items-center rounded-md px-3 py-2 text-sm font-semibold leading-5 transition ${
                        selected
                          ? "bg-neutral-950 text-white"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 shadow-sm backdrop-blur-xl">
          <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0 lg:hidden">
              <Link href={`/app/overview?${roleParam}`} className="text-base font-semibold tracking-tight text-neutral-950">
                1DentalAI
              </Link>
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-sm font-semibold text-neutral-950">{role.title}</p>
              <p className="truncate text-xs text-neutral-500">{session.displayName}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 sm:inline-flex lg:hidden">
                {modeLabel}
              </span>
              <Link
                href="/contact"
                className="inline-flex min-h-9 items-center rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950"
              >
                Support
              </Link>
              <form action="/logout" method="post" className="inline-flex">
                <button
                  type="submit"
                  className="inline-flex min-h-9 items-center rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-rose-700 hover:text-rose-700"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
          <nav aria-label="Application navigation" className="app-scrollbar flex snap-x gap-1 overflow-x-auto px-4 pb-2 sm:px-6 lg:hidden">
            {appNav.map((item) => {
              const selected = active === item.href || (item.href !== "/app/overview" && active.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={`${item.href}?${roleParam}`}
                  className={`min-h-9 shrink-0 snap-start rounded-md px-3 py-2 text-xs font-semibold leading-5 transition ${
                    selected
                      ? "bg-neutral-950 text-white"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="min-w-0 px-4 py-5 sm:px-6 xl:px-8">
          <div className="mx-auto max-w-[1420px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function RoleSwitcher({
  activeRole,
  basePath,
}: {
  activeRole: RoleKey;
  basePath: string;
}) {
  return (
    <div className="mb-3 flex min-w-0 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
        Role
      </p>
      <div className="app-scrollbar min-w-0 flex-1 overflow-x-auto" aria-label="Role switcher">
        <div className="flex w-max gap-1">
        {roles.map((role) => (
          <Link
            key={role.key}
            href={`${basePath}?role=${role.key}`}
            className={`min-h-8 shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold leading-5 transition ${
              activeRole === role.key
                ? "bg-neutral-950 text-white"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
            }`}
          >
            {role.title}
          </Link>
        ))}
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mb-5 min-w-0 rounded-lg border border-neutral-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">{eyebrow}</p>
      <h1 className="mt-1 max-w-4xl text-3xl font-semibold tracking-tight text-neutral-950 text-balance">
        {title}
      </h1>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-600">{body}</p>
    </div>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "green" | "cyan" | "amber" | "red" | "neutral";
  children: React.ReactNode;
}) {
  const tones = {
    green: "bg-emerald-100 text-emerald-800",
    cyan: "bg-cyan-100 text-cyan-800",
    amber: "bg-amber-100 text-amber-900",
    red: "bg-rose-100 text-rose-800",
    neutral: "bg-neutral-100 text-neutral-700",
  };
  return (
    <span className={`inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-left text-[11px] font-semibold uppercase leading-4 tracking-[0.04em] ${tones[tone]}`}>
      {children}
    </span>
  );
}
