import { describe, it, expect } from "vitest";
import { db } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/auth";

describe("Billing, Invoice Customization & Stock Adjustment Workflows", () => {
  let testOrgId: string;
  let testUserId: string;
  let testProductId: string;
  let testInvoiceId: string;

  it("1. Initializes tenant with custom invoice presentation settings", async () => {
    const passwordHash = await hashPassword("password123");
    const user = await db.user.create({
      data: {
        name: "Inventory Manager",
        email: `mgr_${Date.now()}@bizflow.test`,
        passwordHash,
      },
    });
    testUserId = user.id;

    const org = await db.organization.create({
      data: {
        name: "SuperMart Retailers",
        businessType: "RETAIL",
        currency: "INR",
        gstEnabled: true,
        gstin: "27SUPER1234F1Z5",
        invoiceTemplate: "MODERN",
        brandColor: "#059669",
        showAddress: true,
        showContact: true,
        showGstin: true,
        footerMessage: "Thank you for shopping at SuperMart!",
      },
    });
    testOrgId = org.id;

    expect(org.invoiceTemplate).toBe("MODERN");
    expect(org.brandColor).toBe("#059669");
  });

  it("2. Creates a product with SKU and Barcode and adjusts stock (+/-)", async () => {
    const product = await db.item.create({
      data: {
        organizationId: testOrgId,
        name: "Organic Honey 500g",
        type: "PRODUCT",
        sku: "HONEY-500",
        barcode: "8901234567890",
        category: "Groceries",
        sellingPrice: 450,
        purchasePrice: 320,
        taxRate: 5,
        stock: 50,
        minimumStock: 10,
        isActive: true,
      },
    });
    testProductId = product.id;

    expect(product.barcode).toBe("8901234567890");

    // Perform positive stock adjustment (+20 new shipment)
    const adjustmentAdd = await db.$transaction(async (tx) => {
      await tx.item.update({
        where: { id: testProductId },
        data: { stock: { increment: 20 } },
      });

      return tx.stockAdjustment.create({
        data: {
          organizationId: testOrgId,
          itemId: testProductId,
          previousStock: 50,
          newStock: 70,
          quantityDelta: 20,
          reason: "NEW_SHIPMENT",
          notes: "Received batch #9921 from Wholesaler",
        },
      });
    });

    expect(adjustmentAdd.newStock.toNumber()).toBe(70);

    // Verify product stock in DB
    let refreshed = await db.item.findUnique({ where: { id: testProductId } });
    expect(refreshed?.stock?.toNumber()).toBe(70);

    // Perform negative stock adjustment (-5 damaged)
    const adjustmentRemove = await db.$transaction(async (tx) => {
      await tx.item.update({
        where: { id: testProductId },
        data: { stock: { decrement: 5 } },
      });

      return tx.stockAdjustment.create({
        data: {
          organizationId: testOrgId,
          itemId: testProductId,
          previousStock: 70,
          newStock: 65,
          quantityDelta: -5,
          reason: "DAMAGED",
          notes: "Broken jars during transit",
        },
      });
    });

    expect(adjustmentRemove.newStock.toNumber()).toBe(65);
  });

  it("3. Creates an invoice with presentation snapshotting", async () => {
    const org = await db.organization.findUnique({ where: { id: testOrgId } });
    expect(org).toBeDefined();

    const invoice = await db.invoice.create({
      data: {
        organizationId: testOrgId,
        invoiceNumber: "INV-SNAP-001",
        customerName: "Walk-in Customer",
        status: "PAID",
        subtotal: 900,
        taxableAmount: 900,
        grandTotal: 945,
        paidAmount: 945,
        balanceAmount: 0,
        paymentMethod: "CASH",
        // Snapshot organization presentation settings onto the invoice
        templateName: org?.invoiceTemplate || "CLASSIC",
        brandColor: org?.brandColor || "#4f46e5",
        businessName: org?.name,
        businessAddress: org?.address || "123 Main St",
        businessPhone: org?.phone || "9876543210",
        businessEmail: org?.email,
        businessGstin: org?.gstin,
        showAddress: org?.showAddress,
        showContact: org?.showContact,
        showGstin: org?.showGstin,
        footerMessage: org?.footerMessage,
      },
    });
    testInvoiceId = invoice.id;

    expect(invoice.templateName).toBe("MODERN");
    expect(invoice.brandColor).toBe("#059669");
    expect(invoice.footerMessage).toBe("Thank you for shopping at SuperMart!");
  });

  it("4. Verifies historical invoice presentation snapshot is preserved after org settings update", async () => {
    // Business owner updates organization invoice template to "MINIMAL" and brandColor to "#e11d48" next month
    await db.organization.update({
      where: { id: testOrgId },
      data: {
        invoiceTemplate: "MINIMAL",
        brandColor: "#e11d48",
        footerMessage: "New 2027 footer text",
      },
    });

    // Fetch past invoice created previously
    const pastInvoice = await db.invoice.findUnique({ where: { id: testInvoiceId } });

    // Past invoice MUST retain its original presentation snapshot!
    expect(pastInvoice?.templateName).toBe("MODERN");
    expect(pastInvoice?.brandColor).toBe("#059669");
    expect(pastInvoice?.footerMessage).toBe("Thank you for shopping at SuperMart!");
  });

  it("5. Deactivates product (soft delete) and verifies active listing filters out deactivated items", async () => {
    // Soft delete (deactivate) product
    await db.item.update({
      where: { id: testProductId },
      data: { isActive: false },
    });

    // Active items query
    const activeItems = await db.item.findMany({
      where: { organizationId: testOrgId, isActive: true },
    });
    expect(activeItems.length).toBe(0);

    // All items query (includes archived)
    const allItems = await db.item.findMany({
      where: { organizationId: testOrgId },
    });
    expect(allItems.length).toBe(1);
    expect(allItems[0].name).toBe("Organic Honey 500g");
  });

  it("6. Cleans up test tenant safely", async () => {
    await db.organization.delete({ where: { id: testOrgId } });
    await db.user.delete({ where: { id: testUserId } });
  });
});
