import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "1DentalAI",
  description: "Production bootstrap for the 1DentalAI dental AI operating system.",
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
