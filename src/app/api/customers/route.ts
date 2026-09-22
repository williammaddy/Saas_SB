import { NextResponse } from "next/server";
import { requireTenant, handleApiError } from "@/lib/tenant";
import { db } from "@/lib/db";
import { customerSchema } from "@/lib/validations";
import { getStateCodeFromGstin } from "@/lib/billing/gst";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { organization } = await requireTenant();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();

    const whereClause: Record<string, unknown> = {
      organizationId: organization.id,
      isActive: true,
    };

    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ];
    }

    const customers = await db.customer.findMany({
      where: whereClause,
      include: {
        invoices: {
          select: {
            grandTotal: true,
            paidAmount: true,
            balanceAmount: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate aggregated metrics for each customer
    const customersWithStats = customers.map((cust) => {
      const activeInvoices = cust.invoices.filter((inv) => inv.status !== "CANCELLED");
      const totalSales = activeInvoices.reduce((acc, inv) => acc + Number(inv.grandTotal), 0);
      const totalPaid = activeInvoices.reduce((acc, inv) => acc + Number(inv.paidAmount), 0);
      const outstanding = activeInvoices.reduce((acc, inv) => acc + Number(inv.balanceAmount), 0);

      return {
        id: cust.id,
        name: cust.name,
        phone: cust.phone,
        email: cust.email,
        address: cust.address,
        city: cust.city,
        state: cust.state,
        stateCode: cust.stateCode,
        pincode: cust.pincode,
        gstin: cust.gstin,
        notes: cust.notes,
        totalSales: Number(totalSales.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        outstanding: Number(outstanding.toFixed(2)),
        totalInvoices: activeInvoices.length,
        createdAt: cust.createdAt,
      };
    });

    return NextResponse.json({ success: true, customers: customersWithStats });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
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

    const customer = await db.customer.create({
      data: {
        organizationId: organization.id,
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

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
