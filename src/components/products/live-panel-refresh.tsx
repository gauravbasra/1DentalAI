"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LivePanelRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const events = new EventSource("/api/webchat/inbox-stream?tenant=tenant_1dentalai_production");
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    events.addEventListener("inbox", refresh);
    const id = window.setInterval(refresh, intervalMs);
    return () => {
      events.close();
      window.clearInterval(id);
    };
  }, [intervalMs, router]);

  return null;
}
