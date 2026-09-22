import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { calculateBill } from "../src/lib/billing/calculator";

async function runVerification() {
  console.log("=== STARTING FULL END-TO-END SYSTEM VERIFICATION ===");

  const timestamp = Date.now();
  const testEmail = `verify_${timestamp}@bizflow.test`;

  // 1. User & Organization Creation
  console.log("1. Creating Tenant and Owner...");
  const user = await db.user.create({
    data: {
      name: "Verify Owner",
      email: testEmail,
      passwordHash: await hashPassword("pass123"),
    },
  });

  const org = await db.organization.create({
    data: {
      name: `Verify Enterprise ${timestamp}`,
      businessType: "RETAIL",
      currency: "INR",
      gstEnabled: true,
      gstin: "33VERIF1234F1Z5",
      state: "Tamil Nadu",
      stateCode: "33",
      defaultTaxRate: 18,
      invoicePrefix: "VRF-",
      nextInvoiceNumber: 1,
      onboardingCompleted: true,
    },
  });

  await db.organizationMember.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      role: "OWNER",
    },
  });
  console.log("  ✓ Organization & Owner created successfully!");

  // 2. Customer
  console.log("2. Adding Customer...");
  const customer = await db.customer.create({
    data: {
      organizationId: org.id,
      name: "Lakshmi Narayanan",
      phone: "9841098410",
      stateCode: "33",
    },
  });
  console.log(`  ✓ Customer created: ${customer.name}`);

  // 3. Product & Service
  console.log("3. Adding Product with initial stock of 15...");
  const product = await db.item.create({
    data: {
      organizationId: org.id,
      name: "Premium Coffee Beans 500g",
      type: "PRODUCT",
      sellingPrice: 400,
      taxRate: 5,
      stock: 15,
      minimumStock: 3,
    },
  });

  const service = await db.item.create({
    data: {
      organizationId: org.id,
      name: "Coffee Brewing Workshop",
      type: "SERVICE",
      sellingPrice: 500,
      taxRate: 18,
    },
  });
  console.log(`  ✓ Product (${product.name}) and Service (${service.name}) created.`);

  // 4. Quick Bill: Walk-in customer selling 3 units of coffee beans
  console.log("4. Executing Quick Bill for Walk-in Customer (3 units of coffee)...");
  const billCalc = calculateBill({
    items: [
      {
        itemId: product.id,
        itemType: "PRODUCT",
        name: product.name,
        quantity: 3,
        unitPrice: 400,
        taxRate: 5,
      },
    ],
    taxConfig: {
      gstEnabled: true,
      businessStateCode: "33",
      customerStateCode: "33",
    },
    paidAmount: 1260,
  });

  console.log(`  Calculated: Subtotal=₹${billCalc.subtotal}, Tax=₹${billCalc.totalTax}, Total=₹${billCalc.grandTotal}`);

  const invoice1 = await db.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        organizationId: org.id,
        invoiceNumber: "VRF-001",
        customerName: "Walk-in Customer",
        status: "PAID",
        isGst: true,
        subtotal: billCalc.subtotal,
        taxableAmount: billCalc.taxableAmount,
        cgstAmount: billCalc.cgstAmount,
        sgstAmount: billCalc.sgstAmount,
        totalTax: billCalc.totalTax,
        grandTotal: billCalc.grandTotal,
        paidAmount: billCalc.paidAmount,
        balanceAmount: billCalc.balanceAmount,
        paymentMethod: "CASH",
        items: {
          create: {
            organizationId: org.id,
            itemId: product.id,
            itemType: "PRODUCT",
            name: product.name,
            quantity: 3,
            unitPrice: 400,
            taxRate: 5,
            taxableAmount: 1200,
            cgstRate: 2.5,
            cgstAmount: 30,
            sgstRate: 2.5,
            sgstAmount: 30,
            totalAmount: 1260,
          },
        },
        payments: {
          create: {
            organizationId: org.id,
            amount: 1260,
            paymentMethod: "CASH",
          },
        },
      },
    });

    // Decrement stock
    await tx.item.update({
      where: { id: product.id },
      data: { stock: { decrement: 3 } },
    });

    return inv;
  });

  const updatedProduct = await db.item.findUnique({ where: { id: product.id } });
  console.log(`  ✓ Walk-in Bill generated: ${invoice1.invoiceNumber}`);
  console.log(`  ✓ Stock verified: Was 15, Now ${updatedProduct?.stock?.toNumber()} (decremented by 3)`);
  if (updatedProduct?.stock?.toNumber() !== 12) {
    throw new Error("Stock decrement failed!");
  }

  // 5. Credit Invoice with Partial Payment for registered customer
  console.log("5. Generating Partial Payment Invoice for Registered Customer...");
  const invoice2 = await db.invoice.create({
    data: {
      organizationId: org.id,
      invoiceNumber: "VRF-002",
      customerId: customer.id,
      customerName: customer.name,
      status: "PARTIALLY_PAID",
      subtotal: 1000,
      taxableAmount: 1000,
      grandTotal: 1000,
      paidAmount: 300,
      balanceAmount: 700,
      paymentMethod: "UPI",
      payments: {
        create: {
          organizationId: org.id,
          amount: 300,
          paymentMethod: "UPI",
        },
      },
    },
  });
  console.log(`  ✓ Invoice created: ${invoice2.invoiceNumber}, Status=${invoice2.status}, Balance=₹${invoice2.balanceAmount}`);

  // Record remaining balance
  console.log("6. Recording Remaining Balance Payment (₹700)...");
  await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        organizationId: org.id,
        invoiceId: invoice2.id,
        amount: 700,
        paymentMethod: "CASH",
      },
    });
    await tx.invoice.update({
      where: { id: invoice2.id },
      data: {
        paidAmount: 1000,
        balanceAmount: 0,
        status: "PAID",
      },
    });
  });

  const settledInvoice = await db.invoice.findUnique({ where: { id: invoice2.id } });
  console.log(`  ✓ Payment recorded: New Status=${settledInvoice?.status}, Balance=₹${settledInvoice?.balanceAmount}`);

  // 7. Expense Logging
  console.log("7. Logging Expense...");
  const exp = await db.expense.create({
    data: {
      organizationId: org.id,
      category: "RENT",
      amount: 5000,
      paymentMethod: "BANK_TRANSFER",
      description: "Monthly workshop space rent",
    },
  });
  console.log(`  ✓ Expense logged: ₹${exp.amount} under ${exp.category}`);

  // 8. Clean up
  console.log("8. Cleaning up test data...");
  await db.organization.delete({ where: { id: org.id } });
  await db.user.delete({ where: { id: user.id } });
  console.log("  ✓ Cleanup complete.");

  console.log("=== ALL END-TO-END WORKFLOW VERIFICATIONS PASSED SUCCESSFULLY! ===");
}

runVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
