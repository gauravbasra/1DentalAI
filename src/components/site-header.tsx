import Link from "next/link";
import { navItems } from "@/lib/site-data";

export function SiteHeader() {
  return (
    <header className="sticky left-0 right-0 top-0 z-50 border-b border-black/10 bg-white/82 backdrop-blur-2xl">
      <nav className="mx-auto flex min-h-14 max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
        <Link href="/" className="text-sm font-semibold tracking-tight text-neutral-950">
          1DentalAI
        </Link>
        <div className="hidden items-center gap-7 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs font-medium text-neutral-700 transition hover:text-neutral-950"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <Link
          href="/contact"
          className="rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cyan-700"
        >
          Early access
        </Link>
      </nav>
      <div className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-5 pb-3 sm:px-8 lg:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 text-xs font-medium text-neutral-700 transition hover:text-neutral-950"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
