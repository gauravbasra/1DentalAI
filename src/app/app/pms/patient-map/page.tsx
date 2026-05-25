import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { createPatientMapReportSnapshot, createPatientMapSavedSegment, getPatientMapAnalytics, parsePatientMapFilters } from "@/lib/pms-patient-map-repository";
import { PatientMapClient } from "./patient-map-client";

export const dynamic = "force-dynamic";

async function saveSegmentAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const filters = parsePatientMapFilters(Object.fromEntries(formData.entries()) as Record<string, string>);
  const analytics = await getPatientMapAnalytics(session.tenantId, filters);
  await createPatientMapSavedSegment({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    segmentName: String(formData.get("segmentName") ?? "Patient map segment"),
    description: String(formData.get("description") ?? ""),
    filters,
    mappedPatients: analytics.stats.mappedPatients,
    valueCents: analytics.stats.productionCents + analytics.stats.treatmentCents,
  });
  revalidatePath("/app/pms/patient-map");
}

async function snapshotReportAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const filters = parsePatientMapFilters(Object.fromEntries(formData.entries()) as Record<string, string>);
  const analytics = await getPatientMapAnalytics(session.tenantId, filters);
  await createPatientMapReportSnapshot({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    reportName: String(formData.get("reportName") ?? "Patient map report"),
    filters,
    analytics,
  });
  revalidatePath("/app/pms/patient-map");
}

export default async function PatientMapPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(String(params.role ?? "owner_dentist"));
  const filters = parsePatientMapFilters(params);
  const analytics = await getPatientMapAnalytics(session.tenantId, filters);
  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY ?? "";
  const exportHref = `/api/pms/patient-map/export?${new URLSearchParams({
    service: filters.service,
    insurance: filters.insurance,
    ageBand: filters.ageBand,
    gender: filters.gender,
    provider: filters.provider,
    referralSource: filters.referralSource,
    valueBand: filters.valueBand,
    highValue: String(filters.highValueOnly),
    membership: String(filters.membershipOnly),
  }).toString()}`;

  return (
    <FoundationShell active="/app/pms/patient-map" roleKey={role.key}>
      <PageHeader
        eyebrow="Patient geography"
        title="Patient origin, service demand, payer mix, and membership map"
        body="Plot patient households from PMS demographics against services, high-value treatment, insurance, age, gender, and membership signals. Map markers are aggregated by family account so the view stays operational instead of exposing a raw patient list."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/patient-map" />
      <PmsSectionNav active="/app/pms/patient-map" roleKey={role.key} />

      <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Metric label="Mapped patients" value={analytics.stats.mappedPatients} detail={`${analytics.stats.mappedFamilies} households`} />
        <Metric label="Unmapped" value={analytics.stats.unmappedFamilies} detail="missing or failed geocode" />
        <Metric label="High value" value={analytics.stats.highValuePatients} detail="production/treatment threshold" />
        <Metric label="Membership" value={analytics.stats.membershipSignals} detail="enrollment or note signal" />
        <Metric label="Production" value={<Money cents={analytics.stats.productionCents} />} detail="mapped PMS value" />
        <Metric label="Treatment" value={<Money cents={analytics.stats.treatmentCents} />} detail="presented/planned" />
        <Metric label="Geocoding" value={analytics.geocoding.updated} detail={`${analytics.geocoding.attempted} attempted`} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[340px_1fr]">
        <PmsCard title="Map filters" eyebrow="Drill down">
          <form className="grid gap-3" action="/app/pms/patient-map">
            <input type="hidden" name="role" value={role.key} />
            <Select label="Service line" name="service" value={filters.service} options={analytics.filters.services} />
            <Select label="Insurance" name="insurance" value={filters.insurance} options={analytics.filters.insurances} />
            <Select label="Age band" name="ageBand" value={filters.ageBand} options={analytics.filters.ageBands} />
            <Select label="Gender" name="gender" value={filters.gender} options={analytics.filters.genders} />
            <Select label="Provider" name="provider" value={filters.provider} options={analytics.filters.providers} />
            <Select label="Referral source" name="referralSource" value={filters.referralSource} options={analytics.filters.referralSources} />
            <Select label="Value band" name="valueBand" value={filters.valueBand} options={analytics.filters.valueBands} />
            <Select label="Map mode" name="mapMode" value={filters.mapMode} options={["markers", "heatmap"]} />
            <Toggle label="High-value services only" name="highValue" checked={filters.highValueOnly} />
            <Toggle label="Membership signal only" name="membership" checked={filters.membershipOnly} />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Apply filters</button>
          </form>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href={exportHref} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-center text-xs font-semibold text-neutral-700">Export CSV</a>
            <form action={snapshotReportAction}>
              <HiddenFilters filters={filters} />
              <input type="hidden" name="reportName" value="Patient geography snapshot" />
              <button className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">Snapshot</button>
            </form>
          </div>
          <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Data status</p>
            <div className="mt-3 grid gap-2 text-xs leading-5 text-neutral-600">
              <p><StatusFor value={analytics.geocoding.enabled ? "GEOCODING_ACTIVE" : "GEOCODING_NOT_CONFIGURED"} /></p>
              <p>{analytics.geocoding.missingAddressCount} active family account(s) have no usable address.</p>
              <p>{analytics.geocoding.failed} geocode attempt(s) failed on this load.</p>
              <p>Membership uses explicit billing/financial note signals until the membership billing module creates enrollment records.</p>
            </div>
          </div>
        </PmsCard>

        <PmsCard title="Google patient map" eyebrow="Household clusters">
          <PatientMapClient apiKey={googleMapsKey} points={analytics.points} mode={filters.mapMode} />
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <PmsCard title="Saved map segments" eyebrow="Reusable drilldowns">
          <form action={saveSegmentAction} className="grid gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <HiddenFilters filters={filters} />
            <Input label="Segment name" name="segmentName" defaultValue="High-value geography segment" />
            <Input label="Description" name="description" defaultValue="Saved from current patient map filters" />
            <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Save current segment</button>
          </form>
          <div className="mt-3 grid gap-2">
            {analytics.savedSegments.map((segment) => (
              <div key={segment.id} className="rounded-lg bg-neutral-50 p-3 text-sm">
                <p className="font-semibold text-neutral-950">{segment.segmentName}</p>
                <p className="mt-1 text-xs text-neutral-500">{segment.lastPatientCount} patients · <Money cents={segment.lastValueCents} /> value · {segment.lastRunAt ? new Date(segment.lastRunAt).toLocaleDateString() : "not run"}</p>
              </div>
            ))}
          </div>
        </PmsCard>
        <PmsCard title="Geographic opportunity score" eyebrow="ZIP, service, payer, and referral concentration">
          <div className="grid gap-3 md:grid-cols-2">
            <Breakdown title="ZIP codes" rows={analytics.zipAnalytics} />
            <Breakdown title="Services" rows={analytics.serviceAnalytics} />
            <Breakdown title="Payers" rows={analytics.payerAnalytics} />
            <Breakdown title="Referral sources" rows={analytics.referralAnalytics} />
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <PmsCard title="Top mapped household clusters" eyebrow="Where production and care demand concentrate">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Area</th>
                  <th className="px-3 py-2">Patients</th>
                  <th className="px-3 py-2">Services</th>
                  <th className="px-3 py-2">Insurance</th>
                  <th className="px-3 py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {analytics.points.slice(0, 14).map((point) => (
                  <tr key={point.id} className="align-top">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-neutral-950">{point.city ?? "Unknown city"}{point.state ? `, ${point.state}` : ""}</p>
                      <p className="mt-1 text-xs text-neutral-500">{point.postalCode ?? "No ZIP"} · {point.samplePatients.join(", ") || point.label}</p>
                    </td>
                    <td className="px-3 py-3 text-neutral-700">{point.patientCount} / {point.familyMemberCount}</td>
                    <td className="max-w-xs px-3 py-3 text-xs leading-5 text-neutral-600">{point.serviceLines.slice(0, 4).join(", ") || "No service history"}</td>
                    <td className="max-w-xs px-3 py-3 text-xs leading-5 text-neutral-600">{point.payerNames.slice(0, 3).join(", ") || "No payer"}</td>
                    <td className="px-3 py-3 text-right font-semibold text-neutral-950"><Money cents={point.productionCents + point.treatmentCents} /><p className="text-xs text-neutral-500">score {point.opportunityScore}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PmsCard>

        <PmsCard title="Operator readout" eyebrow="How to use this">
          <div className="grid gap-3">
            <Readout title="Service demand" body="Filter by implant, ortho, restorative, emergency, hygiene, or other categories to see which neighborhoods create chair demand and which providers/rooms need capacity." />
            <Readout title="High-value care" body="Use high-value mode to isolate households tied to larger treatment plans or high-production services, then compare payer mix and referral source context." />
            <Readout title="Insurance strategy" body="Drill into payer names to see where network participation, employer benefits, or payer portal automation could move production and case acceptance." />
            <Readout title="Membership growth" body="Membership signal mode shows patients already tagged or likely suited for an in-house plan; hard enrollment analytics should replace this once membership billing is live." />
          </div>
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function Metric({ label, value, detail }: { label: string; value: React.ReactNode; detail: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">{detail}</p>
    </div>
  );
}

function Select({ label, name, value, options }: { label: string; name: string; value: string; options: string[] }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-neutral-700">
      {label}
      <select name={name} defaultValue={value} className="min-h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100">
        <option value="all">All</option>
        {options.map((option) => <option key={option} value={option}>{optionLabel(option)}</option>)}
      </select>
    </label>
  );
}

function Input({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-neutral-700">
      {label}
      <input name={name} defaultValue={defaultValue} className="min-h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
    </label>
  );
}

function Toggle({ label, name, checked }: { label: string; name: string; checked: boolean }) {
  return (
    <label className="flex min-h-10 items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700">
      <input type="checkbox" name={name} value="true" defaultChecked={checked} className="size-4 accent-neutral-950" />
      {label}
    </label>
  );
}

function Readout({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-sm font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">{body}</p>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Array<{ label: string; mappedPatients: number; productionCents: number; treatmentCents: number; highValuePatients: number; membershipSignals: number }> }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <p className="text-sm font-semibold text-neutral-950">{title}</p>
      <div className="mt-3 grid gap-2">
        {rows.slice(0, 5).map((row) => (
          <div key={`${title}-${row.label}`} className="rounded-md bg-neutral-50 p-2 text-xs">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-neutral-900">{optionLabel(row.label)}</p>
              <p className="text-right font-semibold text-neutral-950"><Money cents={row.productionCents + row.treatmentCents} /></p>
            </div>
            <p className="mt-1 text-neutral-500">{row.mappedPatients} patients · {row.highValuePatients} high value · {row.membershipSignals} membership</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HiddenFilters({ filters }: { filters: ReturnType<typeof parsePatientMapFilters> }) {
  return (
    <>
      <input type="hidden" name="service" value={filters.service} />
      <input type="hidden" name="insurance" value={filters.insurance} />
      <input type="hidden" name="ageBand" value={filters.ageBand} />
      <input type="hidden" name="gender" value={filters.gender} />
      <input type="hidden" name="provider" value={filters.provider} />
      <input type="hidden" name="referralSource" value={filters.referralSource} />
      <input type="hidden" name="valueBand" value={filters.valueBand} />
      <input type="hidden" name="mapMode" value={filters.mapMode} />
      <input type="hidden" name="highValue" value={String(filters.highValueOnly)} />
      <input type="hidden" name="membership" value={String(filters.membershipOnly)} />
    </>
  );
}

function optionLabel(value: string) {
  const labels: Record<string, string> = {
    under_1k: "Under $1K",
    "1k_5k": "$1K-$5K",
    "5k_10k": "$5K-$10K",
    "10k_plus": "$10K+",
    markers: "Markers",
    heatmap: "Heatmap",
  };
  return labels[value] ?? value;
}
