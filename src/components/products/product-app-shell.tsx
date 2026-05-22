import Link from "next/link";
import { currentSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export type ProductNavItem = {
  href: string;
  label: string;
  description?: string;
};

export async function ProductAppShell({
  active,
  productName,
  productLabel,
  productSummary,
  nav,
  children,
}: {
  active: string;
  productName: string;
  productLabel: string;
  productSummary: string;
  nav: ProductNavItem[];
  children: React.ReactNode;
}) {
  const session = await currentSession();
  if (!session) redirect(`/app?next=${encodeURIComponent(active)}`);

  return (
    <main className="min-h-screen bg-[#f6f7f8] text-neutral-950">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 p-5">
            <Link href="/wrapper" className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
              1DentalAI
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">{productLabel}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{productName}</h1>
            <p className="mt-3 text-sm leading-6 text-neutral-600">{productSummary}</p>
          </div>
          <nav className="space-y-1 p-3" aria-label={`${productName} navigation`}>
            {nav.map((item) => {
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-3 transition ${
                    isActive ? "bg-neutral-950 text-white" : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                  }`}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  {item.description ? (
                    <span className={`mt-1 block text-xs leading-5 ${isActive ? "text-neutral-300" : "text-neutral-500"}`}>{item.description}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="m-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Boundary rule</p>
            <p className="mt-2 text-xs leading-5 text-neutral-600">
              This product can hand work to other products, but its daily workflow stays here.
            </p>
          </div>
        </aside>
        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 px-5 py-3 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">{productLabel}</p>
                <p className="mt-1 text-sm font-semibold text-neutral-950">{session.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/wrapper" className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
                  App switcher
                </Link>
                <Link href="/logout" className="rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white">
                  Sign out
                </Link>
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-7xl p-5 lg:p-7">{children}</div>
        </section>
      </div>
    </main>
  );
}

export function ProductPageTitle({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl">{title}</h2>
      <p className="mt-3 text-base leading-7 text-neutral-600">{body}</p>
    </div>
  );
}

export function WorkSurface({
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
    <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div>
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{eyebrow}</p> : null}
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-neutral-950">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StateBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "green" | "amber" | "red" | "cyan" | "neutral" }) {
  const toneClass = {
    green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    red: "bg-red-50 text-red-800 ring-red-200",
    cyan: "bg-cyan-50 text-cyan-800 ring-cyan-200",
    neutral: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  }[tone];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneClass}`}>{children}</span>;
}
