import { NextResponse } from "next/server";
import { requireTenant, handleApiError } from "@/lib/tenant";
import { db } from "@/lib/db";
import { itemSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { organization } = await requireTenant();
    const item = await db.item.findFirst({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, item });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const updated = await db.item.updateMany({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
      data: {
        name: data.name,
        type: data.type,
        sku: data.sku || null,
        barcode: data.barcode || null,
        category: data.category || null,
        description: data.description || null,
        sellingPrice: data.sellingPrice,
        purchasePrice: data.purchasePrice !== undefined ? data.purchasePrice : null,
        taxRate: data.taxRate,
        unit: data.unit,
        durationMinutes: data.type === "SERVICE" ? data.durationMinutes || null : null,
        stock: data.type === "PRODUCT" ? data.stock ?? 0 : null,
        minimumStock: data.type === "PRODUCT" ? data.minimumStock ?? 0 : null,
        isActive: data.isActive ?? true,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await db.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: session.userId,
        action: "ITEM_UPDATED",
        entityType: "Item",
        entityId: params.id,
      },
    });

    const refreshed = await db.item.findUnique({ where: { id: params.id } });
    return NextResponse.json({ success: true, item: refreshed });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { organization, session } = await requireTenant();

    const updated = await db.item.updateMany({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
      data: {
        isActive: false,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await db.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: session.userId,
        action: "ITEM_DEACTIVATED",
        entityType: "Item",
        entityId: params.id,
      },
    });

    return NextResponse.json({ success: true, message: "Item deactivated" });
  } catch (error) {
    return handleApiError(error);
  }
}
