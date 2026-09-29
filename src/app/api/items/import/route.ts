import { NextResponse } from "next/server";
import { requireTenant, handleApiError } from "@/lib/tenant";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { organization } = await requireTenant();
    const body = await req.json();

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "No items provided for import" },
        { status: 400 }
      );
    }

    const rawItems = body.items;
    let importedCount = 0;
    const errors: string[] = [];

    const validItemsToCreate = [];

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const name = item.name ? String(item.name).trim() : "";
      if (!name) {
        errors.push(`Row ${i + 1}: Missing product/service name`);
        continue;
      }

      const type = item.type && String(item.type).toUpperCase() === "SERVICE" ? "SERVICE" : "PRODUCT";
      const sellingPrice = Number(item.sellingPrice) >= 0 ? Number(item.sellingPrice) : 0;
      const purchasePrice = item.purchasePrice !== undefined && item.purchasePrice !== "" && !isNaN(Number(item.purchasePrice)) ? Number(item.purchasePrice) : null;
      const stock = type === "PRODUCT" && item.stock !== undefined && item.stock !== "" && !isNaN(Number(item.stock)) ? Number(item.stock) : (type === "PRODUCT" ? 0 : null);
      const minimumStock = type === "PRODUCT" && item.minimumStock !== undefined && item.minimumStock !== "" && !isNaN(Number(item.minimumStock)) ? Number(item.minimumStock) : (type === "PRODUCT" ? 0 : null);
      const taxRate = Number(item.taxRate) >= 0 ? Number(item.taxRate) : 0;

      validItemsToCreate.push({
        organizationId: organization.id,
        name,
        type,
        sku: item.sku ? String(item.sku).trim() : null,
        barcode: item.barcode ? String(item.barcode).trim() : null,
        category: item.category ? String(item.category).trim() : null,
        description: item.description ? String(item.description).trim() : null,
        unit: item.unit ? String(item.unit).trim() : (type === "SERVICE" ? "hr" : "pcs"),
        sellingPrice,
        purchasePrice,
        taxRate,
        stock,
        minimumStock,
        isActive: true,
      });
    }

    if (validItemsToCreate.length > 0) {
      await db.item.createMany({
        data: validItemsToCreate,
      });
      importedCount = validItemsToCreate.length;
    }

    return NextResponse.json({
      success: true,
      importedCount,
      totalProcessed: rawItems.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
