import { ProductAppShell, type ProductNavItem } from "@/components/products/product-app-shell";

export const patientEngagementNav: ProductNavItem[] = [
  { href: "/patient-engagement", label: "Today", description: "Front desk operating console" },
  { href: "/patient-engagement/phone", label: "Phone", description: "Calls, voicemail, numbers, devices" },
  { href: "/patient-engagement/webchat", label: "Web chat", description: "Inbox, widget, KB, handoff" },
  { href: "/patient-engagement/forms", label: "Forms", description: "Builder, intake, insurance" },
  { href: "/patient-engagement/onboarding", label: "Onboarding", description: "Practice setup checklist" },
  { href: "/patient-engagement/settings", label: "Settings", description: "Twilio, AI voice, chat, consent" },
];

export function PatientEngagementShell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <ProductAppShell
      active={active}
      productName="Patient Engagement"
      productLabel="Phone, SMS, AI voice, webchat"
      productSummary="A separate front desk product for calls, messages, missed-call recovery, webchat, appointment handoff, and consent-safe outreach."
      nav={patientEngagementNav}
    >
      {children}
    </ProductAppShell>
  );
}

export function money(cents: number | string | null | undefined) {
  const value = typeof cents === "string" ? Number(cents) : Number(cents ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value / 100);
}

export function clean(value: unknown) {
  return String(value ?? "not recorded").replaceAll("_", " ").toLowerCase();
}
