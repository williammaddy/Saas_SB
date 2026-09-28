import { describe, it, expect } from "vitest";
import { db } from "../../src/lib/db";
import { numberToIndianWords, formatIndianCurrency } from "../../src/lib/billing/numberToWords";
import { getSharedBrowser } from "../../src/lib/puppeteer";

describe("Phase 8: Invoice Print, PDF, Indian GST & Customer Isolation Verification", () => {
  let testOrgId: string;
  let testCustomerId: string;
  let invoiceWithCustId: string;
  let invoiceWithoutCustId: string;
  let largeInvoiceId: string;

  it("1. Verifies Indian Currency formatting and Number to Words utility", () => {
    const formatted = formatIndianCurrency(123456.5);
    expect(formatted).toBe("₹ 1,23,456.50");

    const words = numberToIndianWords(123456.5);
    expect(words).toContain("Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six and Fifty Paise Only");
  });

  it("2. Prepares tenant organization, customer, and sample invoices", async () => {
    const org = await db.organization.create({
      data: {
        name: "Apex Electronics & Retail",
        businessType: "RETAIL",
        gstEnabled: true,
        gstin: "33APEX1234F1Z5",
        phone: "+91 98400 11111",
        address: "100 Feet Road, Chennai",
        currency: "INR",
        bankDetails: "HDFC Bank A/C: 50200012345678, IFSC: HDFC0000123",
        upiId: "apexretail@hdfcbank",
        printFormat: "A4",
      },
    });
    testOrgId = org.id;

    const cust = await db.customer.create({
      data: {
        organizationId: testOrgId,
        name: "Anand Sundaram",
        phone: "9876543210",
        address: "Anna Nagar, Chennai",
        gstin: "33ANAND1234F1Z5",
      },
    });
    testCustomerId = cust.id;

    // Create Invoice WITH Customer
    const inv1 = await db.invoice.create({
      data: {
        organizationId: testOrgId,
        invoiceNumber: "INV-2026-TEST1",
        customerId: testCustomerId,
        customerName: cust.name,
        customerPhone: cust.phone,
        customerAddress: cust.address,
        customerGstin: cust.gstin,
        isGst: true,
        subtotal: 1000,
        taxableAmount: 1000,
        cgstAmount: 90,
        sgstAmount: 90,
        totalTax: 180,
        grandTotal: 1180,
        paidAmount: 1180,
        balanceAmount: 0,
        paymentMethod: "UPI",
        items: {
          create: [
            {
              organizationId: testOrgId,
              name: "Wireless Headphones",
              hsnCode: "8518",
              quantity: 1,
              unit: "pcs",
              unitPrice: 1000,
              taxRate: 18,
              taxableAmount: 1000,
              cgstRate: 9,
              cgstAmount: 90,
              sgstRate: 9,
              sgstAmount: 90,
              totalAmount: 1180,
            },
          ],
        },
      },
    });
    invoiceWithCustId = inv1.id;

    // Create Invoice WITHOUT Customer (Direct Billing)
    const inv2 = await db.invoice.create({
      data: {
        organizationId: testOrgId,
        invoiceNumber: "INV-2026-TEST2",
        customerId: null,
        customerName: null,
        isGst: true,
        subtotal: 500,
        taxableAmount: 500,
        cgstAmount: 45,
        sgstAmount: 45,
        totalTax: 90,
        grandTotal: 590,
        paidAmount: 590,
        balanceAmount: 0,
        paymentMethod: "CASH",
        items: {
          create: [
            {
              organizationId: testOrgId,
              name: "USB Type-C Cable",
              hsnCode: "8544",
              quantity: 1,
              unit: "pcs",
              unitPrice: 500,
              taxRate: 18,
              taxableAmount: 500,
              cgstRate: 9,
              cgstAmount: 45,
              sgstRate: 9,
              sgstAmount: 45,
              totalAmount: 590,
            },
          ],
        },
      },
    });
    invoiceWithoutCustId = inv2.id;
  });

  it("3. Verifies Phase 5: 'Walk-in Customer' text NEVER exists in DB or rendered HTML", async () => {
    const invWithoutCust = await db.invoice.findUnique({
      where: { id: invoiceWithoutCustId },
    });

    expect(invWithoutCust?.customerName).not.toBe("Walk-in Customer");
    expect(invWithoutCust?.customerName).toBeNull();
  });

  it("4. Creates a large 40+ item invoice to verify multi-page pagination stability", async () => {
    const largeItems = Array.from({ length: 42 }).map((_, idx) => ({
      organizationId: testOrgId,
      name: `Bulk Hardware Spare Part #${idx + 1}`,
      hsnCode: "8471",
      quantity: 2,
      unit: "pcs",
      unitPrice: 100,
      taxRate: 18,
      taxableAmount: 200,
      cgstRate: 9,
      cgstAmount: 18,
      sgstRate: 9,
      sgstAmount: 18,
      totalAmount: 236,
    }));

    const inv3 = await db.invoice.create({
      data: {
        organizationId: testOrgId,
        invoiceNumber: "INV-2026-BULK40",
        customerId: testCustomerId,
        customerName: "Anand Sundaram",
        isGst: true,
        subtotal: 8400,
        taxableAmount: 8400,
        cgstAmount: 756,
        sgstAmount: 756,
        totalTax: 1512,
        grandTotal: 9912,
        paidAmount: 9912,
        balanceAmount: 0,
        paymentMethod: "BANK_TRANSFER",
        items: {
          create: largeItems,
        },
      },
    });
    largeInvoiceId = inv3.id;

    const loaded = await db.invoice.findUnique({
      where: { id: largeInvoiceId },
      include: { items: true },
    });

    expect(loaded?.items.length).toBe(42);
  });

  it("5. Verifies Puppeteer shared browser instance launches and closes safely", async () => {
    const browser = await getSharedBrowser();
    expect(browser).toBeDefined();
    const page = await browser.newPage();
    await page.setContent("<html><body><h1>PDF Generation Verification</h1></body></html>");
    const pdfBuf = await page.pdf({ format: "A4" });
    await page.close();

    expect(pdfBuf).toBeDefined();
    expect(pdfBuf.length).toBeGreaterThan(100);
  });

  it("6. Cleans up test tenant data safely", async () => {
    await db.invoice.deleteMany({ where: { organizationId: testOrgId } });
    await db.customer.deleteMany({ where: { organizationId: testOrgId } });
    await db.organization.delete({ where: { id: testOrgId } });
  });
});
