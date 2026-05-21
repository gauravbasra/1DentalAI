import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { listDocuments } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type DocumentRow = {
  id: string;
  title: string;
  documentType: string;
  lastName: string | null;
  firstName: string | null;
  status: string;
  signatureStatus: string;
};

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const docs = await listDocuments();
  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow="PMS documents" title="Documents and signatures" body="Patient forms, consents, treatment presentations, referrals, EOBs, statements, letters, PDFs, and signed clinical documents attach to patient and practice workflows." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/documents" />
      <PmsSectionNav active="/app/pms/documents" roleKey={role.key} />
      <PmsCard title="Document queue" eyebrow="Forms and PDFs">
        {docs.length ? (docs as DocumentRow[]).map((doc) => (
          <div key={doc.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-neutral-950">{doc.title}</p>
                <p className="mt-1 text-sm text-neutral-600">{doc.documentType.replaceAll("_", " ").toLowerCase()} · {doc.lastName ? `${doc.lastName}, ${doc.firstName}` : "practice document"}</p>
              </div>
              <StatusFor value={doc.status} />
            </div>
            <p className="mt-3 text-sm text-neutral-700">Signature: {doc.signatureStatus.replaceAll("_", " ").toLowerCase()}</p>
          </div>
        )) : <EmptyPmsState title="No documents yet" body="Generated PDFs, imported forms, signed consents, treatment presentations, EOBs, referrals, and statements will appear here." />}
      </PmsCard>
    </FoundationShell>
  );
}
