import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const components = await (prisma as any).chemicalItemComponent.findMany({
    where: { chemicalItemId: params.id },
    include: { library: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(components);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  // Verify item exists
  const item = await (prisma as any).chemicalItem.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "Chemical item not found" }, { status: 404 });

  let libraryId = body.libraryId;

  if (!libraryId) {
    // If CAS number provided, check for existing library entry first
    if (body.casNumber) {
      const existing = await (prisma as any).chemicalLibrary.findUnique({ where: { casNumber: body.casNumber } });
      if (existing) {
        libraryId = existing.id;
      }
    }
    if (!libraryId) {
      if (!body.name || !body.name.trim()) {
        return NextResponse.json({ error: "Chemical name is required" }, { status: 400 });
      }
      const lib = await (prisma as any).chemicalLibrary.create({
        data: {
          name: body.name,
          casNumber: body.casNumber || null,
          formula: body.formula || null,
          ghsPictograms: JSON.stringify(body.ghsPictograms || []),
          hazardClass: body.hazardClass || null,
          signalWord: body.signalWord || null,
          hazardStatements: JSON.stringify(body.hazardStatements || []),
          precautionaryStatements: JSON.stringify(body.precautionaryStatements || []),
          pubchemCid: body.pubchemCid || null,
        },
      });
      libraryId = lib.id;
    }
  }

  const duplicate = await (prisma as any).chemicalItemComponent.findUnique({
    where: { chemicalItemId_libraryId: { chemicalItemId: params.id, libraryId } },
  });
  if (duplicate) return NextResponse.json({ error: "This chemical is already added to this item." }, { status: 409 });

  const component = await (prisma as any).chemicalItemComponent.create({
    data: {
      chemicalItemId: params.id,
      libraryId,
      concentration: body.concentration || null,
      notes: body.notes || null,
    },
    include: { library: true },
  });

  await writeAuditLog("ChemicalItem", params.id, "COMPONENT_ADD", user.id, {
    componentId: component.id,
    libraryId,
  });

  return NextResponse.json(component, { status: 201 });
}
