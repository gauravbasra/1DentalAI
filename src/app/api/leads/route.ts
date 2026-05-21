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
        "createdAt" timestamp not null default current_timestamp
      )
    `);

    await query(
      `insert into "MarketingLead" ("id", "practiceName", "contactName", "email", "phone", "locations", "pms", "priority", "source")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [newId("lead"), lead.practiceName, lead.contactName, lead.email, lead.phone || null, lead.locations || null, lead.pms || null, lead.priority, "contact_page"],
    );
  }

  return NextResponse.json({ ok: true });
}
