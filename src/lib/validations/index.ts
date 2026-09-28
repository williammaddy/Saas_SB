import { z } from "zod";

export const BusinessTypeEnum = z.enum([
  "RETAIL",
  "WHOLESALE",
  "SERVICE",
  "SALON",
  "FREELANCER",
  "CONSULTANT",
  "REPAIR",
  "OTHER",
]);

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  businessType: BusinessTypeEnum.default("RETAIL"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const onboardingSchema = z.object({
  // Step 1: Business Profile
  name: z.string().min(2, "Business name is required"),
  businessType: BusinessTypeEnum,
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  // Step 2: Regional Defaults
  country: z.string().default("India"),
  currency: z.string().default("INR"),
  timezone: z.string().default("Asia/Kolkata"),
  dateFormat: z.string().default("DD/MM/YYYY"),
  // Step 3: GST Settings
  gstEnabled: z.boolean().default(false),
  gstin: z.string().optional(),
  stateCode: z.string().optional(),
  defaultTaxRate: z.coerce.number().min(0).max(100).default(0),
});

export const organizationSettingsSchema = onboardingSchema.extend({
  invoicePrefix: z.string().default("INV-"),
  nextInvoiceNumber: z.coerce.number().int().min(1).default(1),
  defaultPaymentTerms: z.string().default("Due on Receipt"),
  invoiceTemplate: z.enum(["CLASSIC", "MODERN", "MINIMAL", "COMPACT"]).default("CLASSIC"),
  brandColor: z.string().default("#4f46e5"),
  showAddress: z.boolean().default(true),
  showContact: z.boolean().default(true),
  showGstin: z.boolean().default(true),
  footerMessage: z.string().optional(),
});

export const invoiceCustomizationSchema = z.object({
  invoiceTemplate: z.enum(["CLASSIC", "MODERN", "MINIMAL", "COMPACT"]).default("CLASSIC"),
  brandColor: z.string().default("#4f46e5"),
  showAddress: z.boolean().default(true),
  showContact: z.boolean().default(true),
  showGstin: z.boolean().default(true),
  footerMessage: z.string().optional(),
  logoUrl: z.string().optional(),
});

export const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  pincode: z.string().optional(),
  gstin: z.string().optional(),
  notes: z.string().optional(),
});

export const itemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  type: z.enum(["PRODUCT", "SERVICE"]).default("PRODUCT"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  sellingPrice: z.coerce.number().min(0, "Selling price must be >= 0"),
  purchasePrice: z.coerce.number().min(0).optional(),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  unit: z.string().default("pcs"),
  durationMinutes: z.coerce.number().int().min(1).optional(),
  stock: z.coerce.number().optional(),
  minimumStock: z.coerce.number().optional(),
  isActive: z.boolean().default(true),
});

export const stockAdjustmentSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  quantityDelta: z.coerce.number().refine((val) => val !== 0, "Adjustment amount cannot be zero"),
  reason: z.enum(["NEW_SHIPMENT", "DAMAGED", "AUDIT_CORRECTION", "EXPIRED", "OTHER"]),
  notes: z.string().optional(),
});

export const invoiceItemInputSchema = z.object({
  itemId: z.string().optional(),
  itemType: z.enum(["PRODUCT", "SERVICE"]).default("PRODUCT"),
  name: z.string().min(1, "Item name is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unit: z.string().default("pcs"),
  unitPrice: z.coerce.number().min(0, "Price must be >= 0"),
  discountAmount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().nullable().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerAddress: z.string().optional(),
  customerGstin: z.string().optional(),
  customerStateCode: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).default("FIXED"),
  discountValue: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "CREDIT", "OTHER"]).default("CASH"),
  paidAmount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(invoiceItemInputSchema).min(1, "Invoice must contain at least one item"),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.coerce.number().positive("Payment amount must be greater than 0"),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"]).default("CASH"),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const expenseSchema = z.object({
  date: z.string().optional(),
  category: z.enum([
    "RENT",
    "SALARY",
    "ELECTRICITY",
    "INTERNET",
    "TRANSPORT",
    "MARKETING",
    "MAINTENANCE",
    "OTHER",
  ]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"]).default("CASH"),
  description: z.string().optional(),
});
