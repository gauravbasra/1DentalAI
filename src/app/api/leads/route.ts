import { NextResponse } from "next/server";
import { isDatabaseConfigured, newId, query } from "@/lib/db";

type LeadPayload = {
  practiceName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  locations?: string;
  pms?: string;
  priority?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  readinessScore?: string;
};

function clean(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LeadPayload | null;

  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const lead = {
    practiceName: clean(body.practiceName, 160),
    contactName: clean(body.contactName, 120),
    email: clean(body.email, 180).toLowerCase(),
    phone: clean(body.phone, 80),
    locations: clean(body.locations, 80),
    pms: clean(body.pms, 120),
    priority: clean(body.priority, 500),
    source: clean(body.source, 120) || "contact_page",
    utmSource: clean(body.utmSource, 120),
    utmMedium: clean(body.utmMedium, 120),
    utmCampaign: clean(body.utmCampaign, 160),
    utmContent: clean(body.utmContent, 160),
    utmTerm: clean(body.utmTerm, 160),
    readinessScore: clean(body.readinessScore, 20),
  };

  if (!lead.practiceName || !lead.contactName || !lead.email || !lead.priority) {
    return NextResponse.json({ ok: false, error: "Practice, contact, email, and priority are required." }, { status: 400 });
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }

  if (isDatabaseConfigured()) {
    await query(`
      create table if not exists "MarketingLead" (
        "id" text primary key,
        "practiceName" text not null,
        "contactName" text not null,
        "email" text not null,
        "phone" text,
        "locations" text,
        "pms" text,
        "priority" text not null,
        "source" text not null,
        "utmSource" text,
        "utmMedium" text,
        "utmCampaign" text,
        "utmContent" text,
        "utmTerm" text,
        "readinessScore" text,
        "createdAt" timestamp not null default current_timestamp
      )
    `);

    await query(`alter table "MarketingLead" add column if not exists "utmSource" text`);
    await query(`alter table "MarketingLead" add column if not exists "utmMedium" text`);
    await query(`alter table "MarketingLead" add column if not exists "utmCampaign" text`);
    await query(`alter table "MarketingLead" add column if not exists "utmContent" text`);
    await query(`alter table "MarketingLead" add column if not exists "utmTerm" text`);
    await query(`alter table "MarketingLead" add column if not exists "readinessScore" text`);

    await query(
      `insert into "MarketingLead" ("id", "practiceName", "contactName", "email", "phone", "locations", "pms", "priority", "source", "utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm", "readinessScore")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        newId("lead"),
        lead.practiceName,
        lead.contactName,
        lead.email,
        lead.phone || null,
        lead.locations || null,
        lead.pms || null,
        lead.priority,
        lead.source,
        lead.utmSource || null,
        lead.utmMedium || null,
        lead.utmCampaign || null,
        lead.utmContent || null,
        lead.utmTerm || null,
        lead.readinessScore || null,
      ],
    );
  }

  return NextResponse.json({ ok: true });
}
