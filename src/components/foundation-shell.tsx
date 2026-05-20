import Link from "next/link";
import {
  foundationPractice,
  getRole,
  roles,
  type RoleKey,
} from "@/lib/foundation-data";

const appNav = [
  { href: "/app", label: "Overview" },
  { href: "/app/locations", label: "Locations" },
  { href: "/app/team", label: "Team" },
  { href: "/app/rooms", label: "Rooms" },
  { href: "/app/modules", label: "Product Areas" },
  { href: "/app/workflows", label: "Work Rules" },
  { href: "/app/audit", label: "Audit" },
];

export function FoundationShell({
  children,
  active,
  roleKey = "owner_dentist",
}: {
  children: React.ReactNode;
  active: string;
  roleKey?: string;
}) {
  const role = getRole(roleKey);
  const roleParam = `role=${role.key}`;
  const modeLabel = foundationPractice.mode === "PRODUCTION_SETUP" ? "Production setup" : "Live";

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-neutral-950">
      <header className="border-b border-black/10 bg-white/86 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold tracking-tight text-neutral-950">
              1DentalAI
            </Link>
            <p className="mt-1 text-xs font-medium text-neutral-500">
              {foundationPractice.label}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              {modeLabel}
            </span>
            <Link
              href="/contact"
              className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950"
            >
              Request production setup
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 pb-4 sm:px-8">
          {appNav.map((item) => {
            const selected = active === item.href;
            return (
              <Link
                key={item.href}
                href={`${item.href}?${roleParam}`}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                  selected
                    ? "bg-neutral-950 text-white"
                    : "bg-white text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">{children}</main>
      <footer className="mx-auto max-w-7xl px-5 pb-8 text-xs text-neutral-500 sm:px-8">
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
    <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
        View as role
      </p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {roles.map((role) => (
          <Link
            key={role.key}
            href={`${basePath}?role=${role.key}`}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${
              activeRole === role.key
                ? "bg-cyan-700 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-950"
            }`}
          >
            {role.title}
          </Link>
        ))}
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
    <div className="mb-8 max-w-4xl">
      <p className="text-sm font-semibold text-cyan-700">{eyebrow}</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
        {title}
      </h1>
      <p className="mt-5 text-lg leading-8 text-neutral-600">{body}</p>
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
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
