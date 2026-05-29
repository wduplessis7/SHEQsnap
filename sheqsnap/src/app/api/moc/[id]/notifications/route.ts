import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMocNotification } from "@/lib/email";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await prisma.mocNotification.findMany({
    where: { changeRequestId: params.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(notifications);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // body: { notifications: Array<{ type, userId?, firstName, lastName, company?, email?, phone?, discussedTelephonically? }> }

  const change = await prisma.changeRequest.findUnique({ where: { id: params.id } });
  if (!change) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete existing, re-create
  await prisma.mocNotification.deleteMany({ where: { changeRequestId: params.id } });

  const created = [];
  for (const n of body.notifications) {
    const record = await prisma.mocNotification.create({
      data: {
        changeRequestId: params.id,
        type: n.type,
        userId: n.userId || null,
        firstName: n.firstName,
        lastName: n.lastName,
        company: n.company || null,
        email: n.email || null,
        phone: n.phone || null,
        discussedTelephonically: n.discussedTelephonically || false,
        notifiedAt: n.email ? new Date() : null,
      },
    });
    created.push(record);
  }

  // Send emails to all who have an email
  const emailRecipients = body.notifications.filter((n: any) => n.email);
  for (const recipient of emailRecipients) {
    try {
      await sendMocNotification({
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        recipientEmail: recipient.email,
        changeRequest: {
          referenceNo: change.referenceNo,
          title: change.title,
          changeType: change.changeType,
          requestedByName: change.requestedByName,
          description: change.description,
        },
      });
    } catch {
      // Log but don't fail
      console.error(`Failed to send MOC notification email to ${recipient.email}`);
    }
  }

  return NextResponse.json(created);
}
