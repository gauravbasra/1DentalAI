import Link from "next/link";
import { navItems } from "@/lib/site-data";

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:px-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="text-lg font-semibold text-neutral-950">1DentalAI</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">
            A phase-gated dental AI operating system being built for practices
            that want phones, patient communication, insurance, RCM, clinical
            AI, reputation, and analytics in one governed workflow.
          </p>
          <p className="mt-6 text-xs text-neutral-500">
            Early access product. Production features are released only after
            approved phase plans, implementation, and verification.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-neutral-700 transition hover:text-cyan-700"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
