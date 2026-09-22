import { NextResponse } from "next/server";
import { requireTenant, handleApiError } from "@/lib/tenant";
import { db } from "@/lib/db";
import { expenseSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { organization } = await requireTenant();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const whereClause: Record<string, unknown> = {
      organizationId: organization.id,
    };

    if (category && category !== "ALL") {
      whereClause.category = category;
    }

    const expenses = await db.expense.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      take: 100,
    });

    const totalExpenseAmount = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);

    return NextResponse.json({
      success: true,
      expenses,
      totalAmount: Number(totalExpenseAmount.toFixed(2)),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const { organization, session } = await requireTenant();
    const body = await req.json();

    const validated = expenseSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const data = validated.data;

    const expense = await db.expense.create({
      data: {
        organizationId: organization.id,
        date: data.date ? new Date(data.date) : new Date(),
        category: data.category,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        description: data.description || null,
      },
    });

    await db.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: session.userId,
        action: "EXPENSE_CREATED",
        entityType: "Expense",
        entityId: expense.id,
        metadata: { category: expense.category, amount: data.amount },
      },
    });

    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
