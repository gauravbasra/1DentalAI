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
  const initials = productName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="min-h-screen bg-[#20312b] px-4 py-5 text-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-[calc(100vh-40px)] min-h-[760px] max-w-[1840px] overflow-hidden rounded-[28px] border border-white/15 bg-white shadow-2xl shadow-emerald-950/40">
        <aside className="hidden w-[76px] shrink-0 flex-col items-center border-r border-neutral-200 bg-white py-5 lg:flex">
          <Link
            href="/wrapper"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-black text-emerald-800"
            aria-label="Open app switcher"
          >
            1D
          </Link>
          <nav className="mt-8 flex flex-1 flex-col items-center gap-3" aria-label={`${productName} quick navigation`}>
            {nav.map((item) => {
              const isActive = active === item.href;
              const short = item.label
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xs font-black transition ${
                    isActive ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-emerald-50 hover:text-emerald-800"
                  }`}
                >
                  {short}
                </Link>
              );
            })}
          </nav>
        </aside>

        <aside className="hidden w-[330px] shrink-0 border-r border-neutral-200 bg-[#fbfcfb] xl:block">
          <div className="border-b border-neutral-200 px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{productLabel}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">{productName}</h1>
            <p className="mt-3 text-sm leading-6 text-neutral-600">{productSummary}</p>
          </div>
          <nav className="space-y-1 px-4 py-5" aria-label={`${productName} navigation`}>
            {nav.map((item) => {
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 transition ${
                    isActive ? "bg-neutral-950 text-white" : "text-neutral-700 hover:bg-white hover:text-neutral-950 hover:shadow-sm"
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
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-black text-emerald-800 xl:hidden">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-950">{productName}</p>
                  <p className="truncate text-xs text-neutral-500">{session.email}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link href="/wrapper" className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
                  App switcher
                </Link>
                <Link href="/logout" className="rounded-xl bg-neutral-950 px-3 py-2 text-sm font-semibold text-white">
                  Sign out
                </Link>
              </div>
            </div>
            <nav className="app-scrollbar mt-3 flex gap-2 overflow-x-auto xl:hidden" aria-label={`${productName} navigation`}>
              {nav.map((item) => {
                const isActive = active === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                      isActive ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>
          <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#f5f7f6] px-4 py-5 sm:px-6 lg:px-7">
            <div className="mx-auto max-w-[1420px]">{children}</div>
          </div>
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
    <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
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
