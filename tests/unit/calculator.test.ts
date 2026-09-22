import { describe, it, expect } from "vitest";
import { calculateBill, calculateLineItem } from "../../src/lib/billing/calculator";
import { isInterStateTransaction, isValidGstin, getStateCodeFromGstin } from "../../src/lib/billing/gst";

describe("GST State & Validation", () => {
  it("validates Indian GSTIN correctly", () => {
    expect(isValidGstin("33AAAAA0000A1Z5")).toBe(true);
    expect(isValidGstin("27ABCDE1234F1Z5")).toBe(true);
    expect(isValidGstin("invalid")).toBe(false);
    expect(isValidGstin("")).toBe(false);
  });

  it("extracts state code from GSTIN", () => {
    expect(getStateCodeFromGstin("33AAAAA0000A1Z5")).toBe("33");
    expect(getStateCodeFromGstin("27ABCDE1234F1Z5")).toBe("27");
    expect(getStateCodeFromGstin("99XYZ")).toBe(null);
  });

  it("determines intra-state vs inter-state", () => {
    // Same state (e.g. Tamil Nadu to Tamil Nadu)
    expect(isInterStateTransaction("33", "33")).toBe(false);
    // Different state (e.g. Tamil Nadu to Maharashtra)
    expect(isInterStateTransaction("33", "27")).toBe(true);
    // Walk-in / Missing customer state defaults to intra-state
    expect(isInterStateTransaction("33", null)).toBe(false);
    expect(isInterStateTransaction("33", undefined)).toBe(false);
  });
});

describe("Invoice Calculation Engine", () => {
  it("calculates intra-state GST (CGST 9% + SGST 9% on ₹1,000 = ₹1,180)", () => {
    const result = calculateBill({
      items: [
        {
          name: "Consulting Service",
          quantity: 1,
          unitPrice: 1000,
          taxRate: 18,
          itemType: "SERVICE",
        },
      ],
      taxConfig: {
        gstEnabled: true,
        businessStateCode: "33", // Tamil Nadu
        customerStateCode: "33", // Tamil Nadu (Intra-state)
      },
    });

    expect(result.subtotal).toBe(1000);
    expect(result.isInterState).toBe(false);
    expect(result.cgstAmount).toBe(90);
    expect(result.sgstAmount).toBe(90);
    expect(result.igstAmount).toBe(0);
    expect(result.totalTax).toBe(180);
    expect(result.grandTotal).toBe(1180);
    expect(result.balanceAmount).toBe(1180);
  });

  it("calculates inter-state GST (IGST 18% on ₹1,000 = ₹1,180)", () => {
    const result = calculateBill({
      items: [
        {
          name: "Product Export",
          quantity: 2,
          unitPrice: 500,
          taxRate: 18,
          itemType: "PRODUCT",
        },
      ],
      taxConfig: {
        gstEnabled: true,
        businessStateCode: "33", // Tamil Nadu
        customerStateCode: "27", // Maharashtra (Inter-state)
      },
    });

    expect(result.subtotal).toBe(1000);
    expect(result.isInterState).toBe(true);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
    expect(result.igstAmount).toBe(180);
    expect(result.totalTax).toBe(180);
    expect(result.grandTotal).toBe(1180);
  });

  it("calculates non-GST business bill without any tax", () => {
    const result = calculateBill({
      items: [
        {
          name: "Haircut",
          quantity: 1,
          unitPrice: 200,
        },
        {
          name: "Beard Trim",
          quantity: 1,
          unitPrice: 100,
        },
      ],
      taxConfig: {
        gstEnabled: false,
      },
    });

    expect(result.subtotal).toBe(300);
    expect(result.isGst).toBe(false);
    expect(result.totalTax).toBe(0);
    expect(result.grandTotal).toBe(300);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
  });

  it("handles percentage discounts and payments", () => {
    const result = calculateBill({
      items: [
        {
          name: "Premium Package",
          quantity: 1,
          unitPrice: 1000,
          taxRate: 18,
        },
      ],
      taxConfig: {
        gstEnabled: true,
        businessStateCode: "33",
        customerStateCode: "33",
      },
      discountType: "PERCENTAGE",
      discountValue: 10, // 10% off ₹1000 = ₹900 taxable
      paidAmount: 600, // Partial payment
    });

    expect(result.subtotal).toBe(1000);
    expect(result.discountAmount).toBe(100);
    expect(result.taxableAmount).toBe(900);
    expect(result.cgstAmount).toBe(81); // 9% of 900
    expect(result.sgstAmount).toBe(81); // 9% of 900
    expect(result.grandTotal).toBe(1062);
    expect(result.paidAmount).toBe(600);
    expect(result.balanceAmount).toBe(462);
  });
});
