import { NextResponse } from "next/server";
import { requireTenant, handleApiError } from "@/lib/tenant";
import { db } from "@/lib/db";
import { itemSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { organization } = await requireTenant();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const type = searchParams.get("type")?.toUpperCase();
    const lowStockOnly = searchParams.get("lowStock") === "true";

    const whereClause: Record<string, unknown> = {
      organizationId: organization.id,
      isActive: true,
    };

    if (type === "PRODUCT" || type === "SERVICE") {
      whereClause.type = type;
    }

    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
      ];
    }

    const items = await db.item.findMany({
      where: whereClause,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    // If low stock requested, filter items where stock <= minimumStock
    let resultItems = items;
    if (lowStockOnly) {
      resultItems = items.filter(
        (it) =>
          it.type === "PRODUCT" &&
          it.stock !== null &&
          it.minimumStock !== null &&
          Number(it.stock) <= Number(it.minimumStock)
      );
    }

    return NextResponse.json({ success: true, items: resultItems });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const { organization, session } = await requireTenant();
    const body = await req.json();

    const validated = itemSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const data = validated.data;

    const item = await db.item.create({
      data: {
        organizationId: organization.id,
        name: data.name,
        type: data.type,
        sku: data.sku || null,
        category: data.category || null,
        description: data.description || null,
        sellingPrice: data.sellingPrice,
        purchasePrice: data.purchasePrice !== undefined ? data.purchasePrice : null,
        taxRate: data.taxRate,
        unit: data.unit || (data.type === "SERVICE" ? "hr" : "pcs"),
        durationMinutes: data.type === "SERVICE" ? data.durationMinutes || null : null,
        stock: data.type === "PRODUCT" ? data.stock ?? 0 : null,
        minimumStock: data.type === "PRODUCT" ? data.minimumStock ?? 0 : null,
      },
    });

    await db.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: session.userId,
        action: "ITEM_CREATED",
        entityType: "Item",
        entityId: item.id,
        metadata: { name: item.name, type: item.type },
      },
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
