import Decimal from "decimal.js";
import {
  BillCalculationInput,
  BillCalculationResult,
  CalculatedLineItem,
  LineItemInput,
} from "./types";
import { isInterStateTransaction } from "./gst";

// Configure Decimal precision and rounding mode (ROUND_HALF_UP is financial standard)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

function toDecimal(value: number | string | undefined | null, fallback = "0"): Decimal {
  if (value === undefined || value === null || value === "") return new Decimal(fallback);
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(fallback);
  }
}

function roundTo2(d: Decimal): number {
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Calculates a single line item with taxes and discounts
 */
export function calculateLineItem(
  item: LineItemInput,
  gstEnabled: boolean,
  isInterState: boolean
): CalculatedLineItem {
  const qty = toDecimal(item.quantity, "1");
  const price = toDecimal(item.unitPrice, "0");
  const itemDiscount = toDecimal(item.discountAmount, "0");

  // Gross line amount before discounts
  const gross = qty.times(price);

  // Net taxable amount after item-level discount (cannot be negative)
  const taxable = Decimal.max(0, gross.minus(itemDiscount));

  let taxRate = new Decimal(0);
  let cgstRate = new Decimal(0);
  let cgstAmount = new Decimal(0);
  let sgstRate = new Decimal(0);
  let sgstAmount = new Decimal(0);
  let igstRate = new Decimal(0);
  let igstAmount = new Decimal(0);
  let totalTax = new Decimal(0);

  if (gstEnabled) {
    taxRate = toDecimal(item.taxRate, "0");

    if (taxRate.greaterThan(0)) {
      if (isInterState) {
        // Inter-state: Full tax goes to IGST
        igstRate = taxRate;
        igstAmount = taxable.times(igstRate).dividedBy(100);
        totalTax = igstAmount;
      } else {
        // Intra-state: Split equally between CGST and SGST
        cgstRate = taxRate.dividedBy(2);
        sgstRate = taxRate.dividedBy(2);
        cgstAmount = taxable.times(cgstRate).dividedBy(100);
        sgstAmount = taxable.times(sgstRate).dividedBy(100);
        totalTax = cgstAmount.plus(sgstAmount);
      }
    }
  }

  const total = taxable.plus(totalTax);

  return {
    itemId: item.itemId,
    itemType: item.itemType || "PRODUCT",
    name: item.name,
    quantity: roundTo2(qty),
    unit: item.unit || "pcs",
    unitPrice: roundTo2(price),
    discountAmount: roundTo2(itemDiscount),
    taxRate: roundTo2(taxRate),
    taxableAmount: roundTo2(taxable),
    cgstRate: roundTo2(cgstRate),
    cgstAmount: roundTo2(cgstAmount),
    sgstRate: roundTo2(sgstRate),
    sgstAmount: roundTo2(sgstAmount),
    igstRate: roundTo2(igstRate),
    igstAmount: roundTo2(igstAmount),
    totalTax: roundTo2(totalTax),
    totalAmount: roundTo2(total),
  };
}

/**
 * Calculates entire bill totals including bill-level discounts,
 * taxes, and balance tracking.
 */
export function calculateBill(input: BillCalculationInput): BillCalculationResult {
  const { items, taxConfig, discountType = "FIXED", discountValue = 0, paidAmount = 0 } = input;

  const gstEnabled = Boolean(taxConfig.gstEnabled);
  const isInterState = gstEnabled
    ? isInterStateTransaction(taxConfig.businessStateCode, taxConfig.customerStateCode)
    : false;

  // 1. Calculate each line item
  const calculatedItems: CalculatedLineItem[] = items.map((item) =>
    calculateLineItem(item, gstEnabled, isInterState)
  );

  // 2. Sum gross items
  let subtotalDec = new Decimal(0);
  let totalItemTaxDec = new Decimal(0);
  let totalItemTaxableDec = new Decimal(0);
  let cgstTotalDec = new Decimal(0);
  let sgstTotalDec = new Decimal(0);
  let igstTotalDec = new Decimal(0);

  for (const it of calculatedItems) {
    subtotalDec = subtotalDec.plus(toDecimal(it.quantity).times(toDecimal(it.unitPrice)));
    totalItemTaxableDec = totalItemTaxableDec.plus(it.taxableAmount);
    cgstTotalDec = cgstTotalDec.plus(it.cgstAmount);
    sgstTotalDec = sgstTotalDec.plus(it.sgstAmount);
    igstTotalDec = igstTotalDec.plus(it.igstAmount);
    totalItemTaxDec = totalItemTaxDec.plus(it.totalTax);
  }

  // 3. Compute bill-level discount
  const discountValDec = toDecimal(discountValue, "0");
  let billDiscountDec = new Decimal(0);

  if (discountType === "PERCENTAGE") {
    billDiscountDec = subtotalDec.times(discountValDec).dividedBy(100);
  } else {
    billDiscountDec = discountValDec;
  }

  // Cap discount so it cannot exceed subtotal
  billDiscountDec = Decimal.min(subtotalDec, Decimal.max(0, billDiscountDec));

  // 4. If bill-level discount is applied and GST is enabled,
  // we adjust total taxable and tax proportionally if items didn't already deduct it
  let taxableDec = Decimal.max(0, totalItemTaxableDec.minus(billDiscountDec));
  let finalCgst = cgstTotalDec;
  let finalSgst = sgstTotalDec;
  let finalIgst = igstTotalDec;
  let finalTax = totalItemTaxDec;

  if (subtotalDec.greaterThan(0) && billDiscountDec.greaterThan(0) && totalItemTaxDec.greaterThan(0)) {
    const discountRatio = Decimal.max(0, new Decimal(1).minus(billDiscountDec.dividedBy(subtotalDec)));
    finalCgst = cgstTotalDec.times(discountRatio);
    finalSgst = sgstTotalDec.times(discountRatio);
    finalIgst = igstTotalDec.times(discountRatio);
    finalTax = finalCgst.plus(finalSgst).plus(finalIgst);
  }

  if (!gstEnabled) {
    finalCgst = new Decimal(0);
    finalSgst = new Decimal(0);
    finalIgst = new Decimal(0);
    finalTax = new Decimal(0);
  }

  const grandTotalDec = taxableDec.plus(finalTax);
  const paidDec = toDecimal(paidAmount, "0");
  const balanceDec = Decimal.max(0, grandTotalDec.minus(paidDec));

  return {
    items: calculatedItems,
    subtotal: roundTo2(subtotalDec),
    discountType,
    discountValue: roundTo2(discountValDec),
    discountAmount: roundTo2(billDiscountDec),
    taxableAmount: roundTo2(taxableDec),
    isGst: gstEnabled,
    isInterState,
    cgstAmount: roundTo2(finalCgst),
    sgstAmount: roundTo2(finalSgst),
    igstAmount: roundTo2(finalIgst),
    totalTax: roundTo2(finalTax),
    grandTotal: roundTo2(grandTotalDec),
    paidAmount: roundTo2(paidDec),
    balanceAmount: roundTo2(balanceDec),
  };
}

/**
 * Currency Formatter Utility
 */
export function formatCurrency(
  amount: number | string | Decimal,
  currency: string = "INR"
): string {
  const num = typeof amount === "number" ? amount : Number(amount) || 0;

  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
