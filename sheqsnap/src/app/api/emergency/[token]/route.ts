import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function safeJson(val: string | null | undefined): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const location = await (prisma as any).chemicalLocation.findUnique({
    where: { qrToken: params.token },
    include: {
      chemicalItem: {
        include: {
          sdsDocuments: {
            where: { isActive: true, deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          components: {
            include: { library: true },
          },
        },
      },
    },
  });

  if (!location) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const chemicalItem = location.chemicalItem;

  if (chemicalItem.deletedAt) {
    return NextResponse.json({ error: "Chemical record is no longer active" }, { status: 403 });
  }

  const activeSds = chemicalItem.sdsDocuments?.[0] || null;

  // Parse JSON string arrays on library fields
  const components = (chemicalItem.components || []).map((comp: any) => {
    const lib = comp.library;
    return {
      concentration: comp.concentration,
      notes: comp.notes,
      library: lib
        ? {
            name: lib.name,
            casNumber: lib.casNumber,
            ghsPictograms: safeJson(lib.ghsPictograms),
            signalWord: lib.signalWord,
            hazardStatements: safeJson(lib.hazardStatements),
            precautionaryStatements: safeJson(lib.precautionaryStatements),
          }
        : null,
    };
  });

  return NextResponse.json({
    locationName: location.locationName,
    buildingArea: location.buildingArea,
    quantity: location.quantity,
    unit: location.unit,
    storageConditions: location.storageConditions,
    chemicalItem: {
      productName: chemicalItem.productName,
      tradeName: chemicalItem.tradeName,
      physicalState: chemicalItem.physicalState,
      flashPoint: chemicalItem.flashPoint,
      emergencyContact: chemicalItem.emergencyContact,
      poisonCentre: chemicalItem.poisonCentre,
      isHazardous: chemicalItem.isHazardous,
    },
    activeSds: activeSds
      ? { filename: activeSds.filename, originalName: activeSds.originalName }
      : null,
    components,
  });
}
