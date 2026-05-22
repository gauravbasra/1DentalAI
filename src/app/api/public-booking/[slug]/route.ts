import { NextRequest, NextResponse } from "next/server";
import { submitCustomForm } from "@/lib/form-builder-repository";
import { getOnlineSchedulingAvailability, submitOnlineBooking } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ slug: string }> };

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dobFromParts(input: Record<string, unknown>) {
  const month = text(input.dateOfBirthMonth).padStart(2, "0");
  const day = text(input.dateOfBirthDay).padStart(2, "0");
  const year = text(input.dateOfBirthYear);
  if (!month || !day || !year) return undefined;
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) return undefined;
  return `${year}-${month}-${day}`;
}

function formAnswerMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, Record<string, string>>;
}

function stringMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, string>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const slots = await getOnlineSchedulingAvailability(slug);
  return NextResponse.json({ ok: true, slots });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const slot = String(body.slot ?? "").split("|");
  const startsAt = slot[0] ?? "";
  const providerId = slot[1] ?? "";
  const operatoryId = slot[2] ?? "";
  const required = [
    ["slot", startsAt && providerId && operatoryId],
    ["firstName", text(body.firstName)],
    ["lastName", text(body.lastName)],
    ["email", text(body.email)],
    ["phone", text(body.phone)],
    ["referralSource", text(body.referralSource)],
    ["insuranceStatus", text(body.insuranceStatus)],
  ].filter(([, ok]) => !ok).map(([field]) => field);
  if (required.length) {
    return NextResponse.json({ ok: false, error: `Missing required fields: ${required.join(", ")}` }, { status: 400 });
  }

  try {
    const booking = await submitOnlineBooking({
      slug,
      startsAt,
      providerId,
      operatoryId,
      firstName: text(body.firstName),
      lastName: text(body.lastName),
      dateOfBirth: dobFromParts(body),
      phone: text(body.phone),
      email: text(body.email),
      insurancePayerName: text(body.insuranceStatus).toLowerCase() === "yes" ? text(body.insurancePayerName) : undefined,
      subscriberId: text(body.subscriberId),
      patientNote: [
        text(body.patientNote),
        `Patient type: ${text(body.patientType) || "not specified"}`,
        `Scheduling for: ${text(body.schedulingFor) || "self"}`,
        `Referral source: ${text(body.referralSource)}`,
        `Insurance answer: ${text(body.insuranceStatus)}`,
      ].filter(Boolean).join(" | "),
      utmSource: text(body.utmSource) || "public_scheduler",
    });
    const customFormAnswers = formAnswerMap(body.customFormAnswers);
    const customFormSignatures = stringMap(body.customFormSignatures);
    const formSubmissions = await Promise.all(Object.entries(customFormAnswers).map(([formDefinitionId, answers]) => submitCustomForm({
      formDefinitionId,
      patientId: booking.patientId,
      appointmentId: booking.appointmentId,
      sourceChannel: "PUBLIC_BOOKING",
      submittedByName: `${text(body.firstName)} ${text(body.lastName)}`.trim(),
      submittedByEmail: text(body.email),
      submittedByPhone: text(body.phone),
      signatureName: customFormSignatures[formDefinitionId] ?? "",
      answers,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    })));
    return NextResponse.json({ ok: true, booking, formSubmissions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Booking failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 409 });
  }
}
