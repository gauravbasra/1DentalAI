import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "1DentalAI | Dental AI Operating System",
  description:
    "1DentalAI connects AI phone, patient messaging, insurance, RCM, reputation, clinical AI, analytics, and dental practice workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
