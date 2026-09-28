"use client";

import React from "react";
import { numberToIndianWords, formatIndianCurrency } from "@/lib/billing/numberToWords";
import { format } from "date-fns";

export interface InvoicePrintViewProps {
  invoice: any;
  formatType?: "A4" | "80mm" | "58mm";
}

export function InvoicePrintView({ invoice, formatType = "A4" }: InvoicePrintViewProps) {
  const org = invoice.organization || {};

  const businessName = invoice.businessName || org.name || "Business Name";
  const businessAddress =
    invoice.businessAddress ||
    [org.address, org.city, org.state, org.pincode].filter(Boolean).join(", ");
  const businessPhone = invoice.businessPhone || org.phone;
  const businessEmail = invoice.businessEmail || org.email;
  const businessGstin = invoice.businessGstin || org.gstin;

  const brandColor = invoice.brandColor || org.brandColor || "#4f46e5";
  const logoUrl = invoice.logoUrl || org.logoUrl;

  const isGstEnabled = invoice.isGst ?? org.gstEnabled ?? false;
  const isInterState = invoice.isInterState ?? false;

  // Phase 5: Strictly check if a real customer exists (Never show "Walk-in customer")
  const rawCustName = (invoice.customerName || "").trim();
  const hasRealCustomer =
    rawCustName !== "" &&
    rawCustName !== "Walk-in Customer" &&
    rawCustName !== "Walk-in" &&
    rawCustName !== "-";

  const customerName = hasRealCustomer ? rawCustName : null;
  const customerPhone = invoice.customerPhone || invoice.customer?.phone;
  const customerEmail = invoice.customerEmail || invoice.customer?.email;
  const customerAddress = invoice.customerAddress || invoice.customer?.address;
  const customerGstin = invoice.customerGstin || invoice.customer?.gstin;
  const customerState = invoice.customerStateCode || invoice.customer?.stateCode || invoice.customer?.state;

  // GST Summary Grouping
  const gstBreakdown = React.useMemo(() => {
    if (!isGstEnabled || !invoice.items) return [];
    const map = new Map<number, { taxRate: number; taxableAmount: number; cgst: number; sgst: number; igst: number; totalTax: number }>();

    for (const item of invoice.items) {
      const rate = Number(item.taxRate) || 0;
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const disc = Number(item.discountAmount) || 0;
      const taxable = Math.max(0, qty * price - disc);

      const tax = (taxable * rate) / 100;
      const cgst = isInterState ? 0 : tax / 2;
      const sgst = isInterState ? 0 : tax / 2;
      const igst = isInterState ? tax : 0;

      const existing = map.get(rate) || { taxRate: rate, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
      existing.taxableAmount += taxable;
      existing.cgst += cgst;
      existing.sgst += sgst;
      existing.igst += igst;
      existing.totalTax += tax;
      map.set(rate, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.taxRate - b.taxRate);
  }, [invoice.items, isGstEnabled, isInterState]);

  // Render 58mm POS Thermal Receipt Layout
  if (formatType === "58mm") {
    return (
      <div className="invoice-root receipt-58mm text-black bg-white font-mono">
        <div className="text-center font-bold">
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-8 w-auto mx-auto mb-1 object-contain" />}
          <h2 className="text-[10pt] font-black uppercase">{businessName}</h2>
          {businessAddress && <p className="text-[7pt] leading-tight mt-0.5">{businessAddress}</p>}
          {businessPhone && <p className="text-[7pt]">Ph: {businessPhone}</p>}
          {isGstEnabled && businessGstin && <p className="text-[7pt] font-bold">GSTIN: {businessGstin}</p>}
        </div>

        <div className="receipt-dashed-line"></div>

        <div className="text-[7.5pt] space-y-0.5">
          <div className="flex justify-between font-bold">
            <span>{isGstEnabled ? "TAX INVOICE" : "INVOICE"}</span>
            <span>#{invoice.invoiceNumber}</span>
          </div>
          <div>Date: {format(new Date(invoice.invoiceDate), "dd/MM/yy HH:mm")}</div>
          <div>Pay: {invoice.paymentMethod || "CASH"}</div>
          {hasRealCustomer && customerName && (
            <div>Billed To: {customerName} {customerPhone ? `(${customerPhone})` : ""}</div>
          )}
        </div>

        <div className="receipt-dashed-line"></div>

        <table className="w-full text-[7.5pt] border-collapse">
          <thead>
            <tr className="border-b border-black text-left font-bold">
              <th className="py-0.5">ITEM</th>
              <th className="py-0.5 text-center">QTY</th>
              <th className="py-0.5 text-right">AMT</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((it: any, idx: number) => (
              <tr key={it.id || idx}>
                <td className="py-0.5 pr-0.5 font-bold leading-tight">
                  {it.name}
                  {it.hsnCode && <span className="text-[6.5pt] font-normal block">HSN: {it.hsnCode}</span>}
                </td>
                <td className="py-0.5 text-center">{Number(it.quantity)}</td>
                <td className="py-0.5 text-right font-bold">{formatIndianCurrency(it.totalAmount, "")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-dashed-line"></div>

        <div className="text-[8pt] space-y-0.5 font-bold">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatIndianCurrency(invoice.subtotal)}</span>
          </div>
          {Number(invoice.discountAmount) > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-{formatIndianCurrency(invoice.discountAmount)}</span>
            </div>
          )}
          {isGstEnabled && Number(invoice.totalTax) > 0 && (
            <div className="flex justify-between">
              <span>Total Tax:</span>
              <span>{formatIndianCurrency(invoice.totalTax)}</span>
            </div>
          )}
          <div className="receipt-dashed-line"></div>
          <div className="flex justify-between text-[9pt] font-black">
            <span>TOTAL:</span>
            <span>{formatIndianCurrency(invoice.grandTotal)}</span>
          </div>
        </div>

        <div className="receipt-dashed-line"></div>
        <div className="text-center text-[7pt] mt-1 font-bold">
          <p>{invoice.footerMessage || org.footerMessage || "Thank You! Visit Again."}</p>
        </div>
      </div>
    );
  }

  // Render 80mm POS Thermal Receipt Layout
  if (formatType === "80mm") {
    return (
      <div className="invoice-root receipt-80mm text-black bg-white font-mono">
        <div className="text-center font-bold">
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 w-auto mx-auto mb-1 object-contain" />}
          <h2 className="text-[11pt] font-black uppercase">{businessName}</h2>
          {businessAddress && <p className="text-[8.5pt] leading-tight mt-0.5">{businessAddress}</p>}
          {businessPhone && <p className="text-[8.5pt]">Ph: {businessPhone}</p>}
          {isGstEnabled && businessGstin && <p className="text-[8.5pt] font-bold">GSTIN: {businessGstin}</p>}
        </div>

        <div className="receipt-dashed-line"></div>

        <div className="text-[8.5pt] space-y-0.5">
          <div className="flex justify-between font-bold">
            <span>{isGstEnabled ? "TAX INVOICE" : "INVOICE"}</span>
            <span>#{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date: {format(new Date(invoice.invoiceDate), "dd/MM/yyyy HH:mm")}</span>
            <span>Mode: {invoice.paymentMethod || "CASH"}</span>
          </div>
          {hasRealCustomer && customerName && (
            <div>
              <span>Customer: {customerName}</span>
              {customerPhone && <span className="ml-2">Ph: {customerPhone}</span>}
            </div>
          )}
        </div>

        <div className="receipt-dashed-line"></div>

        <table className="w-full text-[8.5pt] border-collapse">
          <thead>
            <tr className="border-b border-black text-left font-bold">
              <th className="py-1">ITEM</th>
              <th className="py-1 text-center w-8">QTY</th>
              <th className="py-1 text-right w-14">RATE</th>
              <th className="py-1 text-right w-16">AMT</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((it: any, idx: number) => (
              <tr key={it.id || idx} className="border-b border-gray-200">
                <td className="py-1 pr-1 font-bold">
                  {it.name}
                  {it.hsnCode && <span className="text-[7.5pt] font-normal block">HSN: {it.hsnCode}</span>}
                </td>
                <td className="py-1 text-center">{Number(it.quantity)}</td>
                <td className="py-1 text-right">{formatIndianCurrency(it.unitPrice, "")}</td>
                <td className="py-1 text-right font-bold">{formatIndianCurrency(it.totalAmount, "")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-dashed-line"></div>

        <div className="text-[9pt] space-y-1">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatIndianCurrency(invoice.subtotal)}</span>
          </div>
          {Number(invoice.discountAmount) > 0 && (
            <div className="flex justify-between font-bold">
              <span>Discount:</span>
              <span>-{formatIndianCurrency(invoice.discountAmount)}</span>
            </div>
          )}
          {isGstEnabled && (
            <>
              {isInterState ? (
                <div className="flex justify-between">
                  <span>IGST Total:</span>
                  <span>{formatIndianCurrency(invoice.igstAmount)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>CGST Total:</span>
                    <span>{formatIndianCurrency(invoice.cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST Total:</span>
                    <span>{formatIndianCurrency(invoice.sgstAmount)}</span>
                  </div>
                </>
              )}
            </>
          )}

          <div className="receipt-dashed-line"></div>

          <div className="flex justify-between text-[10pt] font-black">
            <span>TOTAL:</span>
            <span>{formatIndianCurrency(invoice.grandTotal)}</span>
          </div>
          {Number(invoice.paidAmount) > 0 && (
            <div className="flex justify-between font-bold text-[8.5pt]">
              <span>Paid ({invoice.paymentMethod}):</span>
              <span>{formatIndianCurrency(invoice.paidAmount)}</span>
            </div>
          )}
          {Number(invoice.balanceAmount) > 0 && (
            <div className="flex justify-between font-bold text-[8.5pt]">
              <span>Balance Due:</span>
              <span>{formatIndianCurrency(invoice.balanceAmount)}</span>
            </div>
          )}
        </div>

        <div className="receipt-dashed-line"></div>
        <div className="text-center text-[8pt] mt-2 font-bold">
          <p>{invoice.footerMessage || org.footerMessage || "Thank You! Visit Again."}</p>
        </div>
      </div>
    );
  }

  // Render Full Professional Indian GST Tax Invoice (A4 Format)
  return (
    <div className="invoice-root bg-white text-slate-900 font-sans leading-normal">
      {/* Header Banner */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-5">
        <div>
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="h-14 w-auto mb-2.5 object-contain" />
          )}
          <h1 className="text-2xl font-black tracking-tight" style={{ color: brandColor }}>
            {businessName}
          </h1>
          {businessAddress && <p className="text-xs text-slate-600 mt-1 max-w-md">{businessAddress}</p>}
          {(businessPhone || businessEmail) && (
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              {[businessPhone && `Ph: ${businessPhone}`, businessEmail].filter(Boolean).join(" • ")}
            </p>
          )}
          {isGstEnabled && businessGstin && (
            <p className="text-xs font-extrabold text-slate-900 mt-1 font-mono">
              GSTIN: <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">{businessGstin}</span>
            </p>
          )}
        </div>

        <div className="text-right">
          <div
            className="inline-block text-xs font-extrabold px-3 py-1 rounded uppercase tracking-wider mb-2 border"
            style={{
              backgroundColor: `${brandColor}15`,
              color: brandColor,
              borderColor: `${brandColor}35`,
            }}
          >
            {isGstEnabled ? "TAX INVOICE" : "INVOICE"}
          </div>
          <p className="text-2xl font-mono font-black text-slate-900">{invoice.invoiceNumber}</p>
          <p className="text-xs text-slate-600 mt-1">
            Date: <span className="font-bold text-slate-900">{format(new Date(invoice.invoiceDate), "dd MMM yyyy")}</span>
          </p>
          {invoice.paymentMethod && (
            <p className="text-xs text-slate-600">
              Payment Mode: <span className="font-bold text-slate-900 uppercase">{invoice.paymentMethod}</span>
            </p>
          )}
          {invoice.dueDate && (
            <p className="text-xs text-slate-600">
              Due Date: <span className="font-bold text-slate-900">{format(new Date(invoice.dueDate), "dd MMM yyyy")}</span>
            </p>
          )}
        </div>
      </div>

      {/* Parties Block (Phase 5: Render "Bill to" ONLY when a real customer exists) */}
      {hasRealCustomer && (
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 shadow-xs">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Billed To</p>
            <h3 className="text-base font-black text-slate-900 mt-0.5">{customerName}</h3>
            {customerPhone && <p className="text-xs text-slate-700 font-medium mt-0.5">Phone: {customerPhone}</p>}
            {customerEmail && <p className="text-xs text-slate-700 font-medium">Email: {customerEmail}</p>}
            {customerAddress && <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{customerAddress}</p>}
            {isGstEnabled && customerGstin && (
              <p className="text-xs font-bold text-slate-900 mt-1 font-mono">
                GSTIN: <span className="bg-white px-2 py-0.5 rounded border border-slate-300">{customerGstin}</span>
              </p>
            )}
          </div>

          {isGstEnabled && (
            <div className="sm:text-right flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Place of Supply</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {customerState ? `State Code: ${customerState}` : org.state || "Intra-State"}
                </p>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  Tax Type: <span className="font-bold text-slate-900">{isInterState ? "IGST (Inter-State)" : "CGST + SGST (Intra-State)"}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items Table */}
      <table className="w-full text-left text-xs border-collapse mb-5 border border-slate-300">
        <thead>
          <tr className="text-white font-extrabold uppercase text-[10px] tracking-wider" style={{ backgroundColor: brandColor }}>
            <th className="py-2.5 px-3 w-8 text-center border-r border-white/20">#</th>
            <th className="py-2.5 px-3 border-r border-white/20">Item Description</th>
            {isGstEnabled && <th className="py-2.5 px-2 text-center w-20 border-r border-white/20">HSN/SAC</th>}
            <th className="py-2.5 px-2 text-center w-16 border-r border-white/20">Qty</th>
            <th className="py-2.5 px-2 text-center w-16 border-r border-white/20">Unit</th>
            <th className="py-2.5 px-3 text-right w-24 border-r border-white/20">Rate (₹)</th>
            {Number(invoice.discountAmount) > 0 && (
              <th className="py-2.5 px-3 text-right w-20 border-r border-white/20">Disc.</th>
            )}
            {isGstEnabled && <th className="py-2.5 px-2 text-center w-16 border-r border-white/20">GST %</th>}
            <th className="py-2.5 px-3 text-right font-black w-28">Amount (₹)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {invoice.items?.map((it: any, idx: number) => {
            const hsn = it.hsnCode || it.item?.hsnCode || "-";
            return (
              <tr key={it.id || idx} className="hover:bg-slate-50/50">
                <td className="py-2.5 px-3 text-center font-bold text-slate-500 font-mono border-r border-slate-200">
                  {idx + 1}
                </td>
                <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-slate-900">
                  {it.name}
                  {it.description && <p className="text-[11px] text-slate-500 font-normal mt-0.5">{it.description}</p>}
                </td>
                {isGstEnabled && (
                  <td className="py-2.5 px-2 text-center font-mono text-slate-600 border-r border-slate-200">
                    {hsn}
                  </td>
                )}
                <td className="py-2.5 px-2 text-center font-bold text-slate-900 font-mono border-r border-slate-200">
                  {Number(it.quantity)}
                </td>
                <td className="py-2.5 px-2 text-center text-slate-600 border-r border-slate-200">
                  {it.unit || "pcs"}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-800 font-mono border-r border-slate-200">
                  {formatIndianCurrency(it.unitPrice, "")}
                </td>
                {Number(invoice.discountAmount) > 0 && (
                  <td className="py-2.5 px-3 text-right font-medium text-slate-600 font-mono border-r border-slate-200">
                    {Number(it.discountAmount) > 0 ? formatIndianCurrency(it.discountAmount, "") : "-"}
                  </td>
                )}
                {isGstEnabled && (
                  <td className="py-2.5 px-2 text-center font-bold text-slate-700 border-r border-slate-200">
                    {Number(it.taxRate)}%
                  </td>
                )}
                <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                  {formatIndianCurrency(it.totalAmount, "")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals & Notes Section */}
      <div className="avoid-break totals pt-2 flex flex-col sm:flex-row justify-between gap-6">
        <div className="flex-1 max-w-md space-y-3 text-xs">
          {/* Amount in Words */}
          <div className="p-3 bg-slate-100/80 rounded-lg border border-slate-300">
            <p className="text-[10px] font-extrabold uppercase text-slate-500">Amount In Words</p>
            <p className="font-bold text-slate-900 text-xs mt-0.5">
              {numberToIndianWords(Number(invoice.grandTotal))}
            </p>
          </div>

          {invoice.notes && (
            <div>
              <p className="font-extrabold uppercase text-[10px] text-slate-500">Notes</p>
              <p className="text-slate-700 mt-0.5">{invoice.notes}</p>
            </div>
          )}

          {/* Terms */}
          <div>
            <p className="font-extrabold uppercase text-[10px] text-slate-500">Terms & Conditions</p>
            <p className="text-slate-700 mt-0.5 leading-relaxed">
              {invoice.terms || org.terms || "Goods once sold will not be taken back."}
            </p>
          </div>

          {/* Bank / UPI Details from Settings */}
          {(org.bankDetails || org.upiId) && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono space-y-1">
              <p className="font-extrabold uppercase text-[10px] text-slate-600 font-sans">Bank & Payment Details</p>
              {org.bankDetails && <p className="text-slate-800">{org.bankDetails}</p>}
              {org.upiId && <p className="text-slate-800 font-bold">UPI ID: {org.upiId}</p>}
            </div>
          )}
        </div>

        {/* Financial Breakdown Table */}
        <div className="w-full sm:w-80 space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-300 font-sans">
          <div className="flex justify-between text-slate-700 font-medium">
            <span>Subtotal:</span>
            <span className="font-bold font-mono text-slate-900">{formatIndianCurrency(invoice.subtotal)}</span>
          </div>

          {Number(invoice.discountAmount) > 0 && (
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Discount:</span>
              <span className="font-mono">-{formatIndianCurrency(invoice.discountAmount)}</span>
            </div>
          )}

          {isGstEnabled && (
            <>
              <div className="flex justify-between text-slate-700 border-t border-slate-200 pt-1 font-medium">
                <span>Taxable Value:</span>
                <span className="font-mono font-bold">{formatIndianCurrency(invoice.taxableAmount)}</span>
              </div>
              {isInterState ? (
                <div className="flex justify-between text-slate-700 font-medium">
                  <span>IGST Total:</span>
                  <span className="font-mono font-bold">{formatIndianCurrency(invoice.igstAmount)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-700 font-medium">
                    <span>CGST Total:</span>
                    <span className="font-mono font-bold">{formatIndianCurrency(invoice.cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 font-medium">
                    <span>SGST Total:</span>
                    <span className="font-mono font-bold">{formatIndianCurrency(invoice.sgstAmount)}</span>
                  </div>
                </>
              )}
            </>
          )}

          <div className="flex justify-between text-base font-black text-slate-900 border-t-2 border-slate-400 pt-2">
            <span>Grand Total:</span>
            <span className="font-mono" style={{ color: brandColor }}>
              {formatIndianCurrency(invoice.grandTotal)}
            </span>
          </div>

          {Number(invoice.paidAmount) > 0 && (
            <div className="flex justify-between font-bold text-emerald-700 pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono">{formatIndianCurrency(invoice.paidAmount)}</span>
            </div>
          )}

          {Number(invoice.balanceAmount) > 0 && (
            <div className="flex justify-between font-black text-amber-900 bg-amber-100 p-2 rounded-lg border border-amber-300">
              <span>Balance Due:</span>
              <span className="font-mono">{formatIndianCurrency(invoice.balanceAmount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* GST Breakdown Table (Phase 6 Requirement) */}
      {isGstEnabled && gstBreakdown.length > 0 && (
        <div className="avoid-break gst-summary mt-5 pt-3 border-t border-slate-300">
          <p className="text-[10px] font-extrabold uppercase text-slate-500 mb-1.5">GST Tax Rate Summary</p>
          <table className="w-full text-left text-[11px] border-collapse border border-slate-300 font-mono">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-bold uppercase text-[9px]">
                <th className="py-1.5 px-2 border-r border-slate-300">Tax Rate</th>
                <th className="py-1.5 px-2 text-right border-r border-slate-300">Taxable Amount (₹)</th>
                {isInterState ? (
                  <th className="py-1.5 px-2 text-right border-r border-slate-300">IGST (₹)</th>
                ) : (
                  <>
                    <th className="py-1.5 px-2 text-right border-r border-slate-300">CGST (₹)</th>
                    <th className="py-1.5 px-2 text-right border-r border-slate-300">SGST (₹)</th>
                  </>
                )}
                <th className="py-1.5 px-2 text-right">Total Tax (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {gstBreakdown.map((g, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 px-2 font-bold border-r border-slate-200">{g.taxRate}% GST</td>
                  <td className="py-1.5 px-2 text-right border-r border-slate-200">{formatIndianCurrency(g.taxableAmount, "")}</td>
                  {isInterState ? (
                    <td className="py-1.5 px-2 text-right border-r border-slate-200">{formatIndianCurrency(g.igst, "")}</td>
                  ) : (
                    <>
                      <td className="py-1.5 px-2 text-right border-r border-slate-200">{formatIndianCurrency(g.cgst, "")}</td>
                      <td className="py-1.5 px-2 text-right border-r border-slate-200">{formatIndianCurrency(g.sgst, "")}</td>
                    </>
                  )}
                  <td className="py-1.5 px-2 text-right font-bold">{formatIndianCurrency(g.totalTax, "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer & Authorised Signatory */}
      <div className="avoid-break footer-signatory flex justify-between items-end mt-8 pt-4 border-t border-slate-300 text-xs">
        <div className="text-slate-600 italic">
          <p>{invoice.footerMessage || org.footerMessage || "Thank you for your business!"}</p>
        </div>

        <div className="text-right">
          <p className="font-bold text-slate-500 uppercase text-[10px]">For {businessName}</p>
          <div className="h-12"></div>
          <p className="font-extrabold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-[160px] text-center">
            Authorised Signatory
          </p>
        </div>
      </div>

      <div className="text-center text-[9px] text-slate-400 mt-6 border-t border-slate-200 pt-2 font-sans">
        This is a computer-generated invoice.
      </div>
    </div>
  );
}
