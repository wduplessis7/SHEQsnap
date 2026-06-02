import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const location = await (prisma as any).chemicalLocation.findUnique({
    where: { qrToken: params.token },
    include: {
      chemical: {
        include: {
          sdsDocuments: {
            where: { deletedAt: null, isActive: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!location) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const chemical = location.chemical;

  if (chemical.deletedAt) {
    return NextResponse.json({ error: "Chemical record is no longer active" }, { status: 403 });
  }

  const activeSds = chemical.sdsDocuments?.[0] || null;

  return NextResponse.json({
    locationName: location.locationName,
    buildingArea: location.buildingArea,
    quantity: location.quantity,
    unit: location.unit,
    chemical: {
      name: chemical.name,
      tradeName: chemical.tradeName,
      casNumber: chemical.casNumber,
      ghsPictograms: chemical.ghsPictograms,
      hazardStatements: chemical.hazardStatements,
      precautionaryStatements: chemical.precautionaryStatements,
      signalWord: chemical.signalWord,
      hazardClass: chemical.hazardClass,
      physicalState: chemical.physicalState,
      emergencyContact: chemical.emergencyContact,
      poisonCentre: chemical.poisonCentre,
      flashPoint: chemical.flashPoint,
    },
    activeSds: activeSds
      ? { filename: activeSds.filename, originalName: activeSds.originalName }
      : null,
  });
}
