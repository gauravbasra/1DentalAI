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

const pmsSubNav = [
  { href: "/app/pms", label: "Command" },
  { href: "/app/pms/schedule", label: "Schedule" },
  { href: "/app/pms/online-scheduling", label: "Online Booking" },
  { href: "/app/pms/patients", label: "Patients" },
  { href: "/app/pms/forms", label: "Forms" },
  { href: "/app/pms/imaging", label: "Imaging" },
  { href: "/app/pms/scribe", label: "Scribe" },
  { href: "/app/pms/treatment-plans", label: "Treatment" },
  { href: "/app/pms/ledger", label: "Ledger" },
  { href: "/app/pms/insurance", label: "Insurance" },
  { href: "/app/pms/inventory", label: "Inventory" },
  { href: "/app/pms/labs", label: "Labs" },
  { href: "/app/pms/documents", label: "Documents" },
  { href: "/app/pms/patient-map", label: "Patient Map" },
  { href: "/app/pms/reports", label: "Reports" },
  { href: "/app/pms/tasks", label: "Tasks" },
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
  const inPms = active === "/app/pms" || active.startsWith("/app/pms/");
  const activePmsItem = inPms
    ? [...pmsSubNav].sort((a, b) => b.href.length - a.href.length).find((item) => active === item.href || (item.href !== "/app/pms" && active.startsWith(`${item.href}/`)))
    : null;

  return (
    <div className="min-h-screen bg-[#20312b] px-4 py-5 text-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-[calc(100vh-40px)] min-h-[760px] max-w-[1840px] overflow-hidden rounded-[28px] border border-white/15 bg-white shadow-2xl shadow-emerald-950/40">
        <aside className="group/rail hidden w-[76px] shrink-0 flex-col border-r border-neutral-200 bg-white py-5 transition-[width] duration-200 ease-out hover:w-[280px] lg:flex">
          <Link
            href={`/app/overview?${roleParam}`}
            className="mx-4 flex h-11 items-center gap-3 overflow-hidden rounded-2xl bg-emerald-100 px-3 text-sm font-black text-emerald-800"
            aria-label="Open 1DentalAI overview"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-emerald-200">1D</span>
            <span className="whitespace-nowrap opacity-0 transition group-hover/rail:opacity-100">1DentalAI</span>
          </Link>
          <nav className="app-scrollbar mt-8 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-4" aria-label="Application quick navigation">
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
                  className={`flex h-11 items-center gap-3 overflow-hidden rounded-2xl px-3 text-xs font-black transition ${
                    selected ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-emerald-50 hover:text-emerald-800"
                  }`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center">{short}</span>
                  <span className="whitespace-nowrap text-sm opacity-0 transition group-hover/rail:opacity-100">{item.label}</span>
                </Link>
              );
            })}
            {inPms ? (
              <div className="mt-3 border-t border-neutral-200 pt-3">
                <p className="mb-2 hidden px-3 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400 group-hover/rail:block">PMS</p>
                <div className="grid gap-2">
                  {pmsSubNav.map((item) => {
                    const selected = active === item.href || (item.href !== "/app/pms" && active.startsWith(`${item.href}/`));
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
                        className={`flex h-10 items-center gap-3 overflow-hidden rounded-xl px-3 text-xs font-black transition ${
                          selected ? "bg-cyan-950 text-white" : "bg-white text-neutral-500 hover:bg-cyan-50 hover:text-cyan-800"
                        }`}
                      >
                        <span className="grid h-6 w-7 shrink-0 place-items-center">{short}</span>
                        <span className="whitespace-nowrap text-sm opacity-0 transition group-hover/rail:opacity-100">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-950">{activePmsItem ? `PMS / ${activePmsItem.label}` : activeItem?.label ?? "1DentalAI"}</p>
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
  const active = roles.find((role) => role.key === activeRole);
  return (
    <details className="group relative z-40 mb-4 inline-block">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-950 hover:text-neutral-950 [&::-webkit-details-marker]:hidden">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">Role</span>
        <span>{active?.title ?? activeRole}</span>
        <span className="text-neutral-400 transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="absolute left-0 top-12 max-h-[420px] w-[320px] overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-2xl shadow-neutral-950/15">
        <div className="app-scrollbar grid max-h-[400px] gap-1 overflow-y-auto" aria-label="Role switcher">
        {roles.map((role) => (
          <Link
            key={role.key}
            href={`${basePath}?role=${role.key}`}
            className={`min-h-9 rounded-xl px-3 py-2 text-sm font-semibold leading-5 transition ${
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
    </details>
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
    <div className="mb-5 min-w-0 px-1 py-1">
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
