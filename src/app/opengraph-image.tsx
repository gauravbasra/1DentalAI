import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at 16% 34%, rgba(14,165,233,0.48), transparent 28%), radial-gradient(circle at 84% 28%, rgba(37,99,235,0.34), transparent 26%), linear-gradient(135deg, #020617 0%, #111827 52%, #030712 100%)",
          color: "#f8fafc",
          padding: 72,
          fontFamily: "Arial",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 42, fontWeight: 900, letterSpacing: -2 }}>
            <span style={{ color: "#38bdf8" }}>1</span>dental<span style={{ color: "#2563eb" }}>AI</span><span style={{ color: "#94a3b8" }}>.com</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, lineHeight: 0.94, fontWeight: 800, maxWidth: 940 }}>
            Dental AI operating system for modern practices
          </div>
          <div style={{ marginTop: 28, fontSize: 30, lineHeight: 1.25, color: "#cbd5e1", maxWidth: 880 }}>
            Phones, insurance, RCM, clinical AI, reputation, and analytics in one accountable workflow.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 24, color: "#67e8f9", fontWeight: 700 }}>
          <span>AI receptionist</span>
          <span>•</span>
          <span>Clinical scribe</span>
          <span>•</span>
          <span>RCM automation</span>
        </div>
      </div>
    ),
    size,
  );
}
