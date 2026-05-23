import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PatientEngagementFormsPage() {
  redirect("/patient-engagement?panel=forms");
}
