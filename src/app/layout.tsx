import type { Metadata } from "next";
import { WebchatInstaller } from "@/components/webchat-installer";
import { defaultDescription, JsonLd, organizationSchema, siteName, siteUrl, softwareSchema } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "1DentalAI | Dental AI Operating System",
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  applicationName: siteName,
  authors: [{ name: "1DentalAI" }],
  creator: "1DentalAI",
  publisher: "1DentalAI",
  category: "Dental software",
  keywords: [
    "dental AI",
    "AI receptionist for dentists",
    "dental RCM automation",
    "dental insurance verification",
    "clinical AI scribe dentistry",
    "dental practice management AI",
  ],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "1DentalAI | Dental AI Operating System",
    description: defaultDescription,
    url: siteUrl,
    siteName,
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "1DentalAI dental AI operating system",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "1DentalAI | Dental AI Operating System",
    description: defaultDescription,
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/brand-profile.png", type: "image/png" },
    ],
    apple: [{ url: "/brand-profile.png" }],
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">
        <JsonLd data={[organizationSchema, softwareSchema]} />
        {children}
        <WebchatInstaller />
      </body>
    </html>
  );
}
