export type DiscountType = "PERCENTAGE" | "FIXED";

export interface LineItemInput {
  id?: string;
  itemId?: string;
  name: string;
  itemType?: "PRODUCT" | "SERVICE";
  quantity: number | string;
  unit?: string;
  unitPrice: number | string;
  discountAmount?: number | string;
  taxRate?: number | string; // e.g. 18 for 18%
}

export interface CalculatedLineItem {
  itemId?: string;
  itemType: "PRODUCT" | "SERVICE";
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export interface TaxConfiguration {
  gstEnabled: boolean;
  businessStateCode?: string | null;
  customerStateCode?: string | null;
  defaultTaxRate?: number | string;
}

export interface BillCalculationInput {
  items: LineItemInput[];
  taxConfig: TaxConfiguration;
  discountType?: DiscountType;
  discountValue?: number | string;
  paidAmount?: number | string;
}

export interface BillCalculationResult {
  items: CalculatedLineItem[];
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxableAmount: number;
  isGst: boolean;
  isInterState: boolean;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
}
