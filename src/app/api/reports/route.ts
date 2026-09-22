import { NextResponse } from "next/server";
import { requireTenant, handleApiError } from "@/lib/tenant";
import { db } from "@/lib/db";
import { startOfDay, endOfDay, startOfWeek, startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { organization } = await requireTenant();
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "THIS_MONTH"; // TODAY, THIS_WEEK, THIS_MONTH, ALL, CUSTOM
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const now = new Date();
    let gteDate: Date | undefined;
    let lteDate: Date | undefined;

    if (range === "TODAY") {
      gteDate = startOfDay(now);
      lteDate = endOfDay(now);
    } else if (range === "THIS_WEEK") {
      gteDate = startOfWeek(now, { weekStartsOn: 1 });
      lteDate = endOfDay(now);
    } else if (range === "THIS_MONTH") {
      gteDate = startOfMonth(now);
      lteDate = endOfDay(now);
    } else if (range === "CUSTOM" && startDateParam) {
      gteDate = startOfDay(new Date(startDateParam));
      lteDate = endDateParam ? endOfDay(new Date(endDateParam)) : endOfDay(now);
    }

    const dateFilter: Record<string, unknown> = {};
    if (gteDate) dateFilter.gte = gteDate;
    if (lteDate) dateFilter.lte = lteDate;

    const invoiceWhere: Record<string, unknown> = {
      organizationId: organization.id,
      status: { not: "CANCELLED" },
    };
    if (gteDate || lteDate) {
      invoiceWhere.invoiceDate = dateFilter;
    }

    const expenseWhere: Record<string, unknown> = {
      organizationId: organization.id,
    };
    if (gteDate || lteDate) {
      expenseWhere.date = dateFilter;
    }

    const paymentWhere: Record<string, unknown> = {
      organizationId: organization.id,
    };
    if (gteDate || lteDate) {
      paymentWhere.paymentDate = dateFilter;
    }

    const [invoices, expenses, payments, outstandingInvoices] = await Promise.all([
      db.invoice.findMany({
        where: invoiceWhere,
        include: { items: true },
        orderBy: { invoiceDate: "desc" },
      }),
      db.expense.findMany({
        where: expenseWhere,
        orderBy: { date: "desc" },
      }),
      db.payment.findMany({
        where: paymentWhere,
        include: { invoice: { select: { invoiceNumber: true, customerName: true } } },
        orderBy: { paymentDate: "desc" },
      }),
      db.invoice.findMany({
        where: {
          organizationId: organization.id,
          status: { in: ["ISSUED", "PARTIALLY_PAID"] },
          balanceAmount: { gt: 0 },
        },
        orderBy: { balanceAmount: "desc" },
      }),
    ]);

    // Financial calculations
    const totalSales = invoices.reduce((acc, inv) => acc + Number(inv.grandTotal), 0);
    const totalTaxCollected = invoices.reduce((acc, inv) => acc + Number(inv.totalTax), 0);
    const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
    const totalPaymentsReceived = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const totalOutstanding = outstandingInvoices.reduce((acc, inv) => acc + Number(inv.balanceAmount), 0);
    const netProfit = totalSales - totalExpenses;

    // Expenses breakdown by category
    const expenseByCategory: Record<string, number> = {};
    for (const exp of expenses) {
      expenseByCategory[exp.category] = (expenseByCategory[exp.category] || 0) + Number(exp.amount);
    }

    // Top selling items
    const itemSales: Record<string, { name: string; quantity: number; totalRevenue: number }> = {};
    for (const inv of invoices) {
      for (const it of inv.items) {
        const key = it.name;
        if (!itemSales[key]) {
          itemSales[key] = { name: it.name, quantity: 0, totalRevenue: 0 };
        }
        itemSales[key].quantity += Number(it.quantity);
        itemSales[key].totalRevenue += Number(it.totalAmount);
      }
    }

    const topSellingItems = Object.values(itemSales)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      summary: {
        totalSales: Number(totalSales.toFixed(2)),
        totalTaxCollected: Number(totalTaxCollected.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        totalPaymentsReceived: Number(totalPaymentsReceived.toFixed(2)),
        totalOutstanding: Number(totalOutstanding.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
      },
      expenseByCategory,
      topSellingItems,
      invoicesCount: invoices.length,
      expensesCount: expenses.length,
      paymentsCount: payments.length,
      outstandingInvoicesCount: outstandingInvoices.length,
      outstandingInvoices: outstandingInvoices.slice(0, 10),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
