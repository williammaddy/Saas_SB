import { NextResponse } from "next/server";
import { requireTenant, handleApiError } from "@/lib/tenant";
import { db } from "@/lib/db";
import { createInvoiceSchema } from "@/lib/validations";
import { calculateBill } from "@/lib/billing/calculator";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { organization } = await requireTenant();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const status = searchParams.get("status")?.toUpperCase();
    const customerId = searchParams.get("customerId");

    const whereClause: Record<string, unknown> = {
      organizationId: organization.id,
    };

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (customerId) {
      whereClause.customerId = customerId;
    }

    if (query) {
      whereClause.OR = [
        { invoiceNumber: { contains: query, mode: "insensitive" } },
        { customerName: { contains: query, mode: "insensitive" } },
        { customerPhone: { contains: query, mode: "insensitive" } },
      ];
    }

    const invoices = await db.invoice.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        items: true,
        payments: true,
      },
      orderBy: { invoiceDate: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const { organization, session } = await requireTenant();
    const body = await req.json();

    const validated = createInvoiceSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const data = validated.data;

    // 1. Resolve Customer details (Registered or Walk-in)
    let customer = null;
    let customerName = data.customerName || "Walk-in Customer";
    let customerPhone = data.customerPhone || null;
    let customerEmail = data.customerEmail || null;
    let customerAddress = data.customerAddress || null;
    let customerGstin = data.customerGstin || null;
    let customerStateCode = data.customerStateCode || null;

    if (data.customerId) {
      customer = await db.customer.findFirst({
        where: { id: data.customerId, organizationId: organization.id },
      });
      if (customer) {
        customerName = customer.name;
        customerPhone = customer.phone || customerPhone;
        customerEmail = customer.email || customerEmail;
        customerAddress = customer.address || customerAddress;
        customerGstin = customer.gstin || customerGstin;
        customerStateCode = customer.stateCode || customerStateCode;
      }
    }

    // 2. Perform centralized financial & tax calculation
    const calc = calculateBill({
      items: data.items.map((it) => ({
        itemId: it.itemId,
        itemType: it.itemType,
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        discountAmount: it.discountAmount,
        taxRate: organization.gstEnabled ? it.taxRate : 0,
      })),
      taxConfig: {
        gstEnabled: organization.gstEnabled,
        businessStateCode: organization.stateCode,
        customerStateCode: customerStateCode,
      },
      discountType: data.discountType,
      discountValue: data.discountValue,
      paidAmount: data.paidAmount,
    });

    // Determine invoice status
    let status = "ISSUED";
    if (calc.grandTotal > 0) {
      if (calc.paidAmount >= calc.grandTotal) {
        status = "PAID";
      } else if (calc.paidAmount > 0) {
        status = "PARTIALLY_PAID";
      }
    } else {
      status = "PAID";
    }

    // Format invoice number e.g. "INV-001" or "INV-2026-0001"
    const invNumberStr = String(organization.nextInvoiceNumber).padStart(3, "0");
    const invoiceNumber = `${organization.invoicePrefix}${invNumberStr}`;

    // 3. Execute atomic transaction
    const invoice = await db.$transaction(async (tx) => {
      // Create Invoice
      const newInvoice = await tx.invoice.create({
        data: {
          organizationId: organization.id,
          invoiceNumber,
          customerId: customer?.id || null,
          customerName,
          customerPhone,
          customerEmail,
          customerAddress,
          customerGstin,
          customerStateCode,
          invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          status,
          isGst: calc.isGst,
          isInterState: calc.isInterState,
          subtotal: calc.subtotal,
          discountType: calc.discountType,
          discountValue: calc.discountValue,
          discountAmount: calc.discountAmount,
          taxableAmount: calc.taxableAmount,
          cgstAmount: calc.cgstAmount,
          sgstAmount: calc.sgstAmount,
          igstAmount: calc.igstAmount,
          totalTax: calc.totalTax,
          grandTotal: calc.grandTotal,
          paidAmount: calc.paidAmount,
          balanceAmount: calc.balanceAmount,
          paymentMethod: data.paymentMethod,
          notes: data.notes || null,
          terms: data.terms || organization.defaultPaymentTerms || null,
        },
      });

      // Create Invoice Items and decrement inventory for products
      for (const it of calc.items) {
        await tx.invoiceItem.create({
          data: {
            organizationId: organization.id,
            invoiceId: newInvoice.id,
            itemId: it.itemId || null,
            itemType: it.itemType,
            name: it.name,
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitPrice,
            discountAmount: it.discountAmount,
            taxRate: it.taxRate,
            taxableAmount: it.taxableAmount,
            cgstRate: it.cgstRate,
            cgstAmount: it.cgstAmount,
            sgstRate: it.sgstRate,
            sgstAmount: it.sgstAmount,
            igstRate: it.igstRate,
            igstAmount: it.igstAmount,
            totalAmount: it.totalAmount,
          },
        });

        // Automatically decrement stock for Product items
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
                decrement: it.quantity,
              },
            },
          });
        }
      }

      // If initial payment was made, record payment
      if (calc.paidAmount > 0) {
        await tx.payment.create({
          data: {
            organizationId: organization.id,
            invoiceId: newInvoice.id,
            amount: calc.paidAmount,
            paymentDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
            paymentMethod: data.paymentMethod,
            notes: "Initial payment upon billing",
          },
        });
      }

      // Increment next invoice number
      await tx.organization.update({
        where: { id: organization.id },
        data: { nextInvoiceNumber: { increment: 1 } },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: session.userId,
          action: "INVOICE_CREATED",
          entityType: "Invoice",
          entityId: newInvoice.id,
          metadata: {
            invoiceNumber,
            grandTotal: calc.grandTotal,
            customerName,
            status,
          },
        },
      });

      return newInvoice;
    });

    // Fetch complete invoice with relations
    const completeInvoice = await db.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        items: true,
        payments: true,
        organization: true,
        customer: true,
      },
    });

    return NextResponse.json({ success: true, invoice: completeInvoice }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
