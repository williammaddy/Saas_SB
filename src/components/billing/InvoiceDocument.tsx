"use client";

import React from "react";
import { formatCurrency } from "@/lib/billing/calculator";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Printer, Share2, CreditCard, XCircle, ArrowLeft, Download } from "lucide-react";
import { format } from "date-fns";

export interface InvoiceCustomizationProps {
  invoiceTemplate?: "CLASSIC" | "MODERN" | "MINIMAL" | "COMPACT";
  brandColor?: string;
  showAddress?: boolean;
  showContact?: boolean;
  showGstin?: boolean;
  footerMessage?: string;
  logoUrl?: string;
}

interface InvoiceDocumentProps {
  invoice: any;
  customization?: InvoiceCustomizationProps;
  onRecordPayment?: () => void;
  onCancelInvoice?: () => void;
  onBack?: () => void;
}

export function InvoiceDocument({
  invoice,
  customization,
  onRecordPayment,
  onCancelInvoice,
  onBack,
}: InvoiceDocumentProps) {
  const org = invoice.organization || {};
  const currency = org.currency || "INR";

  // Resolve presentation parameters
  const templateName =
    customization?.invoiceTemplate ||
    invoice.templateName ||
    org.invoiceTemplate ||
    "CLASSIC";

  const brandColor =
    customization?.brandColor ||
    invoice.brandColor ||
    org.brandColor ||
    "#4f46e5";

  const showAddress =
    customization?.showAddress ??
    invoice.showAddress ??
    org.showAddress ??
    true;

  const showContact =
    customization?.showContact ??
    invoice.showContact ??
    org.showContact ??
    true;

  const showGstin =
    customization?.showGstin ??
    invoice.showGstin ??
    org.showGstin ??
    true;

  const footerMessage =
    customization?.footerMessage ??
    invoice.footerMessage ??
    org.footerMessage ??
    "Thank you for your business!";

  const logoUrl = customization?.logoUrl ?? org.logoUrl;

  const businessName = invoice.businessName || org.name || "Business Name";
  const businessAddress =
    invoice.businessAddress ||
    [org.address, org.city, org.state, org.pincode].filter(Boolean).join(", ");
  const businessPhone = invoice.businessPhone || org.phone;
  const businessEmail = invoice.businessEmail || org.email;
  const businessGstin = invoice.businessGstin || org.gstin;

  const isWalkIn = !invoice.customerId || invoice.customerName === "Walk-in Customer";

  // Print in clean hidden iframe using dedicated /print/invoice/:id route (NO site layout)
  const handlePrintInIframe = (formatType: "A4" | "80mm") => {
    // Check if printing a preview mock invoice or a real database invoice
    if (!invoice.id || invoice.id.startsWith("preview-")) {
      window.print();
      return;
    }

    const existingIframe = document.getElementById("invoice-print-iframe");
    if (existingIframe) existingIframe.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "invoice-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = `/print/invoice/${invoice.id}?format=${formatType}&autoprint=true`;

    document.body.appendChild(iframe);
  };

  const handleDownloadPdf = () => {
    if (!invoice.id || invoice.id.startsWith("preview-")) {
      alert("PDF download is available for saved invoices.");
      return;
    }
    window.open(`/api/invoices/${invoice.id}/pdf`, "_blank");
  };

  // Share actual PDF file document using Web Share API or download fallback
  const handleSharePdf = async () => {
    if (!invoice.id || invoice.id.startsWith("preview-")) {
      alert("PDF share is available for saved invoices.");
      return;
    }

    const pdfApiUrl = `/api/invoices/${invoice.id}/pdf`;

    try {
      // 1. Fetch PDF blob and share File object if supported
      if (typeof window !== "undefined" && navigator.canShare) {
        const res = await fetch(pdfApiUrl);
        if (res.ok) {
          const blob = await res.blob();
          const pdfFile = new File([blob], `Invoice-${invoice.invoiceNumber}.pdf`, {
            type: "application/pdf",
          });

          if (navigator.canShare({ files: [pdfFile] })) {
            await navigator.share({
              files: [pdfFile],
              title: `Invoice ${invoice.invoiceNumber}`,
              text: `Invoice ${invoice.invoiceNumber} from ${businessName}`,
            });
            return;
          }
        }
      }

      // 2. Fallback for browsers without file sharing: Download PDF + WhatsApp link
      window.open(pdfApiUrl, "_blank");
      const cleanPhone = (invoice.customerPhone || "").replace(/[^0-9]/g, "");
      if (cleanPhone) {
        const msg = encodeURIComponent(`Invoice ${invoice.invoiceNumber} from ${businessName}.`);
        const waUrl = `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${msg}`;
        alert("PDF downloaded. Attach it in WhatsApp or Email.");
        window.open(waUrl, "_blank");
      } else {
        alert("PDF downloaded. Attach it in WhatsApp or Email.");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // User cancelled native share sheet - ignore silently (Phase 4 requirement)
        return;
      }
      console.error("Share error:", err);
      window.open(pdfApiUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Action Bar (Hidden on Print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          )}
          <span className="text-sm font-semibold text-slate-700">
            Invoice: <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
          </span>
          <StatusBadge status={invoice.status} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && onRecordPayment && (
            <Button size="sm" onClick={onRecordPayment} icon={<CreditCard className="w-4 h-4" />}>
              Record Payment
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => handlePrintInIframe("A4")} icon={<Printer className="w-4 h-4" />}>
            Print A4 Invoice
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePrintInIframe("80mm")} icon={<Printer className="w-4 h-4" />}>
            Print 80mm Receipt
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} icon={<Download className="w-4 h-4" />}>
            Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleSharePdf} icon={<Share2 className="w-4 h-4" />}>
            Share PDF
          </Button>
          {invoice.status !== "CANCELLED" && onCancelInvoice && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm("Are you sure you want to cancel this invoice? Stock will be restored.")) {
                  onCancelInvoice();
                }
              }}
              icon={<XCircle className="w-4 h-4" />}
            >
              Cancel Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Main Printable Invoice Card Document */}
      <div
        className={`print-container bg-white rounded-2xl border border-slate-200 shadow-md mx-auto text-slate-900 transition-all overflow-hidden ${
          templateName === "COMPACT" ? "max-w-2xl p-6 text-xs" : "max-w-4xl p-6 sm:p-10 text-sm"
        }`}
      >
        {/* ============================================================ */}
        {/* TEMPLATE HEADER (Clean & Non-Overlapping) */}
        {/* ============================================================ */}
        {templateName === "MODERN" ? (
          <div
            className="rounded-xl p-6 sm:p-8 text-white mb-6 flex flex-col sm:flex-row justify-between items-start gap-4 shadow-xs"
            style={{ backgroundColor: brandColor }}
          >
            <div>
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="h-12 w-auto mb-3 object-contain bg-white/20 p-1.5 rounded-lg" />
              )}
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{businessName}</h2>
              {showAddress && businessAddress && (
                <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-md leading-relaxed">{businessAddress}</p>
              )}
              {showContact && (businessPhone || businessEmail) && (
                <p className="text-xs text-white/80 mt-1">
                  {[businessPhone && `Ph: ${businessPhone}`, businessEmail].filter(Boolean).join(" | ")}
                </p>
              )}
              {showGstin && org.gstEnabled && businessGstin && (
                <p className="text-xs font-bold text-white mt-1.5 bg-white/10 px-2.5 py-0.5 rounded inline-block">
                  GSTIN: {businessGstin}
                </p>
              )}
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="inline-block bg-white text-slate-900 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2 shadow-xs">
                {invoice.isGst ? "Tax Invoice" : "Invoice"}
              </span>
              <p className="text-xl sm:text-2xl font-mono font-black text-white">{invoice.invoiceNumber}</p>
              <p className="text-xs text-white/90 mt-1 font-medium">
                Date: {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
              </p>
              {invoice.dueDate && (
                <p className="text-xs text-white/80 font-medium">
                  Due: {format(new Date(invoice.dueDate), "dd MMM yyyy")}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 pb-6 mb-6 ${
              templateName === "MINIMAL" ? "border-slate-200" : "border-slate-300"
            }`}
          >
            <div>
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="h-14 w-auto mb-3 object-contain" />
              )}
              <h2
                className="text-2xl sm:text-3xl font-black tracking-tight"
                style={{ color: templateName === "MINIMAL" ? "#0f172a" : brandColor }}
              >
                {businessName}
              </h2>
              {showAddress && businessAddress && (
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md leading-relaxed">{businessAddress}</p>
              )}
              {showContact && (businessPhone || businessEmail) && (
                <p className="text-xs text-slate-600 mt-1">
                  {[businessPhone && `Ph: ${businessPhone}`, businessEmail].filter(Boolean).join(" • ")}
                </p>
              )}
              {showGstin && org.gstEnabled && businessGstin && (
                <p className="text-xs font-extrabold text-slate-800 mt-1.5">GSTIN: {businessGstin}</p>
              )}
            </div>

            <div className="text-left sm:text-right shrink-0">
              <div
                className="inline-block text-xs font-extrabold px-3 py-1 rounded-lg uppercase tracking-wider mb-2 border"
                style={{
                  backgroundColor: `${brandColor}12`,
                  color: brandColor,
                  borderColor: `${brandColor}30`,
                }}
              >
                {invoice.isGst ? "TAX INVOICE" : "COMMERCIAL BILL"}
              </div>
              <p className="text-xl sm:text-2xl font-mono font-black text-slate-900">{invoice.invoiceNumber}</p>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Date: <span className="font-bold text-slate-800">{format(new Date(invoice.invoiceDate), "dd MMM yyyy")}</span>
              </p>
              {invoice.dueDate && (
                <p className="text-xs text-slate-600 font-medium">
                  Due Date: <span className="font-bold text-slate-800">{format(new Date(invoice.dueDate), "dd MMM yyyy")}</span>
                </p>
              )}
              <div className="mt-2">
                <StatusBadge status={invoice.status} />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* CUSTOMER & BILLING DETAILS BOX (Clean Grid) */}
        {/* ============================================================ */}
        <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 shadow-xs">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Billed To</p>
            <h4 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              {invoice.customerName}
            </h4>
            {isWalkIn && (
              <span className="text-[11px] bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full inline-block mt-1 font-bold">
                Walk-in Customer
              </span>
            )}
            {invoice.customerPhone && (
              <p className="text-xs sm:text-sm text-slate-700 mt-1 font-medium">Phone: {invoice.customerPhone}</p>
            )}
            {invoice.customerEmail && (
              <p className="text-xs sm:text-sm text-slate-700 font-medium">Email: {invoice.customerEmail}</p>
            )}
            {invoice.customerAddress && (
              <p className="text-xs sm:text-sm text-slate-700 mt-0.5 leading-relaxed">{invoice.customerAddress}</p>
            )}
            {invoice.customerGstin && (
              <p className="text-xs font-bold text-slate-900 mt-1.5 bg-white px-2.5 py-1 rounded border border-slate-200 inline-block font-mono">
                GSTIN: {invoice.customerGstin}
              </p>
            )}
          </div>

          <div className="sm:text-right flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Invoice Overview</p>
              <div className="mt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono" style={{ color: brandColor }}>
                  {formatCurrency(invoice.grandTotal, currency)}
                </span>
              </div>
            </div>

            <div className="mt-2 space-y-0.5">
              {Number(invoice.paidAmount) > 0 && (
                <p className="text-xs text-emerald-700 font-extrabold">
                  Amount Paid: {formatCurrency(invoice.paidAmount, currency)}
                </p>
              )}
              {Number(invoice.balanceAmount) > 0 && (
                <p className="text-xs text-amber-800 font-black bg-amber-50 px-2 py-0.5 rounded inline-block border border-amber-200">
                  Balance Due: {formatCurrency(invoice.balanceAmount, currency)}
                </p>
              )}
              <p className="text-xs text-slate-600 font-medium mt-1">
                Payment Mode: <span className="font-bold text-slate-900 capitalize">{invoice.paymentMethod?.toLowerCase()}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ITEMIZED PRODUCTS & SERVICES TABLE */}
        {/* ============================================================ */}
        <div className="mb-6 overflow-x-auto rounded-xl border border-slate-300">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr
                className="bg-slate-900 text-white font-extrabold uppercase tracking-wider text-xs"
                style={{ backgroundColor: templateName === "MODERN" ? brandColor : undefined }}
              >
                <th className="py-3 px-3 w-10 text-center border-r border-slate-700">#</th>
                <th className="py-3 px-3 border-r border-slate-700">Item Description</th>
                <th className="py-3 px-3 text-center w-20 border-r border-slate-700">Qty</th>
                <th className="py-3 px-3 text-right w-28 border-r border-slate-700">Rate (₹)</th>
                {Number(invoice.discountAmount) > 0 && (
                  <th className="py-3 px-3 text-right w-24 border-r border-slate-700">Discount</th>
                )}
                {invoice.isGst && <th className="py-3 px-3 text-center w-20 border-r border-slate-700">GST %</th>}
                <th className="py-3 px-3 text-right font-black w-32">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {invoice.items?.map((it: any, index: number) => (
                <tr key={it.id || index} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono border-r border-slate-200 bg-slate-50/50">
                    {index + 1}
                  </td>
                  <td className="py-3 px-3 border-r border-slate-200">
                    <p className="font-bold text-slate-900 text-sm">{it.name}</p>
                    {it.description && (
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{it.description}</p>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono border-r border-slate-200">
                    {Number(it.quantity)} {it.unit || "pcs"}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-800 font-mono border-r border-slate-200">
                    {formatCurrency(it.unitPrice, currency)}
                  </td>
                  {Number(invoice.discountAmount) > 0 && (
                    <td className="py-3 px-3 text-right font-semibold text-slate-600 font-mono border-r border-slate-200">
                      {Number(it.discountAmount) > 0 ? formatCurrency(it.discountAmount, currency) : "-"}
                    </td>
                  )}
                  {invoice.isGst && (
                    <td className="py-3 px-3 text-center font-bold text-slate-700 border-r border-slate-200">
                      {Number(it.taxRate)}%
                    </td>
                  )}
                  <td className="py-3 px-3 text-right font-black text-slate-900 font-mono">
                    {formatCurrency(it.totalAmount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ============================================================ */}
        {/* TOTALS, NOTES, TERMS & SIGNATURE (Non-breaking container) */}
        {/* ============================================================ */}
        <div className="avoid-break pt-4 border-t-2 border-slate-300 flex flex-col sm:flex-row justify-between gap-6">
          {/* Notes & Terms & Signatory */}
          <div className="flex-1 max-w-sm space-y-4">
            {invoice.notes && (
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Notes</p>
                <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Terms & Conditions</p>
                <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{invoice.terms}</p>
              </div>
            )}
            {footerMessage && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs italic font-medium">
                "{footerMessage}"
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 text-center sm:text-left">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">For {businessName}</p>
              <div className="h-10"></div>
              <p className="text-xs font-bold text-slate-700">Authorised Signatory</p>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="w-full sm:w-80 space-y-2 text-xs sm:text-sm bg-slate-50 p-4 rounded-xl border border-slate-300">
            <div className="flex justify-between text-slate-700 font-medium">
              <span>Subtotal</span>
              <span className="font-bold font-mono text-slate-900">{formatCurrency(invoice.subtotal, currency)}</span>
            </div>

            {Number(invoice.discountAmount) > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Discount</span>
                <span className="font-mono">-{formatCurrency(invoice.discountAmount, currency)}</span>
              </div>
            )}

            {invoice.isGst && (
              <>
                <div className="flex justify-between text-slate-700 font-medium pt-1 border-t border-slate-200">
                  <span>Taxable Amount</span>
                  <span className="font-mono font-bold">{formatCurrency(invoice.taxableAmount, currency)}</span>
                </div>
                {invoice.isInterState ? (
                  <div className="flex justify-between text-slate-700 font-medium">
                    <span>IGST Total</span>
                    <span className="font-mono font-bold">{formatCurrency(invoice.igstAmount, currency)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-700 font-medium">
                      <span>CGST Total</span>
                      <span className="font-mono font-bold">{formatCurrency(invoice.cgstAmount, currency)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700 font-medium">
                      <span>SGST Total</span>
                      <span className="font-mono font-bold">{formatCurrency(invoice.sgstAmount, currency)}</span>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="flex justify-between text-base sm:text-lg font-black text-slate-900 pt-2 border-t-2 border-slate-400">
              <span>Grand Total</span>
              <span className="font-mono" style={{ color: brandColor }}>
                {formatCurrency(invoice.grandTotal, currency)}
              </span>
            </div>

            <div className="flex justify-between text-xs font-bold text-emerald-700 pt-1">
              <span>Amount Paid</span>
              <span className="font-mono">{formatCurrency(invoice.paidAmount, currency)}</span>
            </div>

            {Number(invoice.balanceAmount) > 0 && (
              <div className="flex justify-between text-xs font-black text-amber-900 bg-amber-100 p-2 rounded-lg border border-amber-300">
                <span>Balance Due</span>
                <span className="font-mono">{formatCurrency(invoice.balanceAmount, currency)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
