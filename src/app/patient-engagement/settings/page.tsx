import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ProductPageTitle, StateBadge, WorkSurface } from "@/components/products/product-app-shell";
import { PatientEngagementShell, clean } from "@/components/products/patient-engagement-shell";
import {
  getPhoneOperatingCenter,
  updatePhoneDeviceStatus,
  updatePhoneExtensionStatus,
  updatePhoneNumberStatus,
  updatePhoneProviderStatus,
} from "@/lib/operating-system-repository";
import {
  upsertPatientEngagementChannelSetting,
  upsertWebchatLeadForm,
  upsertWebchatSchedulingRule,
} from "@/lib/webchat/repository";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ saved?: string; error?: string }>;
type Row = Record<string, unknown>;

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function bool(formData: FormData, key: string) {
  return value(formData, key) === "true";
}

function numberValue(formData: FormData, key: string, fallback: number) {
  const parsed = Number(value(formData, key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function themeValue(row: Row, key: string, fallback: string) {
  const theme = row.theme;
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) return fallback;
  const found = (theme as Record<string, unknown>)[key];
  return typeof found === "string" ? found : fallback;
}

async function saveProviderAction(formData: FormData) {
  "use server";
  try {
    await updatePhoneProviderStatus(
      value(formData, "id"),
      value(formData, "status"),
      value(formData, "credentialStatus"),
      value(formData, "webhookStatus"),
      value(formData, "e911Status"),
      value(formData, "trunkDomain"),
      value(formData, "outboundCallerId"),
      value(formData, "nextAction"),
    );
  } catch (error) {
    redirect(`/patient-engagement/settings?error=${encodeURIComponent(error instanceof Error ? error.message : "Provider settings could not be saved.")}`);
  }
  revalidatePath("/patient-engagement/settings");
  redirect("/patient-engagement/settings?saved=provider");
}

async function saveNumberAction(formData: FormData) {
  "use server";
  try {
    await updatePhoneNumberStatus(value(formData, "id"), value(formData, "portStatus"), value(formData, "voiceStatus"), value(formData, "smsStatus"), value(formData, "e911Status"), value(formData, "status"));
  } catch (error) {
    redirect(`/patient-engagement/settings?error=${encodeURIComponent(error instanceof Error ? error.message : "Phone number settings could not be saved.")}`);
  }
  revalidatePath("/patient-engagement/settings");
  redirect("/patient-engagement/settings?saved=number");
}

async function saveExtensionAction(formData: FormData) {
  "use server";
  try {
    await updatePhoneExtensionStatus(value(formData, "id"), value(formData, "status"), bool(formData, "voicemailEnabled"));
  } catch (error) {
    redirect(`/patient-engagement/settings?error=${encodeURIComponent(error instanceof Error ? error.message : "Extension settings could not be saved.")}`);
  }
  revalidatePath("/patient-engagement/settings");
  redirect("/patient-engagement/settings?saved=extension");
}

async function saveDeviceAction(formData: FormData) {
  "use server";
  try {
    await updatePhoneDeviceStatus(value(formData, "id"), value(formData, "provisioningStatus"), value(formData, "registrationStatus"), value(formData, "macAddress"), value(formData, "sipUsername"), value(formData, "assignedTo"), value(formData, "deskLocation"));
  } catch (error) {
    redirect(`/patient-engagement/settings?error=${encodeURIComponent(error instanceof Error ? error.message : "Device settings could not be saved.")}`);
  }
  revalidatePath("/patient-engagement/settings");
  redirect("/patient-engagement/settings?saved=device");
}

async function saveChannelAction(formData: FormData) {
  "use server";
  try {
    await upsertPatientEngagementChannelSetting({
      channel: value(formData, "channel"),
      displayName: value(formData, "displayName"),
      status: value(formData, "status"),
      primaryColor: value(formData, "primaryColor"),
      launcherText: value(formData, "launcherText"),
      nlpMode: value(formData, "nlpMode"),
      knowledgeBaseStatus: value(formData, "knowledgeBaseStatus"),
      schedulingStatus: value(formData, "schedulingStatus"),
      formsStatus: value(formData, "formsStatus"),
      connectorStatus: value(formData, "connectorStatus"),
      staffApprovalRequired: bool(formData, "staffApprovalRequired"),
      appointmentWritebackRequiresPmsConnector: bool(formData, "appointmentWritebackRequiresPmsConnector"),
      clinicalAdviceBlocked: bool(formData, "clinicalAdviceBlocked"),
      pricingPolicy: value(formData, "pricingPolicy"),
      warmTransferMonitoring: value(formData, "warmTransferMonitoring"),
      callbackRouting: value(formData, "callbackRouting"),
      nextAction: value(formData, "nextAction"),
    });
  } catch (error) {
    redirect(`/patient-engagement/settings?error=${encodeURIComponent(error instanceof Error ? error.message : "Channel settings could not be saved.")}`);
  }
  revalidatePath("/patient-engagement/settings");
  redirect("/patient-engagement/settings?saved=channel");
}

async function saveLeadFormAction(formData: FormData) {
  "use server";
  try {
    await upsertWebchatLeadForm({
      id: value(formData, "id") || undefined,
      name: value(formData, "name"),
      serviceLine: value(formData, "serviceLine"),
      fields: value(formData, "fields"),
      routingRule: value(formData, "routingRule"),
      status: value(formData, "status"),
    });
  } catch (error) {
    redirect(`/patient-engagement/settings?error=${encodeURIComponent(error instanceof Error ? error.message : "Lead form settings could not be saved.")}`);
  }
  revalidatePath("/patient-engagement/settings");
  redirect("/patient-engagement/settings?saved=lead-form");
}

async function saveSchedulingRuleAction(formData: FormData) {
  "use server";
  try {
    await upsertWebchatSchedulingRule({
      id: value(formData, "id") || undefined,
      name: value(formData, "name"),
      sourceChannel: value(formData, "sourceChannel"),
      bookingWindowDays: numberValue(formData, "bookingWindowDays", 30),
      allowReschedule: bool(formData, "allowReschedule"),
      requireHumanApproval: bool(formData, "requireHumanApproval"),
      status: value(formData, "status"),
      nextAction: value(formData, "nextAction"),
    });
  } catch (error) {
    redirect(`/patient-engagement/settings?error=${encodeURIComponent(error instanceof Error ? error.message : "Scheduling settings could not be saved.")}`);
  }
  revalidatePath("/patient-engagement/settings");
  redirect("/patient-engagement/settings?saved=scheduling");
}

export default async function PatientEngagementSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const center = await getPhoneOperatingCenter();
  const providers = (center.providers ?? []) as Row[];
  const numbers = (center.numbers ?? []) as Row[];
  const extensions = (center.extensions ?? []) as Row[];
  const devices = (center.devices ?? []) as Row[];
  const channelSettings = (center.channelSettings ?? []) as Row[];
  const schedulingRules = (center.schedulingRules ?? []) as Row[];
  const leadForms = (center.leadForms ?? []) as Row[];

  return (
    <PatientEngagementShell active="/patient-engagement/settings">
      <ProductPageTitle
        eyebrow="Patient Engagement settings"
        title="Operational settings that save, audit, and drive the product."
        body="Provider status, phone numbers, devices, channel policy, webchat forms, and scheduling handoff all persist to the same tables used by phone, SMS, webchat, and appointment workflows."
      />

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/app/connectors?view=credentials" className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Credential vault</Link>
        <Link href="/patient-engagement/webchat?view=ai-settings" className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">AI runtime</Link>
        <Link href="/patient-engagement/webchat?view=install" className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">Widget install</Link>
      </div>

      {params.saved ? <Feedback tone="green" message={`${clean(params.saved)} settings saved and audit event recorded.`} /> : null}
      {params.error ? <Feedback tone="red" message={params.error} /> : null}

      <section className="mt-7 grid gap-5 xl:grid-cols-2">
        <WorkSurface title="Provider connections" eyebrow="Carrier, SIP/PBX, SMS, AI voice">
          <div className="space-y-4">
            {providers.map((provider) => <ProviderForm key={String(provider.id)} provider={provider} />)}
            {!providers.length ? <Empty title="No provider connection rows" body="Create provider installations in connector setup before phone, SMS, or AI voice can become live." /> : null}
          </div>
        </WorkSurface>

        <WorkSurface title="Phone numbers" eyebrow="DID, E911, SMS, voice readiness">
          <div className="space-y-4">
            {numbers.map((number) => <NumberForm key={String(number.id)} number={number} />)}
            {!numbers.length ? <Empty title="No phone numbers" body="Add or import numbers before voice, SMS, tracking, and missed-call automation can run." /> : null}
          </div>
        </WorkSurface>

        <WorkSurface title="Extensions and voicemail" eyebrow="Staff routing">
          <div className="space-y-4">
            {extensions.map((extension) => <ExtensionForm key={String(extension.id)} extension={extension} />)}
            {!extensions.length ? <Empty title="No extensions" body="Extensions are required for routing, voicemail ownership, transfers, and staff availability." /> : null}
          </div>
        </WorkSurface>

        <WorkSurface title="Physical and soft-phone devices" eyebrow="Provisioning and registration">
          <div className="space-y-4">
            {devices.map((device) => <DeviceForm key={String(device.id)} device={device} />)}
            {!devices.length ? <Empty title="No devices" body="Desk phones, soft phones, and WebRTC devices need provisioning records before live call control." /> : null}
          </div>
        </WorkSurface>

        <WorkSurface title="Channel policy" eyebrow="Phone, SMS, webchat, forms">
          <div className="space-y-4">
            {channelSettings.map((channel) => <ChannelForm key={String(channel.id)} channel={channel} />)}
            <ChannelForm channel={{ channel: "SMS", displayName: "SMS", status: "READY_FOR_REVIEW", connectorStatus: "CONNECTOR_REQUIRED", nlpMode: "STAFF_REPLY", nextAction: "Verify consent, A2P registration, quiet hours, and Twilio webhook delivery before live SMS automation." }} />
          </div>
        </WorkSurface>

        <WorkSurface title="Webchat lead forms" eyebrow="Fields, service lines, routing">
          <div className="space-y-4">
            {leadForms.map((form) => <LeadFormSettings key={String(form.id)} form={form} />)}
            <LeadFormSettings form={{ name: "", serviceLine: "", status: "READY_FOR_REVIEW", routingRule: "Route to front desk for identity verification, appointment intent, consent, and scheduling handoff.", fieldSchema: { fields: ["name", "phone", "email", "service", "preferred_day"] } }} />
          </div>
        </WorkSurface>

        <WorkSurface title="Scheduling handoff" eyebrow="Booking, reschedule, PMS writeback">
          <div className="space-y-4">
            {schedulingRules.map((rule) => <SchedulingRuleSettings key={String(rule.id)} rule={rule} />)}
            <SchedulingRuleSettings rule={{ name: "", sourceChannel: "WEB_CHAT", status: "READY_FOR_REVIEW", bookingWindowDays: 30, allowReschedule: true, requireHumanApproval: true, nextAction: "Approve PMS connector route or keep appointment creation as manual staff handoff." }} />
          </div>
        </WorkSurface>
      </section>
    </PatientEngagementShell>
  );
}

function ProviderForm({ provider }: { provider: Row }) {
  return (
    <form action={saveProviderAction} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <input type="hidden" name="id" value={String(provider.id)} />
      <Header title={String(provider.name)} detail={`${clean(provider.providerType)} · ${String(provider.trunkDomain ?? "no trunk domain")}`} status={String(provider.status)} />
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <Select name="status" label="Status" defaultValue={String(provider.status)} options={["SETUP_REQUIRED", "READY_FOR_SMOKE_TEST", "ACTIVE", "BLOCKED_READINESS"]} />
        <Select name="credentialStatus" label="Credentials" defaultValue={String(provider.credentialStatus)} options={["MISSING", "PENDING", "VALIDATED"]} />
        <Select name="webhookStatus" label="Webhooks" defaultValue={String(provider.webhookStatus)} options={["NOT_CONFIGURED", "PENDING", "VERIFIED", "NOT_REQUIRED"]} />
        <Select name="e911Status" label="E911" defaultValue={String(provider.e911Status)} options={["NOT_CONFIGURED", "PENDING", "VALIDATED", "ACTIVE"]} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Input name="trunkDomain" label="Trunk domain" defaultValue={String(provider.trunkDomain ?? "")} />
        <Input name="outboundCallerId" label="Outbound caller ID" defaultValue={String(provider.outboundCallerId ?? "")} />
      </div>
      <Textarea name="nextAction" label="Next action" defaultValue={String(provider.nextAction ?? "")} />
      <SaveButton label="Save provider" />
    </form>
  );
}

function NumberForm({ number }: { number: Row }) {
  return (
    <form action={saveNumberAction} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <input type="hidden" name="id" value={String(number.id)} />
      <Header title={`${String(number.label)} · ${String(number.phoneNumber)}`} detail={`${clean(number.numberType)} · ${String(number.locationName ?? "Enterprise")}`} status={String(number.status)} />
      <div className="mt-3 grid gap-3 md:grid-cols-5">
        <Select name="portStatus" label="Porting" defaultValue={String(number.portStatus)} options={["NOT_STARTED", "SUBMITTED", "PORTING", "COMPLETE", "BLOCKED"]} />
        <Select name="voiceStatus" label="Voice" defaultValue={String(number.voiceStatus)} options={["NOT_CONFIGURED", "PENDING", "ACTIVE", "BLOCKED"]} />
        <Select name="smsStatus" label="SMS" defaultValue={String(number.smsStatus)} options={["NOT_CONFIGURED", "PENDING", "ACTIVE", "BLOCKED"]} />
        <Select name="e911Status" label="E911" defaultValue={String(number.e911Status)} options={["NOT_CONFIGURED", "PENDING", "VALIDATED", "ACTIVE"]} />
        <Select name="status" label="Status" defaultValue={String(number.status)} options={["SETUP_REQUIRED", "READY_FOR_SMOKE_TEST", "ACTIVE", "BLOCKED_READINESS"]} />
      </div>
      <SaveButton label="Save number" />
    </form>
  );
}

function ExtensionForm({ extension }: { extension: Row }) {
  return (
    <form action={saveExtensionAction} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <input type="hidden" name="id" value={String(extension.id)} />
      <Header title={`${String(extension.extensionNumber)} · ${String(extension.displayName)}`} detail={`${clean(extension.ownerRoleKey)} · ${String(extension.locationName ?? "Enterprise")}`} status={String(extension.status)} />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Select name="status" label="Status" defaultValue={String(extension.status)} options={["ACTIVE", "PAUSED", "DISABLED"]} />
        <Select name="voicemailEnabled" label="Voicemail" defaultValue={String(extension.voicemailEnabled ?? true)} options={["true", "false"]} />
      </div>
      <SaveButton label="Save extension" />
    </form>
  );
}

function DeviceForm({ device }: { device: Row }) {
  return (
    <form action={saveDeviceAction} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <input type="hidden" name="id" value={String(device.id)} />
      <Header title={String(device.label)} detail={`${clean(device.deviceType)} · ${String(device.extensionNumber ?? "no extension")}`} status={String(device.registrationStatus)} />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Select name="provisioningStatus" label="Provisioning" defaultValue={String(device.provisioningStatus)} options={["NOT_PROVISIONED", "PENDING", "PROVISIONED", "FAILED"]} />
        <Select name="registrationStatus" label="Registration" defaultValue={String(device.registrationStatus)} options={["OFFLINE", "ONLINE", "ERROR"]} />
        <Input name="macAddress" label="MAC address" defaultValue={String(device.macAddress ?? "")} />
        <Input name="sipUsername" label="SIP username" defaultValue={String(device.sipUsername ?? "")} />
        <Input name="assignedTo" label="Assigned staff" defaultValue={String(device.assignedTo ?? "")} />
        <Input name="deskLocation" label="Desk/room" defaultValue={String(device.deskLocation ?? "")} />
      </div>
      <SaveButton label="Save device" />
    </form>
  );
}

function ChannelForm({ channel }: { channel: Row }) {
  const policy = channel.approvalPolicy && typeof channel.approvalPolicy === "object" && !Array.isArray(channel.approvalPolicy)
    ? channel.approvalPolicy as Record<string, unknown>
    : {};
  return (
    <form action={saveChannelAction} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <input type="hidden" name="channel" value={String(channel.channel)} />
      <Header title={clean(channel.channel)} detail={String(channel.nextAction ?? "No next action recorded")} status={String(channel.connectorStatus ?? channel.status)} />
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Input name="displayName" label="Display name" defaultValue={String(channel.displayName ?? clean(channel.channel))} />
        <Input name="primaryColor" label="Primary color" defaultValue={themeValue(channel, "primaryColor", "#0891b2")} />
        <Input name="launcherText" label="Launcher text" defaultValue={themeValue(channel, "launcherText", "Need help?")} />
        <Select name="status" label="Status" defaultValue={String(channel.status ?? "READY_FOR_REVIEW")} options={["SETUP_REQUIRED", "READY_FOR_REVIEW", "ACTIVE", "PAUSED"]} />
        <Select name="nlpMode" label="NLP mode" defaultValue={String(channel.nlpMode ?? "RULES_AND_AI_DRAFT")} options={["AI_AUTO", "RULES_AND_AI_DRAFT", "STAFF_REPLY", "DISABLED"]} />
        <Select name="connectorStatus" label="Connector" defaultValue={String(channel.connectorStatus ?? "CONNECTOR_REQUIRED")} options={["CONNECTOR_REQUIRED", "READY", "BLOCKED"]} />
        <Select name="knowledgeBaseStatus" label="Knowledge base" defaultValue={String(channel.knowledgeBaseStatus ?? "NEEDS_REVIEW")} options={["NEEDS_REVIEW", "READY", "BLOCKED"]} />
        <Select name="schedulingStatus" label="Scheduling" defaultValue={String(channel.schedulingStatus ?? "PMS_CONNECTOR_REQUIRED")} options={["PMS_CONNECTOR_REQUIRED", "READY", "BLOCKED"]} />
        <Select name="formsStatus" label="Forms" defaultValue={String(channel.formsStatus ?? "PMS_FORMS_REQUIRED")} options={["PMS_FORMS_REQUIRED", "READY", "BLOCKED"]} />
        <Select name="staffApprovalRequired" label="Staff approval" defaultValue="true" options={["true", "false"]} />
        <Select name="appointmentWritebackRequiresPmsConnector" label="PMS writeback gate" defaultValue="true" options={["true", "false"]} />
        <Select name="clinicalAdviceBlocked" label="Clinical advice blocked" defaultValue="true" options={["true", "false"]} />
        <Select name="pricingPolicy" label="Pricing policy" defaultValue={String(policy.pricingPolicy ?? "NO_PUBLIC_PRICING_STAFF_ONLY")} options={["NO_PUBLIC_PRICING_STAFF_ONLY", "STAFF_CAN_SHARE_RANGES", "DISABLED"]} />
        <Select name="warmTransferMonitoring" label="Warm transfer monitor" defaultValue={String(policy.warmTransferMonitoring ?? "AI_MONITORS_UNTIL_STAFF_RESPONDS")} options={["AI_MONITORS_UNTIL_STAFF_RESPONDS", "STAFF_ONLY_AFTER_TRANSFER"]} />
        <Select name="callbackRouting" label="Callback order" defaultValue={String(policy.callbackRouting ?? "CALL_OFFICE_FIRST_THEN_VISITOR")} options={["CALL_OFFICE_FIRST_THEN_VISITOR", "CALL_VISITOR_DIRECTLY"]} />
      </div>
      <Textarea name="nextAction" label="Next action" defaultValue={String(channel.nextAction ?? "")} />
      <SaveButton label="Save channel policy" />
    </form>
  );
}

function LeadFormSettings({ form }: { form: Row }) {
  const fieldSchema = form.fieldSchema && typeof form.fieldSchema === "object" && !Array.isArray(form.fieldSchema) ? form.fieldSchema as Record<string, unknown> : {};
  const fields = Array.isArray(fieldSchema.fields) ? fieldSchema.fields.join(", ") : "name, phone, email, service, preferred_day";
  return (
    <form action={saveLeadFormAction} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <input type="hidden" name="id" value={String(form.id ?? "")} />
      <Header title={String(form.name || "New lead form")} detail={String(form.serviceLine || "Service line not set")} status={String(form.status ?? "READY_FOR_REVIEW")} />
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Input name="name" label="Form name" defaultValue={String(form.name ?? "")} />
        <Input name="serviceLine" label="Service line" defaultValue={String(form.serviceLine ?? "")} />
        <Select name="status" label="Status" defaultValue={String(form.status ?? "READY_FOR_REVIEW")} options={["READY_FOR_REVIEW", "READY", "PAUSED", "BLOCKED"]} />
      </div>
      <Input name="fields" label="Fields" defaultValue={fields} />
      <Textarea name="routingRule" label="Routing rule" defaultValue={String(form.routingRule ?? "Route to front desk for identity verification, appointment intent, consent, and scheduling handoff.")} />
      <SaveButton label={form.id ? "Save form" : "Create form"} />
    </form>
  );
}

function SchedulingRuleSettings({ rule }: { rule: Row }) {
  return (
    <form action={saveSchedulingRuleAction} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <input type="hidden" name="id" value={String(rule.id ?? "")} />
      <Header title={String(rule.name || "New scheduling rule")} detail={`${clean(rule.sourceChannel)} · ${String(rule.appointmentCategoryName ?? "appointment category not mapped")}`} status={String(rule.pmsWritebackStatus ?? rule.status ?? "READY_FOR_REVIEW")} />
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Input name="name" label="Rule name" defaultValue={String(rule.name ?? "")} />
        <Select name="sourceChannel" label="Source" defaultValue={String(rule.sourceChannel ?? "WEB_CHAT")} options={["WEB_CHAT", "SMS", "PHONE", "LANDING_PAGE"]} />
        <Select name="status" label="Status" defaultValue={String(rule.status ?? "READY_FOR_REVIEW")} options={["READY_FOR_REVIEW", "READY", "PAUSED", "BLOCKED"]} />
        <Input name="bookingWindowDays" label="Booking window days" type="number" min="1" max="365" defaultValue={String(rule.bookingWindowDays ?? 30)} />
        <Select name="allowReschedule" label="Allow reschedule" defaultValue={String(rule.allowReschedule ?? true)} options={["true", "false"]} />
        <Select name="requireHumanApproval" label="Human approval" defaultValue={String(rule.requireHumanApproval ?? true)} options={["true", "false"]} />
      </div>
      <Textarea name="nextAction" label="Next action" defaultValue={String(rule.nextAction ?? "")} />
      <SaveButton label={rule.id ? "Save scheduling rule" : "Create scheduling rule"} />
    </form>
  );
}

function Header({ title, detail, status }: { title: string; detail: string; status: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-neutral-950">{title}</p>
        <p className="mt-1 text-xs leading-5 text-neutral-600">{detail}</p>
      </div>
      <StateBadge tone={["ACTIVE", "READY", "VALIDATED", "ONLINE"].includes(status) ? "green" : "amber"}>{clean(status)}</StateBadge>
    </div>
  );
}

function Feedback({ tone, message }: { tone: "green" | "red"; message: string }) {
  const classes = tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900";
  return <div className={`mt-5 rounded-lg border p-4 text-sm font-semibold ${classes}`}>{message}</div>;
}

function SaveButton({ label }: { label: string }) {
  return <button className="mt-3 rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">{label}</button>;
}

function Input({ name, label, defaultValue, type = "text", min, max }: { name: string; label: string; defaultValue?: string; type?: string; min?: string; max?: string }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
      {label}
      <input name={name} type={type} min={min} max={max} defaultValue={defaultValue} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-neutral-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
    </label>
  );
}

function Select({ name, label, options, defaultValue }: { name: string; label: string; options: string[]; defaultValue?: string }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
      {label}
      <select name={name} defaultValue={defaultValue} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-neutral-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100">
        {options.map((option) => <option key={option} value={option}>{clean(option)}</option>)}
      </select>
    </label>
  );
}

function Textarea({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
      {label}
      <textarea name={name} rows={3} defaultValue={defaultValue} className="mt-1 w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-neutral-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
    </label>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
      <p className="text-sm font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">{body}</p>
    </div>
  );
}
