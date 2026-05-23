import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { ClinicalAiConsole } from "@/components/products/clinical-ai-console";
import { getRole, type RoleKey } from "@/lib/foundation-data";

export const dynamic = "force-dynamic";

export default async function ClinicalAiPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);

  return (
    <FoundationShell active="/app/clinical-ai" roleKey={role.key}>
      <PageHeader
        eyebrow="Clinical AI"
        title="Voice perio charting, notes, and treatment intelligence."
        body="Capture perio measurements by voice, see every heard/parsed/charted step, test microphones, and prepare clinical notes or treatment recommendations before PMS/EHR writeback."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/clinical-ai" />
      <ClinicalAiConsole provider={role.sampleUser} />
    </FoundationShell>
  );
}
