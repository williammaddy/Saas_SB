import { NextResponse } from "next/server";
import { requireTenant, handleApiError } from "@/lib/tenant";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { organization } = await requireTenant();
    const invoice = await db.invoice.findFirst({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
      include: {
        items: true,
        payments: {
          orderBy: { paymentDate: "desc" },
        },
        organization: true,
        customer: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    return handleApiError(error);
  }
}

// Cancel or Void Invoice (restores product inventory)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { organization, session } = await requireTenant();
    const body = await req.json();
    const action = body.action; // "CANCEL"

    if (action !== "CANCEL") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    const invoice = await db.invoice.findFirst({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
      include: {
        items: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "CANCELLED") {
      return NextResponse.json({ error: "Invoice is already cancelled" }, { status: 400 });
    }

    // Execute cancellation and restore inventory stock in a transaction
    await db.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "CANCELLED" },
      });

      // Restore inventory stock for product items
      for (const it of invoice.items) {
        if (it.itemId && it.itemType === "PRODUCT") {
          await tx.item.updateMany({
            where: {
              id: it.itemId,
              organizationId: organization.id,
              type: "PRODUCT",
              stock: { not: null },
            },
            data: {
              stock: {
                increment: it.quantity,
              },
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: session.userId,
          action: "INVOICE_CANCELLED",
          entityType: "Invoice",
          entityId: invoice.id,
          metadata: { invoiceNumber: invoice.invoiceNumber },
        },
      });
    });

    const updated = await db.invoice.findUnique({
      where: { id: invoice.id },
      include: { items: true, payments: true },
    });

    return NextResponse.json({ success: true, invoice: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
