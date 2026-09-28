import { NextResponse } from "next/server";
import { requireTenant, handleApiError } from "@/lib/tenant";
import { db } from "@/lib/db";
import { getSharedBrowser } from "@/lib/puppeteer";
import { numberToIndianWords, formatIndianCurrency } from "@/lib/billing/numberToWords";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { organization } = await requireTenant();
    const invoiceId = params.id;

    const invoice = await db.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId: organization.id,
      },
      include: {
        items: true,
        customer: true,
        organization: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    const org: any = invoice.organization || organization;
    const businessName = invoice.businessName || org.name || "Business Name";
    const businessAddress =
      invoice.businessAddress ||
      [org.address, org.city, org.state, org.pincode].filter(Boolean).join(", ");
    const businessPhone = invoice.businessPhone || org.phone;
    const businessEmail = invoice.businessEmail || org.email;
    const businessGstin = invoice.businessGstin || org.gstin;
    const brandColor = invoice.brandColor || org.brandColor || "#4f46e5";
    const logoUrl = (invoice as any).logoUrl || org.logoUrl;

    const isGstEnabled = invoice.isGst ?? org.gstEnabled ?? false;
    const isInterState = invoice.isInterState ?? false;

    // Phase 5: Strictly check if a real customer exists
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

    // Compute GST Summary
    const gstMap = new Map<number, { taxRate: number; taxableAmount: number; cgst: number; sgst: number; igst: number; totalTax: number }>();
    if (isGstEnabled && invoice.items) {
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

        const existing = gstMap.get(rate) || { taxRate: rate, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
        existing.taxableAmount += taxable;
        existing.cgst += cgst;
        existing.sgst += sgst;
        existing.igst += igst;
        existing.totalTax += tax;
        gstMap.set(rate, existing);
      }
    }
    const gstBreakdown = Array.from(gstMap.values()).sort((a, b) => a.taxRate - b.taxRate);

    // Self-contained HTML with zero margin & exact print styling
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title></title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; background: #ffffff; padding: 12mm; font-size: 10pt; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .title { font-size: 20pt; font-weight: 900; color: ${brandColor}; }
    .subtitle { text-align: right; }
    .badge { display: inline-block; background: ${brandColor}15; color: ${brandColor}; border: 1px solid ${brandColor}35; font-size: 8pt; font-weight: 900; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; margin-bottom: 6px; }
    .inv-num { font-size: 16pt; font-weight: 900; font-family: monospace; }
    .billed-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; margin-bottom: 16px; }
    .billed-title { font-size: 8pt; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    .billed-name { font-size: 13pt; font-weight: 900; color: #0f172a; }
    table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #cbd5e1; }
    table.items-table th { background: ${brandColor}; color: #ffffff; text-align: left; padding: 8px 10px; font-size: 8pt; text-transform: uppercase; font-weight: 800; border-right: 1px solid rgba(255,255,255,0.2); }
    table.items-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; font-size: 9pt; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    .avoid-break { page-break-inside: avoid; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; }
    .totals-box { display: flex; justify-content: space-between; gap: 20px; page-break-inside: avoid; margin-bottom: 16px; }
    .notes-section { width: 50%; font-size: 9pt; color: #334155; }
    .breakdown-box { width: 45%; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; font-size: 9pt; }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .grand-row { display: flex; justify-content: space-between; border-top: 2px solid #94a3b8; padding-top: 6px; font-size: 13pt; font-weight: 900; margin-top: 6px; }
    .gst-table { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; margin-top: 8px; font-size: 8pt; }
    .gst-table th { background: #e2e8f0; color: #0f172a; padding: 4px 6px; border: 1px solid #cbd5e1; }
    .gst-table td { padding: 4px 6px; border: 1px solid #cbd5e1; font-family: monospace; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 8pt; page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${logoUrl ? `<img src="${logoUrl}" style="height: 48px; margin-bottom: 6px; object-fit: contain;" />` : ""}
      <div class="title">${businessName}</div>
      ${businessAddress ? `<div style="font-size: 9pt; color: #475569;">${businessAddress}</div>` : ""}
      ${businessPhone || businessEmail ? `<div style="font-size: 9pt; color: #475569;">${[businessPhone && `Ph: ${businessPhone}`, businessEmail].filter(Boolean).join(" • ")}</div>` : ""}
      ${isGstEnabled && businessGstin ? `<div style="font-size: 9pt; font-weight: 800; margin-top: 4px;">GSTIN: ${businessGstin}</div>` : ""}
    </div>
    <div class="subtitle">
      <div class="badge">${isGstEnabled ? "Tax Invoice" : "Invoice"}</div>
      <div class="inv-num">${invoice.invoiceNumber}</div>
      <div style="font-size: 9pt; color: #475569; margin-top: 4px;">Date: ${format(new Date(invoice.invoiceDate), "dd MMM yyyy")}</div>
      ${invoice.paymentMethod ? `<div style="font-size: 9pt; color: #475569;">Payment Mode: <strong>${invoice.paymentMethod}</strong></div>` : ""}
      ${invoice.dueDate ? `<div style="font-size: 9pt; color: #475569;">Due Date: <strong>${format(new Date(invoice.dueDate), "dd MMM yyyy")}</strong></div>` : ""}
    </div>
  </div>

  ${hasRealCustomer ? `
  <div class="billed-box">
    <div>
      <div class="billed-title">Billed To</div>
      <div class="billed-name">${customerName}</div>
      ${customerPhone ? `<div style="font-size: 9pt;">Phone: ${customerPhone}</div>` : ""}
      ${customerEmail ? `<div style="font-size: 9pt;">Email: ${customerEmail}</div>` : ""}
      ${customerAddress ? `<div style="font-size: 9pt;">${customerAddress}</div>` : ""}
      ${isGstEnabled && customerGstin ? `<div style="font-size: 9pt; font-weight: 800; font-family: monospace;">GSTIN: ${customerGstin}</div>` : ""}
    </div>
  </div>
  ` : ""}

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 35px;" class="text-center">#</th>
        <th>Item Description</th>
        ${isGstEnabled ? `<th style="width: 70px;" class="text-center">HSN/SAC</th>` : ""}
        <th style="width: 50px;" class="text-center">Qty</th>
        <th style="width: 50px;" class="text-center">Unit</th>
        <th style="width: 90px;" class="text-right">Rate (₹)</th>
        ${Number(invoice.discountAmount) > 0 ? `<th style="width: 75px;" class="text-right">Disc.</th>` : ""}
        ${isGstEnabled ? `<th style="width: 55px;" class="text-center">GST %</th>` : ""}
        <th style="width: 100px;" class="text-right">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items?.map((it: any, idx: number) => `
        <tr>
          <td class="text-center font-mono font-bold">${idx + 1}</td>
          <td class="font-bold">${it.name}${it.description ? `<br/><span style="font-size: 8pt; color: #64748b; font-weight: normal;">${it.description}</span>` : ""}</td>
          ${isGstEnabled ? `<td class="text-center font-mono">${it.hsnCode || "-"}</td>` : ""}
          <td class="text-center font-mono font-bold">${Number(it.quantity)}</td>
          <td class="text-center">${it.unit || "pcs"}</td>
          <td class="text-right font-mono">${formatIndianCurrency(Number(it.unitPrice), "")}</td>
          ${Number(invoice.discountAmount) > 0 ? `<td class="text-right font-mono">${Number(it.discountAmount) > 0 ? formatIndianCurrency(Number(it.discountAmount), "") : "-"}</td>` : ""}
          ${isGstEnabled ? `<td class="text-center font-bold">${Number(it.taxRate)}%</td>` : ""}
          <td class="text-right font-mono font-bold">${formatIndianCurrency(Number(it.totalAmount), "")}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals-box">
    <div class="notes-section">
      <div style="background: #f1f5f9; padding: 8px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #cbd5e1;">
        <div style="font-size: 7.5pt; font-weight: 800; text-transform: uppercase; color: #64748b;">Amount In Words</div>
        <div style="font-weight: 800; color: #0f172a; font-size: 8.5pt;">${numberToIndianWords(Number(invoice.grandTotal))}</div>
      </div>

      ${invoice.notes ? `<div style="margin-bottom: 6px;"><strong>Notes:</strong> ${invoice.notes}</div>` : ""}
      <div style="margin-bottom: 6px;"><strong>Terms & Conditions:</strong> ${invoice.terms || org.terms || "Goods once sold will not be taken back."}</div>
      ${(org.bankDetails || org.upiId) ? `
        <div style="background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-family: monospace; margin-top: 8px;">
          <div style="font-weight: 800; text-transform: uppercase; font-size: 7.5pt; font-family: sans-serif; color: #475569;">Bank Details</div>
          ${org.bankDetails ? `<div>${org.bankDetails}</div>` : ""}
          ${org.upiId ? `<div><strong>UPI ID:</strong> ${org.upiId}</div>` : ""}
        </div>
      ` : ""}
    </div>

    <div class="breakdown-box">
      <div class="summary-row"><span>Subtotal:</span><strong class="font-mono">${formatIndianCurrency(Number(invoice.subtotal))}</strong></div>
      ${Number(invoice.discountAmount) > 0 ? `<div class="summary-row" style="color: #047857;"><span>Discount:</span><strong class="font-mono">-${formatIndianCurrency(Number(invoice.discountAmount))}</strong></div>` : ""}
      ${isGstEnabled ? `
        <div class="summary-row" style="border-top: 1px solid #e2e8f0; padding-top: 4px;"><span>Taxable Value:</span><span class="font-mono font-bold">${formatIndianCurrency(Number(invoice.taxableAmount))}</span></div>
        ${isInterState ? `<div class="summary-row"><span>IGST Total:</span><span class="font-mono font-bold">${formatIndianCurrency(Number(invoice.igstAmount))}</span></div>` : `
          <div class="summary-row"><span>CGST Total:</span><span class="font-mono font-bold">${formatIndianCurrency(Number(invoice.cgstAmount))}</span></div>
          <div class="summary-row"><span>SGST Total:</span><span class="font-mono font-bold">${formatIndianCurrency(Number(invoice.sgstAmount))}</span></div>
        `}
      ` : ""}
      <div class="grand-row"><span>Grand Total:</span><span class="font-mono" style="color: ${brandColor}">${formatIndianCurrency(Number(invoice.grandTotal))}</span></div>
      ${Number(invoice.paidAmount) > 0 ? `<div class="summary-row" style="color: #047857; margin-top: 6px;"><span>Paid Amount:</span><span class="font-mono font-bold">${formatIndianCurrency(Number(invoice.paidAmount))}</span></div>` : ""}
      ${Number(invoice.balanceAmount) > 0 ? `<div class="summary-row" style="color: #b45309; font-weight: bold; background: #fef3c7; padding: 4px; border-radius: 4px; margin-top: 4px;"><span>Balance Due:</span><span class="font-mono">${formatIndianCurrency(Number(invoice.balanceAmount))}</span></div>` : ""}
    </div>
  </div>

  ${isGstEnabled && gstBreakdown.length > 0 ? `
  <div class="avoid-break" style="margin-top: 12px; border-top: 1px solid #cbd5e1; padding-top: 8px;">
    <div style="font-size: 7.5pt; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">GST Tax Summary</div>
    <table class="gst-table">
      <thead>
        <tr>
          <th>Tax Rate</th>
          <th class="text-right">Taxable Value (₹)</th>
          ${isInterState ? `<th class="text-right">IGST (₹)</th>` : `<th class="text-right">CGST (₹)</th><th class="text-right">SGST (₹)</th>`}
          <th class="text-right">Total Tax (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${gstBreakdown.map((g) => `
          <tr>
            <td><strong>${g.taxRate}% GST</strong></td>
            <td class="text-right">${formatIndianCurrency(g.taxableAmount, "")}</td>
            ${isInterState ? `<td class="text-right">${formatIndianCurrency(g.igst, "")}</td>` : `<td class="text-right">${formatIndianCurrency(g.cgst, "")}</td><td class="text-right">${formatIndianCurrency(g.sgst, "")}</td>`}
            <td class="text-right"><strong>${formatIndianCurrency(g.totalTax, "")}</strong></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <div class="footer">
    <div style="font-style: italic; color: #475569;">"${invoice.footerMessage || org.footerMessage || "Thank you for your business!"}"</div>
    <div style="text-align: right;">
      <div style="font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase;">For ${businessName}</div>
      <div style="height: 36px;"></div>
      <div style="font-weight: 800; border-top: 1px solid #94a3b8; padding-top: 2px; min-width: 140px; text-align: center; display: inline-block;">Authorised Signatory</div>
    </div>
  </div>

  <div style="text-align: center; font-size: 7.5pt; color: #94a3b8; margin-top: 16px; border-top: 1px solid #f1f5f9; padding-top: 4px;">
    This is a computer-generated invoice.
  </div>
</body>
</html>
    `;

    // Reuse shared Puppeteer browser instance (Phase 3 requirement)
    const browser = await getSharedBrowser();
    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });

    await page.close();

    const sanitizeFilename = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_");

    return new Response(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Invoice-${sanitizeFilename}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
