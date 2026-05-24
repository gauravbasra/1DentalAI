import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import {
  consumeInventoryStock,
  createInventoryAsset,
  createInventoryItem,
  createInventoryRfp,
  createInventoryVendor,
  getInventoryWorkbench,
  receiveInventoryStock,
} from "@/lib/pms-inventory-repository";

export const dynamic = "force-dynamic";

function cents(value: unknown) {
  return Math.round(Number(value || 0) * 100);
}

function number(value: unknown) {
  return Number(value || 0);
}

export async function GET() {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  return NextResponse.json({ data: await getInventoryWorkbench(auth.session.tenantId) });
}

export async function POST(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const tenantId = auth.session.tenantId;
  const actorRole = auth.session.roleKey;

  if (action === "createVendor") {
    return NextResponse.json({
      data: await createInventoryVendor({
        tenantId,
        actorRole,
        vendorName: String(body.vendorName ?? ""),
        vendorType: String(body.vendorType ?? "SUPPLIES"),
        marketplaceStatus: String(body.marketplaceStatus ?? "PRIVATE_VENDOR"),
        email: body.email ? String(body.email) : undefined,
        phone: body.phone ? String(body.phone) : undefined,
        website: body.website ? String(body.website) : undefined,
        paymentTerms: body.paymentTerms ? String(body.paymentTerms) : undefined,
      }),
    });
  }

  if (action === "createItem") {
    return NextResponse.json({
      data: await createInventoryItem({
        tenantId,
        actorRole,
        vendorId: body.vendorId ? String(body.vendorId) : undefined,
        sku: String(body.sku ?? ""),
        itemName: String(body.itemName ?? ""),
        category: String(body.category ?? "SUPPLIES"),
        clinicalUse: body.clinicalUse ? String(body.clinicalUse) : undefined,
        itemType: String(body.itemType ?? "CONSUMABLE"),
        unitOfMeasure: String(body.unitOfMeasure ?? "each"),
        reorderPoint: number(body.reorderPoint),
        parLevel: number(body.parLevel),
        lastUnitCostCents: cents(body.lastUnitCost),
        benchmarkCostCents: body.benchmarkCost ? cents(body.benchmarkCost) : undefined,
        taxable: Boolean(body.taxable),
        requiresLotTracking: Boolean(body.requiresLotTracking),
        requiresExpiry: Boolean(body.requiresExpiry),
        controlledSubstance: Boolean(body.controlledSubstance),
      }),
    });
  }

  if (action === "receiveStock") {
    return NextResponse.json({
      data: await receiveInventoryStock({
        tenantId,
        actorRole,
        itemId: String(body.itemId ?? ""),
        vendorId: body.vendorId ? String(body.vendorId) : undefined,
        locationId: String(body.locationId ?? ""),
        lotNumber: body.lotNumber ? String(body.lotNumber) : undefined,
        serialNumber: body.serialNumber ? String(body.serialNumber) : undefined,
        expirationDate: body.expirationDate ? String(body.expirationDate) : undefined,
        quantity: number(body.quantity),
        unitCostCents: cents(body.unitCost),
        reason: body.reason ? String(body.reason) : undefined,
      }),
    });
  }

  if (action === "consumeStock") {
    return NextResponse.json({
      data: await consumeInventoryStock({
        tenantId,
        actorRole,
        itemId: String(body.itemId ?? ""),
        lotId: body.lotId ? String(body.lotId) : undefined,
        quantity: number(body.quantity),
        patientId: body.patientId ? String(body.patientId) : undefined,
        appointmentId: body.appointmentId ? String(body.appointmentId) : undefined,
        procedureCode: body.procedureCode ? String(body.procedureCode) : undefined,
        reason: String(body.reason ?? "Clinical use"),
      }),
    });
  }

  if (action === "createRfp") {
    return NextResponse.json({
      data: await createInventoryRfp({
        tenantId,
        actorRole,
        title: String(body.title ?? ""),
        category: String(body.category ?? "SUPPLIES"),
        releaseMode: String(body.releaseMode ?? "PRIVATE"),
        responseDueAt: body.responseDueAt ? String(body.responseDueAt) : undefined,
        projectedSpendCents: cents(body.projectedSpend),
        itemId: body.itemId ? String(body.itemId) : undefined,
        itemName: String(body.itemName ?? ""),
        quantity: number(body.quantity),
        requirements: body.requirements ? String(body.requirements) : undefined,
      }),
    });
  }

  if (action === "createAsset") {
    return NextResponse.json({
      data: await createInventoryAsset({
        tenantId,
        actorRole,
        vendorId: body.vendorId ? String(body.vendorId) : undefined,
        locationId: body.locationId ? String(body.locationId) : undefined,
        assetTag: String(body.assetTag ?? ""),
        assetName: String(body.assetName ?? ""),
        assetType: String(body.assetType ?? "EQUIPMENT"),
        manufacturer: body.manufacturer ? String(body.manufacturer) : undefined,
        modelNumber: body.modelNumber ? String(body.modelNumber) : undefined,
        serialNumber: body.serialNumber ? String(body.serialNumber) : undefined,
        purchaseCostCents: cents(body.purchaseCost),
        nextMaintenanceAt: body.nextMaintenanceAt ? String(body.nextMaintenanceAt) : undefined,
        downtimeRisk: String(body.downtimeRisk ?? "LOW"),
        notes: body.notes ? String(body.notes) : undefined,
      }),
    });
  }

  return NextResponse.json({ error: "Unsupported inventory action." }, { status: 400 });
}
