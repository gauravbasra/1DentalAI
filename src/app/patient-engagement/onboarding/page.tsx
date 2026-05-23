import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PatientEngagementOnboardingPage() {
  redirect("/patient-engagement?panel=settings");
}
