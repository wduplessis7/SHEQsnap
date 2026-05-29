import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";
import { deleteFile } from "@/lib/storage";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const attachment = await prisma.attachment.findUnique({ where: { id: params.id } });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (process.env.AWS_REGION) {
    await deleteFile(attachment.filename).catch(() => {});
  } else {
    try {
      const filePath = path.join(process.cwd(), "public", "uploads", path.basename(attachment.filename));
      await unlink(filePath);
    } catch {
      // File might not exist, continue
    }
  }

  await prisma.attachment.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
