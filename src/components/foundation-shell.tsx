import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import {
  foundationPractice,
  getRole,
  roles,
  type RoleKey,
} from "@/lib/foundation-data";

const appNav = [
  { href: "/app/overview", label: "Overview" },
  { href: "/app/huddle", label: "Huddle" },
  { href: "/app/patient-finder", label: "Finder" },
  { href: "/app/pms", label: "PMS" },
  { href: "/app/rcm", label: "RCM" },
  { href: "/app/phone", label: "Phone" },
  { href: "/app/engagement", label: "Outreach" },
  { href: "/app/reputation", label: "Reputation" },
  { href: "/app/marketing", label: "Marketing" },
  { href: "/app/connectors", label: "Connectors" },
  { href: "/app/locations", label: "Locations" },
  { href: "/app/team", label: "Team" },
  { href: "/app/rooms", label: "Rooms" },
  { href: "/app/modules", label: "Modules" },
  { href: "/app/workflows", label: "Rules" },
  { href: "/app/audit", label: "Audit" },
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

  return (
    <div className="app-shell min-h-screen bg-[#f3f4f6] text-neutral-950">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-2 px-4 py-3 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/app/overview" className="shrink-0 text-base font-semibold tracking-tight text-neutral-950">
              1DentalAI
            </Link>
            <p className="hidden min-w-0 truncate text-xs font-medium text-neutral-500 sm:block">
              {foundationPractice.label}
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="hidden max-w-52 truncate rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700 sm:inline-flex">
              {session.displayName}
            </span>
            <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              {modeLabel}
            </span>
            <Link
              href="/contact"
              className="inline-flex min-h-8 items-center rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-semibold text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950"
            >
              Support
            </Link>
            <form action="/logout" method="post" className="inline-flex">
              <button
                type="submit"
                className="inline-flex min-h-8 items-center rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-semibold text-neutral-700 transition hover:border-rose-700 hover:text-rose-700"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Application navigation" className="app-scrollbar mx-auto flex max-w-[1680px] snap-x gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {appNav.map((item) => {
            const selected = active === item.href || (item.href !== "/app/overview" && active.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={`${item.href}?${roleParam}`}
                className={`min-h-8 shrink-0 snap-start rounded-md px-3 py-1.5 text-xs font-semibold leading-5 transition ${
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
      <main className="mx-auto min-w-0 max-w-[1680px] px-4 py-4 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-[1680px] px-4 pb-6 text-xs leading-5 text-neutral-500 sm:px-6">
        Production setup environment. No live PHI, no vendor calls, no production writeback until connectors and approvals are enabled.
      </footer>
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
    <div className="mb-4 min-w-0 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 text-balance">
        {title}
      </h1>
      <p className="mt-1 max-w-5xl text-sm leading-6 text-neutral-600">{body}</p>
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
