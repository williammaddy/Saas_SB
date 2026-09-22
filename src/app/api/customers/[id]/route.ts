import { NextResponse } from "next/server";
import { requireTenant, handleApiError } from "@/lib/tenant";
import { db } from "@/lib/db";
import { customerSchema } from "@/lib/validations";
import { getStateCodeFromGstin } from "@/lib/billing/gst";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { organization } = await requireTenant();
    const customer = await db.customer.findFirst({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
      include: {
        invoices: {
          orderBy: { invoiceDate: "desc" },
          take: 20,
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const activeInvoices = customer.invoices.filter((inv) => inv.status !== "CANCELLED");
    const totalSales = activeInvoices.reduce((acc, inv) => acc + Number(inv.grandTotal), 0);
    const totalPaid = activeInvoices.reduce((acc, inv) => acc + Number(inv.paidAmount), 0);
    const outstanding = activeInvoices.reduce((acc, inv) => acc + Number(inv.balanceAmount), 0);

    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        totalSales: Number(totalSales.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        outstanding: Number(outstanding.toFixed(2)),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { organization } = await requireTenant();
    const body = await req.json();

    const validated = customerSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const data = validated.data;
    let resolvedStateCode = data.stateCode;
    if (data.gstin && !resolvedStateCode) {
      resolvedStateCode = getStateCodeFromGstin(data.gstin) || undefined;
    }

    const updated = await db.customer.updateMany({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
      data: {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        stateCode: resolvedStateCode || null,
        pincode: data.pincode || null,
        gstin: data.gstin ? data.gstin.toUpperCase() : null,
        notes: data.notes || null,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const refreshed = await db.customer.findUnique({ where: { id: params.id } });
    return NextResponse.json({ success: true, customer: refreshed });
  } catch (error) {
    return handleApiError(error);
  }
}
