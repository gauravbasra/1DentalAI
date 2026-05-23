import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PatientEngagementPhonePage() {
  redirect("/patient-engagement?panel=phone");
}
