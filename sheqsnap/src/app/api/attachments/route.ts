import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const nearMissId = formData.get("nearMissId") as string | null;
  const incidentId = formData.get("incidentId") as string | null;
  const actionId = formData.get("actionId") as string | null;

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const ext = path.extname(file.name);
  const filename = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const attachment = await prisma.attachment.create({
    data: {
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedById: user.id,
      nearMissId: nearMissId || null,
      incidentId: incidentId || null,
      actionId: actionId || null,
    },
    include: {
      uploadedBy: { select: { name: true } },
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}
