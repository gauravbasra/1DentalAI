"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

export function WebchatInstaller() {
  const pathname = usePathname();
  if (pathname?.startsWith("/app") || pathname?.startsWith("/login") || pathname?.startsWith("/signup")) return null;
  return <Script src="/api/webchat/widget.js?tenant=tenant_1dentalai_production" strategy="afterInteractive" />;
}
