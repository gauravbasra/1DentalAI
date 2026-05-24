import Link from "next/link";
import { StatusPill } from "@/components/foundation-shell";

export const pmsNav = [
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

export function PmsSectionNav({ active, roleKey }: { active: string; roleKey: string }) {
  return (
    <nav
      aria-label="PMS section navigation"
      className="app-scrollbar sticky top-0 z-40 -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-neutral-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur sm:-mx-6 sm:px-6 xl:-mx-8 xl:px-8"
    >
      {pmsNav.map((item) => (
        <Link
          key={item.href}
          href={`${item.href}?role=${roleKey}`}
          className={`min-h-9 shrink-0 rounded-md px-3 py-2 text-xs font-semibold leading-5 transition ${
            active === item.href
              ? "bg-neutral-950 text-white"
              : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function PmsCard({
  title,
  eyebrow,
  children,
  action,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <div className="min-w-0">
          {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">{eyebrow}</p> : null}
          <h2 className="mt-0.5 text-base font-semibold tracking-tight text-neutral-950 text-balance">{title}</h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="min-w-0 p-4">{children}</div>
    </section>
  );
}

export function EmptyPmsState({ title, body, href, action }: { title: string; body: string; href?: string; action?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
      <p className="text-sm font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">{body}</p>
      {href && action ? (
        <Link href={href} className="mt-3 inline-flex min-h-10 items-center rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white">
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export function Money({ cents }: { cents: number }) {
  return <>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100)}</>;
}

export function StatusFor({ value }: { value: string }) {
  const tone =
    value.includes("READY") || value.includes("ACTIVE") || value.includes("COMPLETED") || value.includes("CURRENT")
      ? "green"
      : value.includes("DENIED") || value.includes("BROKEN") || value.includes("REJECTED")
        ? "red"
        : value.includes("HELD") || value.includes("OPEN") || value.includes("DRAFT") || value.includes("NEEDS")
          ? "amber"
          : "neutral";
  return <StatusPill tone={tone}>{value.replaceAll("_", " ").toLowerCase()}</StatusPill>;
}
