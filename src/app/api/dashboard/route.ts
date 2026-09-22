import { NextResponse } from "next/server";
import { requireTenant, handleApiError } from "@/lib/tenant";
import { db } from "@/lib/db";
import { startOfDay, endOfDay, startOfWeek, startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { organization } = await requireTenant();
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    // 1. Invoices for today, this week, this month
    const [
      todayInvoices,
      weekInvoices,
      monthInvoices,
      allActiveInvoices,
      todayExpenses,
      totalCustomers,
      lowStockProducts,
      recentInvoices,
    ] = await Promise.all([
      // Today sales
      db.invoice.findMany({
        where: {
          organizationId: organization.id,
          invoiceDate: { gte: todayStart, lte: todayEnd },
          status: { not: "CANCELLED" },
        },
        select: { grandTotal: true, paidAmount: true, balanceAmount: true },
      }),
      // Week sales
      db.invoice.findMany({
        where: {
          organizationId: organization.id,
          invoiceDate: { gte: weekStart },
          status: { not: "CANCELLED" },
        },
        select: { grandTotal: true },
      }),
      // Month sales
      db.invoice.findMany({
        where: {
          organizationId: organization.id,
          invoiceDate: { gte: monthStart },
          status: { not: "CANCELLED" },
        },
        select: { grandTotal: true },
      }),
      // Outstanding balance across all active invoices
      db.invoice.findMany({
        where: {
          organizationId: organization.id,
          status: { in: ["ISSUED", "PARTIALLY_PAID"] },
          balanceAmount: { gt: 0 },
        },
        select: { balanceAmount: true },
      }),
      // Today's expenses
      db.expense.findMany({
        where: {
          organizationId: organization.id,
          date: { gte: todayStart, lte: todayEnd },
        },
        select: { amount: true },
      }),
      // Total active customers
      db.customer.count({
        where: {
          organizationId: organization.id,
          isActive: true,
        },
      }),
      // Low stock product items
      db.item.findMany({
        where: {
          organizationId: organization.id,
          type: "PRODUCT",
          isActive: true,
          stock: { not: null },
          minimumStock: { not: null },
        },
        select: { id: true, name: true, stock: true, minimumStock: true, unit: true },
      }),
      // Recent invoices
      db.invoice.findMany({
        where: { organizationId: organization.id },
        orderBy: { invoiceDate: "desc" },
        take: 6,
        select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          grandTotal: true,
          paidAmount: true,
          balanceAmount: true,
          status: true,
          invoiceDate: true,
          paymentMethod: true,
        },
      }),
    ]);

    // Aggregate values
    const todaySalesAmount = todayInvoices.reduce((acc, inv) => acc + Number(inv.grandTotal), 0);
    const weekSalesAmount = weekInvoices.reduce((acc, inv) => acc + Number(inv.grandTotal), 0);
    const monthSalesAmount = monthInvoices.reduce((acc, inv) => acc + Number(inv.grandTotal), 0);
    const totalPendingPayments = allActiveInvoices.reduce((acc, inv) => acc + Number(inv.balanceAmount), 0);
    const todayExpensesAmount = todayExpenses.reduce((acc, exp) => acc + Number(exp.amount), 0);

    const lowStockItems = lowStockProducts.filter(
      (p) => Number(p.stock) <= Number(p.minimumStock)
    );

    // Pending payment invoices (unpaid or partially paid)
    const pendingInvoices = await db.invoice.findMany({
      where: {
        organizationId: organization.id,
        status: { in: ["ISSUED", "PARTIALLY_PAID"] },
        balanceAmount: { gt: 0 },
      },
      orderBy: { invoiceDate: "asc" },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        grandTotal: true,
        balanceAmount: true,
        invoiceDate: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      metrics: {
        todaySales: Number(todaySalesAmount.toFixed(2)),
        weekSales: Number(weekSalesAmount.toFixed(2)),
        monthSales: Number(monthSalesAmount.toFixed(2)),
        pendingPayments: Number(totalPendingPayments.toFixed(2)),
        todayExpenses: Number(todayExpensesAmount.toFixed(2)),
        totalCustomers,
        lowStockCount: lowStockItems.length,
      },
      lowStockItems,
      recentInvoices,
      pendingInvoices,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
