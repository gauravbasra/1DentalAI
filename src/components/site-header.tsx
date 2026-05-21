import Image from "next/image";
import Link from "next/link";
import { navItems } from "@/lib/site-data";

export function SiteHeader() {
  return (
    <header className="sticky left-0 right-0 top-0 z-50 border-b border-black/10 bg-white/82 backdrop-blur-2xl">
      <nav className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center" aria-label="1DentalAI home">
          <Image
            src="/wordmark-light.svg"
            alt="1dentalAI.com"
            width={760}
            height={180}
            className="h-10 w-[170px] object-contain sm:w-[204px]"
            priority
          />
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
        <div className="flex items-center gap-2">
          <Link
            href="/app"
            className="inline-flex min-h-9 items-center rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-800 transition hover:border-neutral-950"
          >
            Sign in
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-9 items-center rounded-md bg-neutral-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-700"
          >
            Request access
          </Link>
        </div>
      </nav>
      <div className="app-scrollbar mx-auto flex max-w-7xl gap-5 overflow-x-auto px-5 pb-3 sm:px-8 lg:hidden">
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
