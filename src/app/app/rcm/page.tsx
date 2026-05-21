import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { createRcmWorkItem, getRcmOperatingCenter, updateRcmWorkItemStatus } from "@/lib/operating-system-repository";

export const dynamic = "force-dynamic";

type RcmItemRow = {
  id: string;
  workType: string;
  stage: string;
  priority: string;
  status: string;
  amountCents: number;
  lastName: string | null;
  firstName: string | null;
  chartNumber: string | null;
  payerName: string | null;
  blockerReason: string | null;
  nextAction: string;
};

type ClaimRow = {
  id: string;
  claimNumber: string | null;
  status: string;
  lastName: string;
  firstName: string;
  payerName: string;
  billedCents: number;
};

async function createAction(formData: FormData) {
  "use server";
  await createRcmWorkItem({
    patientId: String(formData.get("patientId") ?? "") || undefined,
    claimId: String(formData.get("claimId") ?? "") || undefined,
    workType: String(formData.get("workType") ?? "ELIGIBILITY_AND_BENEFITS"),
    stage: String(formData.get("stage") ?? "PRE_VISIT_CLEARANCE"),
    priority: String(formData.get("priority") ?? "NORMAL"),
    payerName: String(formData.get("payerName") ?? "") || undefined,
    amountCents: Math.round(Number(formData.get("amountDollars") ?? 0) * 100),
    blockerReason: String(formData.get("blockerReason") ?? ""),
    nextAction: String(formData.get("nextAction") ?? ""),
    dueAt: String(formData.get("dueAt") ?? "") || undefined,
  });
  revalidatePath("/app/rcm");
}

async function statusAction(formData: FormData) {
  "use server";
  await updateRcmWorkItemStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? "OPEN"));
  revalidatePath("/app/rcm");
}

export default async function RcmPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const center = await getRcmOperatingCenter();
  const items = center.items as RcmItemRow[];
  const claims = center.claims as ClaimRow[];
  const metrics = center.metrics;

  return (
    <FoundationShell active="/app/rcm" roleKey={role.key}>
      <PageHeader
        eyebrow="Revenue cycle command center"
        title="RCM, payer work, and revenue integrity"
        body="Eligibility, benefit evidence, prior-auth risk, claim readiness, attachments, payer follow-up, ERA/EOB exceptions, credentialing blockers, and revenue leakage are worked from PMS-backed records before anything leaves through a payer connector."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/rcm" />

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Open RCM items" value={Number(metrics.openItems)} />
        <Metric label="High priority" value={Number(metrics.highPriority)} />
        <Metric label="Blocked dollars" value={<Money cents={Number(metrics.blockedDollars)} />} />
        <Metric label="Leakage review" value={<Money cents={Number(metrics.leakageDollars)} />} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <PmsCard title="Create RCM work item" eyebrow="PMS or payer source">
          <form action={createAction} className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="patientId" label="Patient ID" />
              <Input name="claimId" label="Claim ID" />
              <Select name="workType" label="Work type" options={["ELIGIBILITY_AND_BENEFITS", "PRIOR_AUTH", "CLAIM_ATTACHMENT", "DENIAL_APPEAL", "ERA_EOB_POSTING", "REVENUE_INTEGRITY", "CREDENTIALING"]} />
              <Select name="stage" label="Stage" options={["PRE_VISIT_CLEARANCE", "ESTIMATE_READY", "CLAIM_READY", "PAYER_FOLLOW_UP", "DENIAL_REVIEW", "UNDERPAYMENT_REVIEW", "PAYER_ENROLLMENT"]} />
              <Select name="priority" label="Priority" options={["HIGH", "NORMAL", "LOW"]} />
              <Input name="payerName" label="Payer" />
              <Input name="amountDollars" label="Amount dollars" type="number" />
              <Input name="dueAt" label="Due" type="datetime-local" />
            </div>
            <Textarea name="blockerReason" label="Blocker reason" />
            <Textarea name="nextAction" label="Next action" required />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Create RCM item</button>
          </form>
        </PmsCard>

        <PmsCard title="RCM work queue" eyebrow="No payer submission until connector policy is live">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                <tr><th className="px-3 py-2">Work</th><th className="px-3 py-2">Patient / payer</th><th className="px-3 py-2">Blocker</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-neutral-950">{String(item.workType).replaceAll("_", " ")}</p>
                      <p className="mt-1 text-xs text-neutral-500">{String(item.stage).replaceAll("_", " ")} · {item.priority}</p>
                      <p className="mt-1 text-xs text-neutral-500"><Money cents={Number(item.amountCents ?? 0)} /></p>
                    </td>
                    <td className="px-3 py-3 text-xs text-neutral-700">
                      <p>{item.lastName ? `${item.lastName}, ${item.firstName} · ${item.chartNumber}` : "Practice-level item"}</p>
                      <p className="mt-1">{item.payerName ?? "No payer"}</p>
                    </td>
                    <td className="max-w-xl px-3 py-3 text-xs leading-5 text-neutral-600">
                      <p className="font-semibold text-neutral-800">{item.blockerReason}</p>
                      <p className="mt-1">{item.nextAction}</p>
                    </td>
                    <td className="px-3 py-3"><StatusFor value={item.status} /></td>
                    <td className="px-3 py-3"><StatusButtons id={item.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PmsCard>
      </section>

      <section className="mt-4">
        <PmsCard title="PMS claim register" eyebrow="Source records RCM must reconcile">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {claims.map((claim) => (
              <div key={claim.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-neutral-950">{claim.claimNumber ?? claim.id}</p><StatusFor value={claim.status} /></div>
                <p className="mt-1 text-xs text-neutral-600">{claim.lastName}, {claim.firstName} · {claim.payerName}</p>
                <p className="mt-1 text-xs text-neutral-600"><Money cents={Number(claim.billedCents ?? 0)} /> billed</p>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function StatusButtons({ id }: { id: string }) {
  return <div className="grid gap-2">{["READY_FOR_REVIEW", "APPROVED_STAGED", "COMPLETED"].map((status) => <form key={status} action={statusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} /><button className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">{status.replaceAll("_", " ").toLowerCase()}</button></form>)}</div>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-1 text-2xl font-semibold text-neutral-950">{value}</p></div>;
}

function Input({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<input name={name} type={type} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<select name={name} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>;
}

function Textarea({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<textarea name={name} required={required} rows={3} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}
