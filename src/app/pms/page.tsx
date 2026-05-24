import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PmsProductPage() {
  redirect("/app/pms");
}
