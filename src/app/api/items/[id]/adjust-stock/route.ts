import { NextResponse } from "next/server";
import { requireTenant, handleApiError } from "@/lib/tenant";
import { db } from "@/lib/db";
import { stockAdjustmentSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { organization, session } = await requireTenant();
    const body = await req.json();

    const validated = stockAdjustmentSchema.safeParse({
      ...body,
      itemId: params.id,
    });

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { itemId, quantityDelta, reason, notes } = validated.data;

    const existingItem = await db.item.findFirst({
      where: {
        id: itemId,
        organizationId: organization.id,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (existingItem.type !== "PRODUCT") {
      return NextResponse.json(
        { error: "Stock can only be adjusted for physical products" },
        { status: 400 }
      );
    }

    const previousStock = existingItem.stock ? Number(existingItem.stock) : 0;
    const newStock = previousStock + quantityDelta;

    if (newStock < 0) {
      return NextResponse.json(
        { error: `Stock adjustment cannot result in negative stock (current: ${previousStock}, adjustment: ${quantityDelta})` },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const updatedItem = await tx.item.update({
        where: { id: itemId },
        data: { stock: newStock },
      });

      const adjustment = await tx.stockAdjustment.create({
        data: {
          organizationId: organization.id,
          itemId,
          previousStock,
          newStock,
          quantityDelta,
          reason,
          notes: notes || null,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: session.userId,
          action: "STOCK_ADJUSTED",
          entityType: "Item",
          entityId: itemId,
          metadata: {
            itemName: existingItem.name,
            previousStock,
            newStock,
            quantityDelta,
            reason,
          },
        },
      });

      return { item: updatedItem, adjustment };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
