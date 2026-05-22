import { BookingClient } from "./booking-client";
import { getPublicSchedulingExperience } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ booked?: string; utm_source?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const experience = await getPublicSchedulingExperience(slug);

  return (
    <BookingClient
      initialSlug={slug}
      appointmentTypes={experience.appointmentTypes}
      slotsBySlug={experience.slotsBySlug}
      customForms={experience.customForms}
      booked={query.booked === "1"}
      utmSource={query.utm_source}
    />
  );
}
