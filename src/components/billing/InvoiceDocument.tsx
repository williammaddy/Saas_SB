"use client";

import React from "react";
import { formatCurrency } from "@/lib/billing/calculator";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Printer, Download, Share2, CreditCard, XCircle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface InvoiceDocumentProps {
  invoice: any;
  onRecordPayment?: () => void;
  onCancelInvoice?: () => void;
  onBack?: () => void;
}

export function InvoiceDocument({
  invoice,
  onRecordPayment,
  onCancelInvoice,
  onBack,
}: InvoiceDocumentProps) {
  const org = invoice.organization || {};
  const customer = invoice.customer || {};
  const isWalkIn = !invoice.customerId || invoice.customerName === "Walk-in Customer";
  const currency = org.currency || "INR";

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: `Invoice ${invoice.invoiceNumber} from ${org.name} for ${formatCurrency(invoice.grandTotal, currency)}`,
          url: window.location.href,
        });
      } catch {
        // Ignored or cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Invoice link copied to clipboard!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar (Hidden on Print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          )}
          <span className="text-sm font-semibold text-slate-700">
            Invoice: <span className="text-indigo-600 font-mono">{invoice.invoiceNumber}</span>
          </span>
          <StatusBadge status={invoice.status} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && onRecordPayment && (
            <Button size="sm" onClick={onRecordPayment} icon={<CreditCard className="w-4 h-4" />}>
              Record Payment
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>
            Print / Save as PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare} icon={<Share2 className="w-4 h-4" />}>
            Share Link
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

      {/* Invoice Document Box */}
      <div className="print-container bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 max-w-4xl mx-auto text-slate-800">
        {/* Header: Business & Invoice Meta */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {org.name || "Business Name"}
            </h2>
            {org.address && <p className="text-xs text-slate-500 mt-1 max-w-xs">{org.address}</p>}
            {(org.city || org.state) && (
              <p className="text-xs text-slate-500">
                {[org.city, org.state, org.pincode].filter(Boolean).join(", ")}
              </p>
            )}
            {org.phone && <p className="text-xs text-slate-500">Phone: {org.phone}</p>}
            {org.email && <p className="text-xs text-slate-500">Email: {org.email}</p>}
            {org.gstEnabled && org.gstin && (
              <p className="text-xs font-semibold text-slate-700 mt-1">
                GSTIN: <span className="font-mono">{org.gstin}</span>
              </p>
            )}
          </div>

          <div className="text-left sm:text-right">
            <div className="inline-block bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded tracking-wider uppercase mb-2">
              {invoice.isGst ? "Tax Invoice" : "Commercial Bill"}
            </div>
            <p className="text-lg font-mono font-bold text-slate-900">{invoice.invoiceNumber}</p>
            <p className="text-xs text-slate-500 mt-1">
              Date: <span className="font-medium text-slate-700">{format(new Date(invoice.invoiceDate), "dd MMM yyyy")}</span>
            </p>
            {invoice.dueDate && (
              <p className="text-xs text-slate-500">
                Due: <span className="font-medium text-slate-700">{format(new Date(invoice.dueDate), "dd MMM yyyy")}</span>
              </p>
            )}
            <div className="mt-2">
              <StatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Billed To (Customer Details) */}
        <div className="py-6 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billed To</p>
            <h4 className="text-base font-bold text-slate-900 mt-1">
              {invoice.customerName}
            </h4>
            {isWalkIn && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full inline-block mt-0.5">
                Walk-in Customer
              </span>
            )}
            {invoice.customerPhone && (
              <p className="text-xs text-slate-600 mt-0.5">Phone: {invoice.customerPhone}</p>
            )}
            {invoice.customerEmail && (
              <p className="text-xs text-slate-600">Email: {invoice.customerEmail}</p>
            )}
            {invoice.customerAddress && (
              <p className="text-xs text-slate-600">{invoice.customerAddress}</p>
            )}
            {invoice.customerGstin && (
              <p className="text-xs font-semibold text-slate-700 mt-1">
                GSTIN: <span className="font-mono">{invoice.customerGstin}</span>
              </p>
            )}
          </div>

          <div className="sm:text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Payment Status</p>
            <div className="mt-1">
              <span className="text-2xl font-black text-slate-900">
                {formatCurrency(invoice.grandTotal, currency)}
              </span>
            </div>
            {Number(invoice.paidAmount) > 0 && (
              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                Paid: {formatCurrency(invoice.paidAmount, currency)}
              </p>
            )}
            {Number(invoice.balanceAmount) > 0 && (
              <p className="text-xs text-amber-600 font-semibold">
                Balance Due: {formatCurrency(invoice.balanceAmount, currency)}
              </p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              Method: <span className="font-medium capitalize">{invoice.paymentMethod?.toLowerCase()}</span>
            </p>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="py-6 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 font-semibold">
                <th className="py-2.5 pr-3">#</th>
                <th className="py-2.5 px-3">Item & Description</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Price</th>
                {Number(invoice.discountAmount) > 0 && (
                  <th className="py-2.5 px-3 text-right">Discount</th>
                )}
                {invoice.isGst && <th className="py-2.5 px-3 text-right">Tax Rate</th>}
                <th className="py-2.5 pl-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items?.map((it: any, index: number) => (
                <tr key={it.id || index} className="hover:bg-slate-50/60">
                  <td className="py-3 pr-3 text-slate-400">{index + 1}</td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-900">{it.name}</p>
                    {it.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{it.description}</p>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-medium">
                    {Number(it.quantity)} {it.unit || "pcs"}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600">
                    {formatCurrency(it.unitPrice, currency)}
                  </td>
                  {Number(invoice.discountAmount) > 0 && (
                    <td className="py-3 px-3 text-right text-slate-500">
                      {Number(it.discountAmount) > 0 ? formatCurrency(it.discountAmount, currency) : "-"}
                    </td>
                  )}
                  {invoice.isGst && (
                    <td className="py-3 px-3 text-right text-slate-500">
                      {Number(it.taxRate)}%
                    </td>
                  )}
                  <td className="py-3 pl-3 text-right font-bold text-slate-900">
                    {formatCurrency(it.totalAmount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-6">
          <div className="flex-1 max-w-sm space-y-2">
            {invoice.notes && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Notes</p>
                <p className="text-xs text-slate-600 mt-0.5">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Terms & Conditions</p>
                <p className="text-xs text-slate-600 mt-0.5">{invoice.terms}</p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">{formatCurrency(invoice.subtotal, currency)}</span>
            </div>

            {Number(invoice.discountAmount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount {invoice.discountType === "PERCENTAGE" && `(${invoice.discountValue}%)`}</span>
                <span>-{formatCurrency(invoice.discountAmount, currency)}</span>
              </div>
            )}

            {invoice.isGst && (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Amount</span>
                  <span>{formatCurrency(invoice.taxableAmount, currency)}</span>
                </div>
                {invoice.isInterState ? (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST</span>
                    <span>{formatCurrency(invoice.igstAmount, currency)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST</span>
                      <span>{formatCurrency(invoice.cgstAmount, currency)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST</span>
                      <span>{formatCurrency(invoice.sgstAmount, currency)}</span>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t-2 border-slate-200">
              <span>Grand Total</span>
              <span className="text-indigo-600 font-mono">{formatCurrency(invoice.grandTotal, currency)}</span>
            </div>

            <div className="flex justify-between text-xs font-semibold text-emerald-700 pt-1">
              <span>Amount Paid</span>
              <span>{formatCurrency(invoice.paidAmount, currency)}</span>
            </div>

            {Number(invoice.balanceAmount) > 0 && (
              <div className="flex justify-between text-xs font-bold text-amber-700 bg-amber-50 p-2 rounded-lg">
                <span>Balance Due</span>
                <span>{formatCurrency(invoice.balanceAmount, currency)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment History (if any payments recorded) */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Payment Transactions
            </h5>
            <div className="space-y-1.5 text-xs">
              {invoice.payments.map((p: any) => (
                <div key={p.id} className="flex justify-between py-1.5 px-2.5 bg-slate-50 rounded-lg text-slate-700">
                  <span>
                    {format(new Date(p.paymentDate), "dd MMM yyyy")} •{" "}
                    <strong className="capitalize">{p.paymentMethod?.toLowerCase()}</strong>
                    {p.referenceNumber && ` (Ref: ${p.referenceNumber})`}
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(p.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
