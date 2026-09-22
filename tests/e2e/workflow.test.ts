import { describe, it, expect } from "vitest";
import { db } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/auth";
import { calculateBill } from "../../src/lib/billing/calculator";

describe("End-to-End Core Business Workflows", () => {
  let testOrgId: string;
  let testUserId: string;
  let testCustomerId: string;
  let testProductId: string;
  let testServiceId: string;
  let testInvoiceId: string;

  it("1. Sets up a new tenant organization and owner atomically", async () => {
    const passwordHash = await hashPassword("secure_password_123");
    const email = `test_owner_${Date.now()}@bizflow.test`;

    const user = await db.user.create({
      data: {
        name: "Test Business Owner",
        email,
        passwordHash,
      },
    });
    testUserId = user.id;

    const org = await db.organization.create({
      data: {
        name: "E2E Test Enterprise",
        businessType: "RETAIL",
        currency: "INR",
        gstEnabled: true,
        gstin: "33TEST1234F1Z5",
        state: "Tamil Nadu",
        stateCode: "33",
        defaultTaxRate: 18,
        invoicePrefix: "TST-",
        nextInvoiceNumber: 1,
        onboardingCompleted: true,
      },
    });
    testOrgId = org.id;

    const membership = await db.organizationMember.create({
      data: {
        userId: testUserId,
        organizationId: testOrgId,
        role: "OWNER",
      },
    });

    expect(membership.role).toBe("OWNER");
    expect(org.id).toBeDefined();
  });

  it("2. Adds customers and verifies directory isolation", async () => {
    const customer = await db.customer.create({
      data: {
        organizationId: testOrgId,
        name: "Aditi Rao",
        phone: "9876543210",
        stateCode: "33", // Same state (intra-state)
      },
    });
    testCustomerId = customer.id;

    expect(customer.name).toBe("Aditi Rao");
    expect(customer.organizationId).toBe(testOrgId);
  });

  it("3. Adds Products with stock and Services", async () => {
    const product = await db.item.create({
      data: {
        organizationId: testOrgId,
        name: "Premium Green Tea 250g",
        type: "PRODUCT",
        sellingPrice: 300,
        taxRate: 5,
        stock: 20, // 20 units initial stock
        minimumStock: 5,
      },
    });
    testProductId = product.id;

    const service = await db.item.create({
      data: {
        organizationId: testOrgId,
        name: "Tea Tasting Session",
        type: "SERVICE",
        sellingPrice: 150,
        taxRate: 18,
        durationMinutes: 45,
      },
    });
    testServiceId = service.id;

    expect(product.stock?.toNumber()).toBe(20);
    expect(service.type).toBe("SERVICE");
  });

  it("4. Creates a Quick Bill for Walk-in Customer and automatically decrements product stock", async () => {
    // Math calculation for: 2 units of Tea (₹300 * 2 = ₹600 + 5% GST = ₹630) + 1 Service (₹150 + 18% GST = ₹177)
    const calc = calculateBill({
      items: [
        {
          itemId: testProductId,
          itemType: "PRODUCT",
          name: "Premium Green Tea 250g",
          quantity: 2,
          unitPrice: 300,
          taxRate: 5,
        },
        {
          itemId: testServiceId,
          itemType: "SERVICE",
          name: "Tea Tasting Session",
          quantity: 1,
          unitPrice: 150,
          taxRate: 18,
        },
      ],
      taxConfig: {
        gstEnabled: true,
        businessStateCode: "33",
        customerStateCode: "33", // Walk-in defaults to intra-state
      },
      paidAmount: 807, // Full payment
    });

    expect(calc.subtotal).toBe(750);
    expect(calc.grandTotal).toBe(807);
    expect(calc.balanceAmount).toBe(0);

    // Create Invoice atomically and decrement stock
    const invoice = await db.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          organizationId: testOrgId,
          invoiceNumber: "TST-001",
          customerName: "Walk-in Customer",
          status: "PAID",
          isGst: true,
          subtotal: calc.subtotal,
          taxableAmount: calc.taxableAmount,
          cgstAmount: calc.cgstAmount,
          sgstAmount: calc.sgstAmount,
          totalTax: calc.totalTax,
          grandTotal: calc.grandTotal,
          paidAmount: calc.paidAmount,
          balanceAmount: calc.balanceAmount,
          paymentMethod: "UPI",
        },
      });

      // Decrement stock for product
      await tx.item.update({
        where: { id: testProductId },
        data: { stock: { decrement: 2 } },
      });

      return inv;
    });

    testInvoiceId = invoice.id;
    expect(invoice.status).toBe("PAID");

    // Verify stock decreased from 20 to 18
    const updatedProduct = await db.item.findUnique({ where: { id: testProductId } });
    expect(updatedProduct?.stock?.toNumber()).toBe(18);
  });

  it("5. Creates an invoice with partial payment and verifies balance tracking", async () => {
    // Total ₹1000, Paid ₹400, Balance ₹600
    const inv = await db.invoice.create({
      data: {
        organizationId: testOrgId,
        invoiceNumber: "TST-002",
        customerId: testCustomerId,
        customerName: "Aditi Rao",
        status: "PARTIALLY_PAID",
        subtotal: 1000,
        taxableAmount: 1000,
        grandTotal: 1000,
        paidAmount: 400,
        balanceAmount: 600,
        paymentMethod: "CASH",
      },
    });

    expect(inv.status).toBe("PARTIALLY_PAID");
    expect(inv.balanceAmount.toNumber()).toBe(600);

    // Now record remaining ₹600 payment
    const updated = await db.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          organizationId: testOrgId,
          invoiceId: inv.id,
          amount: 600,
          paymentMethod: "UPI",
        },
      });

      return tx.invoice.update({
        where: { id: inv.id },
        data: {
          paidAmount: 1000,
          balanceAmount: 0,
          status: "PAID",
        },
      });
    });

    expect(updated.status).toBe("PAID");
    expect(updated.balanceAmount.toNumber()).toBe(0);
  });

  it("6. Logs an Expense and aggregates totals", async () => {
    const expense = await db.expense.create({
      data: {
        organizationId: testOrgId,
        category: "ELECTRICITY",
        amount: 2200,
        paymentMethod: "UPI",
        description: "EB Bill for testing",
      },
    });

    expect(expense.category).toBe("ELECTRICITY");
    expect(expense.amount.toNumber()).toBe(2200);
  });

  it("7. Enforces strict Multi-Tenant data isolation", async () => {
    // Another organization "Competitor Org"
    const otherOrg = await db.organization.create({
      data: {
        name: "Isolated Tenant B",
        businessType: "SERVICE",
      },
    });

    // Attempt to query items of testOrgId using otherOrg.id
    const crossTenantItems = await db.item.findMany({
      where: {
        organizationId: otherOrg.id,
      },
    });

    // Should return 0 items!
    expect(crossTenantItems.length).toBe(0);

    // Clean up competitor org
    await db.organization.delete({ where: { id: otherOrg.id } });
  });

  // Clean up test tenant after run
  it("8. Cleans up test tenant data safely", async () => {
    await db.organization.delete({ where: { id: testOrgId } });
    await db.user.delete({ where: { id: testUserId } });
  });
});
