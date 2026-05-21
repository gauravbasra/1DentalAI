import Link from "next/link";
import { StatusPill } from "@/components/foundation-shell";

export const pmsNav = [
  { href: "/app/pms", label: "Command" },
  { href: "/app/pms/schedule", label: "Schedule" },
  { href: "/app/pms/patients", label: "Patients" },
  { href: "/app/pms/forms", label: "Forms" },
  { href: "/app/pms/imaging", label: "Imaging" },
  { href: "/app/pms/treatment-plans", label: "Treatment" },
  { href: "/app/pms/ledger", label: "Ledger" },
  { href: "/app/pms/insurance", label: "Insurance" },
  { href: "/app/pms/labs", label: "Labs" },
  { href: "/app/pms/documents", label: "Documents" },
  { href: "/app/pms/reports", label: "Reports" },
  { href: "/app/pms/tasks", label: "Tasks" },
];

export function PmsSectionNav({ active, roleKey }: { active: string; roleKey: string }) {
  return (
    <div className="sticky top-[92px] z-30 mb-4 flex gap-1 overflow-x-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-sm">
      {pmsNav.map((item) => (
        <Link
          key={item.href}
          href={`${item.href}?role=${roleKey}`}
          className={`shrink-0 rounded-md px-3 py-2 text-xs font-semibold transition ${
            active === item.href
              ? "bg-neutral-950 text-white"
              : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
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
      <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <div>
          {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">{eyebrow}</p> : null}
          <h2 className="mt-0.5 text-base font-semibold tracking-tight text-neutral-950">{title}</h2>
        </div>
        {action}
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
        <Link href={href} className="mt-3 inline-flex rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white">
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
