import { NextResponse } from "next/server";
import { requireTenant, handleApiError } from "@/lib/tenant";
import { db } from "@/lib/db";
import { recordPaymentSchema } from "@/lib/validations";
import Decimal from "decimal.js";

export async function POST(req: Request) {
  try {
    const { organization, session } = await requireTenant();
    const body = await req.json();

    const validated = recordPaymentSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { invoiceId, amount, paymentDate, paymentMethod, referenceNumber, notes } = validated.data;

    const invoice = await db.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId: organization.id,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot record payment on a cancelled invoice" }, { status: 400 });
    }

    const currentPaid = new Decimal(invoice.paidAmount.toString());
    const grandTotal = new Decimal(invoice.grandTotal.toString());
    const paymentAmount = new Decimal(amount.toString());

    const newPaid = currentPaid.plus(paymentAmount);
    const newBalance = Decimal.max(0, grandTotal.minus(newPaid));

    let newStatus = "PARTIALLY_PAID";
    if (newBalance.lessThanOrEqualTo(0)) {
      newStatus = "PAID";
    }

    const result = await db.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          organizationId: organization.id,
          invoiceId: invoice.id,
          amount: paymentAmount.toNumber(),
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
        },
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaid.toNumber(),
          balanceAmount: newBalance.toNumber(),
          status: newStatus,
        },
        include: {
          payments: true,
          customer: true,
          items: true,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: session.userId,
          action: "PAYMENT_RECORDED",
          entityType: "Payment",
          entityId: payment.id,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            amount: paymentAmount.toNumber(),
            paymentMethod,
          },
        },
      });

      return { payment, invoice: updatedInvoice };
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
