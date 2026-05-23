import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PatientEngagementSettingsPage() {
  redirect("/patient-engagement?panel=settings");
}
