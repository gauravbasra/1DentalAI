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
          background: "linear-gradient(135deg, #ecfeff 0%, #f8fafc 45%, #ffffff 100%)",
          color: "#0f172a",
          padding: 72,
          fontFamily: "Arial",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#0e7490",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 42,
              fontWeight: 800,
            }}
          >
            1
          </div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>1DentalAI</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, lineHeight: 0.94, fontWeight: 800, maxWidth: 940 }}>
            Dental AI operating system for modern practices
          </div>
          <div style={{ marginTop: 28, fontSize: 30, lineHeight: 1.25, color: "#334155", maxWidth: 880 }}>
            Phones, insurance, RCM, clinical AI, reputation, and analytics in one accountable workflow.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 24, color: "#0e7490", fontWeight: 700 }}>
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
