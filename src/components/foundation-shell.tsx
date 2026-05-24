import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import {
  getRole,
  roles,
  type RoleKey,
} from "@/lib/foundation-data";

const appNav = [
  { href: "/app/overview", label: "Overview", group: "Practice" },
  { href: "/app/huddle", label: "Morning huddle", group: "Practice" },
  { href: "/app/patient-finder", label: "Patient finder", group: "Practice" },
  { href: "/app/clinical-ai", label: "Clinical AI", group: "Clinical ops" },
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
  const activeItem = appNav.find((item) => active === item.href || (item.href !== "/app/overview" && active.startsWith(`${item.href}/`)));

  return (
    <div className="min-h-screen bg-[#20312b] px-4 py-5 text-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-[calc(100vh-40px)] min-h-[760px] max-w-[1840px] overflow-hidden rounded-[28px] border border-white/15 bg-white shadow-2xl shadow-emerald-950/40">
        <aside className="hidden w-[76px] shrink-0 flex-col items-center border-r border-neutral-200 bg-white py-5 lg:flex">
          <Link
            href={`/app/overview?${roleParam}`}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-black text-emerald-800"
            aria-label="Open 1DentalAI overview"
          >
            1D
          </Link>
          <nav className="mt-8 flex flex-1 flex-col items-center gap-3" aria-label="Application quick navigation">
            {appNav.map((item) => {
              const selected = active === item.href || (item.href !== "/app/overview" && active.startsWith(`${item.href}/`));
              const short = item.label
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <Link
                  key={item.href}
                  href={`${item.href}?${roleParam}`}
                  title={item.label}
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xs font-black transition ${
                    selected ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-emerald-50 hover:text-emerald-800"
                  }`}
                >
                  {short}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-950">{activeItem?.label ?? "1DentalAI"}</p>
                <p className="truncate text-xs text-neutral-500">{session.displayName}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/contact"
                  className="inline-flex min-h-9 items-center rounded-xl border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950"
                >
                  Support
                </Link>
                <form action="/logout" method="post" className="inline-flex">
                  <button
                    type="submit"
                    className="inline-flex min-h-9 items-center rounded-xl bg-neutral-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
                  >
                    Logout
                  </button>
                </form>
              </div>
            </div>
            <nav aria-label="Application navigation" className="app-scrollbar mt-3 flex snap-x gap-2 overflow-x-auto xl:hidden">
              {appNav.map((item) => {
                const selected = active === item.href || (item.href !== "/app/overview" && active.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={`${item.href}?${roleParam}`}
                    className={`shrink-0 snap-start rounded-full px-4 py-2 text-xs font-semibold leading-5 transition ${
                      selected ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>
          <main className="app-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#f5f7f6] px-4 py-5 sm:px-6 xl:px-8">
            <div className="mx-auto max-w-[1420px]">{children}</div>
          </main>
        </div>
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
    <div className="mb-3 flex min-w-0 items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
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
    <div className="mb-5 min-w-0 rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
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
