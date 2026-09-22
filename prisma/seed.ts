import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with realistic small business data...");

  // Check if demo user already exists
  const existing = await prisma.user.findUnique({
    where: { email: "demo@bizflow.app" },
  });

  if (existing) {
    console.log("Demo user already exists, skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 12);

  // 1. Create User
  const user = await prisma.user.create({
    data: {
      email: "demo@bizflow.app",
      name: "Suresh Sundaram",
      passwordHash,
      phone: "9876543210",
    },
  });

  // 2. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: "Surya Retail & Grooming Lounge",
      businessType: "RETAIL",
      phone: "044-24567890",
      email: "contact@suryaretail.com",
      address: "Shop No. 14, Grand Southern Trunk Road",
      city: "Chennai",
      state: "Tamil Nadu",
      stateCode: "33",
      pincode: "600028",
      country: "India",
      currency: "INR",
      timezone: "Asia/Kolkata",
      dateFormat: "DD/MM/YYYY",
      gstEnabled: true,
      gstin: "33ABCDE1234F1Z5",
      defaultTaxRate: 18,
      invoicePrefix: "INV-",
      nextInvoiceNumber: 4,
      defaultPaymentTerms: "Due on Receipt. Thank you for your visit!",
      onboardingCompleted: true,
    },
  });

  // 3. Member
  await prisma.organizationMember.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      role: "OWNER",
    },
  });

  // 4. Products & Services
  const coconutOil = await prisma.item.create({
    data: {
      organizationId: org.id,
      name: "Cold Pressed Coconut Oil 500ml",
      type: "PRODUCT",
      sku: "OIL-COC-500",
      category: "Groceries",
      sellingPrice: 180,
      purchasePrice: 130,
      taxRate: 5,
      unit: "bottle",
      stock: 25,
      minimumStock: 5,
    },
  });

  const herbalSoap = await prisma.item.create({
    data: {
      organizationId: org.id,
      name: "Ayurvedic Neem Soap 100g",
      type: "PRODUCT",
      sku: "SOAP-NEEM-100",
      category: "Personal Care",
      sellingPrice: 65,
      purchasePrice: 40,
      taxRate: 18,
      unit: "bar",
      stock: 50,
      minimumStock: 10,
    },
  });

  const faceWash = await prisma.item.create({
    data: {
      organizationId: org.id,
      name: "Sandalwood Herbal Face Wash",
      type: "PRODUCT",
      sku: "FACE-SND-150",
      category: "Personal Care",
      sellingPrice: 240,
      purchasePrice: 160,
      taxRate: 18,
      unit: "tube",
      stock: 3, // Low stock trigger!
      minimumStock: 5,
    },
  });

  const haircutService = await prisma.item.create({
    data: {
      organizationId: org.id,
      name: "Premium Haircut & Wash",
      type: "SERVICE",
      category: "Salon Services",
      sellingPrice: 250,
      taxRate: 18,
      unit: "session",
      durationMinutes: 30,
    },
  });

  const beardService = await prisma.item.create({
    data: {
      organizationId: org.id,
      name: "Beard Trim & Hot Towel Styling",
      type: "SERVICE",
      category: "Salon Services",
      sellingPrice: 150,
      taxRate: 18,
      unit: "session",
      durationMinutes: 20,
    },
  });

  // 5. Customers
  const customer1 = await prisma.customer.create({
    data: {
      organizationId: org.id,
      name: "Karthik Raja",
      phone: "9840123456",
      email: "karthik.raja@gmail.com",
      address: "12/4 Anna Nagar 2nd Avenue",
      city: "Chennai",
      state: "Tamil Nadu",
      stateCode: "33",
      pincode: "600040",
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      organizationId: org.id,
      name: "Priya Sundaram",
      phone: "9884567890",
      email: "priya.s@yahoo.com",
      city: "Chennai",
      state: "Tamil Nadu",
      stateCode: "33",
    },
  });

  // 6. Invoices
  // Invoice 1: Walk-in customer, fully paid
  const inv1 = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      invoiceNumber: "INV-001",
      customerName: "Walk-in Customer",
      invoiceDate: new Date(),
      status: "PAID",
      isGst: true,
      isInterState: false,
      subtotal: 400,
      discountType: "FIXED",
      discountValue: 0,
      discountAmount: 0,
      taxableAmount: 400,
      cgstAmount: 36,
      sgstAmount: 36,
      igstAmount: 0,
      totalTax: 72,
      grandTotal: 472,
      paidAmount: 472,
      balanceAmount: 0,
      paymentMethod: "UPI",
      items: {
        create: [
          {
            organizationId: org.id,
            itemId: haircutService.id,
            itemType: "SERVICE",
            name: haircutService.name,
            quantity: 1,
            unit: "session",
            unitPrice: 250,
            discountAmount: 0,
            taxRate: 18,
            taxableAmount: 250,
            cgstRate: 9,
            cgstAmount: 22.5,
            sgstRate: 9,
            sgstAmount: 22.5,
            totalAmount: 295,
          },
          {
            organizationId: org.id,
            itemId: beardService.id,
            itemType: "SERVICE",
            name: beardService.name,
            quantity: 1,
            unit: "session",
            unitPrice: 150,
            discountAmount: 0,
            taxRate: 18,
            taxableAmount: 150,
            cgstRate: 9,
            cgstAmount: 13.5,
            sgstRate: 9,
            sgstAmount: 13.5,
            totalAmount: 177,
          },
        ],
      },
      payments: {
        create: {
          organizationId: org.id,
          amount: 472,
          paymentMethod: "UPI",
          referenceNumber: "UPI-4098239012",
        },
      },
    },
  });

  // Invoice 2: Karthik Raja, partially paid (leaves outstanding balance)
  const inv2 = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      invoiceNumber: "INV-002",
      customerId: customer1.id,
      customerName: customer1.name,
      customerPhone: customer1.phone,
      customerEmail: customer1.email,
      customerAddress: customer1.address,
      customerStateCode: customer1.stateCode,
      invoiceDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      status: "PARTIALLY_PAID",
      isGst: true,
      isInterState: false,
      subtotal: 730,
      discountType: "FIXED",
      discountValue: 30,
      discountAmount: 30,
      taxableAmount: 700,
      cgstAmount: 45,
      sgstAmount: 45,
      igstAmount: 0,
      totalTax: 90,
      grandTotal: 790,
      paidAmount: 400,
      balanceAmount: 390,
      paymentMethod: "CASH",
      items: {
        create: [
          {
            organizationId: org.id,
            itemId: coconutOil.id,
            itemType: "PRODUCT",
            name: coconutOil.name,
            quantity: 2,
            unit: "bottle",
            unitPrice: 180,
            taxRate: 5,
            taxableAmount: 360,
            cgstRate: 2.5,
            cgstAmount: 9,
            sgstRate: 2.5,
            sgstAmount: 9,
            totalAmount: 378,
          },
          {
            organizationId: org.id,
            itemId: herbalSoap.id,
            itemType: "PRODUCT",
            name: herbalSoap.name,
            quantity: 2,
            unit: "bar",
            unitPrice: 65,
            taxRate: 18,
            taxableAmount: 130,
            cgstRate: 9,
            cgstAmount: 11.7,
            sgstRate: 9,
            sgstAmount: 11.7,
            totalAmount: 153.4,
          },
          {
            organizationId: org.id,
            itemId: haircutService.id,
            itemType: "SERVICE",
            name: haircutService.name,
            quantity: 1,
            unit: "session",
            unitPrice: 250,
            taxRate: 18,
            taxableAmount: 250,
            cgstRate: 9,
            cgstAmount: 22.5,
            sgstRate: 9,
            sgstAmount: 22.5,
            totalAmount: 295,
          },
        ],
      },
      payments: {
        create: {
          organizationId: org.id,
          amount: 400,
          paymentMethod: "CASH",
          notes: "Partial payment on purchase",
        },
      },
    },
  });

  // 7. Expenses
  await prisma.expense.createMany({
    data: [
      {
        organizationId: org.id,
        category: "RENT",
        amount: 12000,
        paymentMethod: "BANK_TRANSFER",
        description: "Monthly store premises rent",
      },
      {
        organizationId: org.id,
        category: "ELECTRICITY",
        amount: 1850,
        paymentMethod: "UPI",
        description: "TNEB commercial bill",
      },
      {
        organizationId: org.id,
        category: "MAINTENANCE",
        amount: 750,
        paymentMethod: "CASH",
        description: "Water filter servicing and cleaning items",
      },
    ],
  });

  console.log("Seeding finished successfully!");
  console.log("Demo Login Credentials:");
  console.log("Email: demo@bizflow.app");
  console.log("Password: password123");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
