import type { Metadata } from "next";

export const siteUrl = "https://app.1dentalai.com";
export const siteName = "1DentalAI";
export const defaultDescription =
  "1DentalAI is a dental AI operating system for phones, patient messaging, insurance, RCM, clinical AI, reputation, analytics, and dental practice workflows.";

export const publicRoutes = [
  "",
  "/product",
  "/solutions",
  "/features",
  "/use-cases",
  "/demos",
  "/resources",
  "/blog",
  "/about",
  "/partners",
  "/readiness-score",
  "/signup",
  "/contact",
];

export function pageMetadata({
  title,
  description,
  path = "",
  keywords = [],
}: {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
}): Metadata {
  const url = `${siteUrl}${path}`;
  return {
    title,
    description,
    keywords: [
      "dental AI",
      "AI receptionist for dentists",
      "dental RCM automation",
      "dental practice management AI",
      "clinical AI scribe dentistry",
      "dental insurance verification",
      ...keywords,
    ],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: "website",
      images: [
        {
          url: `${siteUrl}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${siteName} dental AI operating system`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${siteUrl}/opengraph-image`],
    },
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteName,
  url: siteUrl,
  logo: `${siteUrl}/brand-profile.png`,
  founder: {
    "@type": "Person",
    name: "Gaurav Basra",
    jobTitle: "Founder and CEO",
  },
  description: defaultDescription,
  sameAs: ["https://www.1dentalai.com", "https://1dentalai.com"],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    email: "hello@1dentalai.com",
    areaServed: "US",
    availableLanguage: "English",
  },
};

export const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteName,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: siteUrl,
  description: defaultDescription,
  offers: {
    "@type": "Offer",
    category: "SaaS",
    availability: "https://schema.org/InStock",
  },
  audience: {
    "@type": "Audience",
    audienceType: "Dental practices, DSOs, dentists, hygienists, front desk teams, and billing teams",
  },
};
