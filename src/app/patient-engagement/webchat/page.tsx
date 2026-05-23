import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PatientEngagementWebchatPage() {
  redirect("/patient-engagement?panel=webchat");
}
