"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

export function WebchatInstaller() {
  const pathname = usePathname();
  if (
    pathname?.startsWith("/app") ||
    pathname?.startsWith("/wrapper") ||
    pathname?.startsWith("/pms") ||
    pathname?.startsWith("/patient-engagement") ||
    pathname?.startsWith("/reputation-management") ||
    pathname?.startsWith("/digital-marketing") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/signup")
  ) return null;
  return <Script src="/api/webchat/widget.js?tenant=tenant_1dentalai_production&v=20260522-patient-chat-clean" strategy="afterInteractive" />;
}
