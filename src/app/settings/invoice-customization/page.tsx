"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InvoiceDocument } from "@/components/billing/InvoiceDocument";
import { Palette, Layout, Eye, Check, Loader2, Image, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";

const BRAND_COLORS = [
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Emerald", hex: "#059669" },
  { name: "Slate", hex: "#334155" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Amber", hex: "#d97706" },
  { name: "Purple", hex: "#7c3aed" },
];

// Sample mock invoice data for live preview
const MOCK_INVOICE = {
  id: "preview-123",
  invoiceNumber: "INV-2026-0042",
  invoiceDate: new Date().toISOString(),
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  status: "ISSUED",
  isGst: true,
  isInterState: false,
  subtotal: 2500,
  discountType: "FIXED",
  discountValue: 100,
  discountAmount: 100,
  taxableAmount: 2400,
  cgstAmount: 216,
  sgstAmount: 216,
  igstAmount: 0,
  totalTax: 432,
  grandTotal: 2832,
  paidAmount: 2832,
  balanceAmount: 0,
  paymentMethod: "UPI",
  notes: "Thank you for shopping with us!",
  terms: "Goods once sold cannot be returned after 7 days.",
  customerName: "Walk-in Customer (Ramesh Sharma)",
  customerPhone: "+91 98765 43210",
  customerEmail: "ramesh@example.com",
  customerAddress: "Flat 4B, Green Park Apartments, Chennai",
  customerGstin: "33ABCDE1234F1Z5",
  organization: {
    name: "Apex Retail & Services",
    phone: "+91 98400 12345",
    email: "billing@apexretail.in",
    address: "100 Feet Road, Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560038",
    gstEnabled: true,
    gstin: "29AAAAA0000A1Z5",
    currency: "INR",
    invoiceTemplate: "CLASSIC",
    brandColor: "#4f46e5",
    showAddress: true,
    showContact: true,
    showGstin: true,
    footerMessage: "We appreciate your prompt business!",
  },
  items: [
    {
      id: "it-1",
      name: "Premium Wireless Mouse",
      description: "Ergonomic Bluetooth 5.0 rechargeable mouse",
      quantity: 2,
      unit: "pcs",
      unitPrice: 750,
      discountAmount: 50,
      taxRate: 18,
      totalAmount: 1652,
    },
    {
      id: "it-2",
      name: "Mechanical Keyboard Service",
      description: "Switch cleaning & keycap lube service",
      quantity: 1,
      unit: "job",
      unitPrice: 1000,
      discountAmount: 50,
      taxRate: 18,
      totalAmount: 1180,
    },
  ],
};

export default function InvoiceCustomizationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states for Invoice Customization
  const [invoiceTemplate, setInvoiceTemplate] = useState<"CLASSIC" | "MODERN" | "MINIMAL" | "COMPACT">("CLASSIC");
  const [brandColor, setBrandColor] = useState("#4f46e5");
  const [showAddress, setShowAddress] = useState(true);
  const [showContact, setShowContact] = useState(true);
  const [showGstin, setShowGstin] = useState(true);
  const [footerMessage, setFooterMessage] = useState("Thank you for your business!");
  const [logoUrl, setLogoUrl] = useState("");

  // Load existing organization settings
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/organizations/settings");
        const data = await res.json();
        if (data.success && data.organization) {
          const org = data.organization;
          if (org.invoiceTemplate) setInvoiceTemplate(org.invoiceTemplate);
          if (org.brandColor) setBrandColor(org.brandColor);
          if (org.showAddress !== undefined) setShowAddress(org.showAddress);
          if (org.showContact !== undefined) setShowContact(org.showContact);
          if (org.showGstin !== undefined) setShowGstin(org.showGstin);
          if (org.footerMessage) setFooterMessage(org.footerMessage);
          if (org.logoUrl) setLogoUrl(org.logoUrl);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // Update organization settings with customization payload
      const res = await fetch("/api/organizations/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceTemplate,
          brandColor,
          showAddress,
          showContact,
          showGstin,
          footerMessage: footerMessage.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
          // Preserve mandatory onboarding defaults
          name: MOCK_INVOICE.organization.name,
          businessType: "RETAIL",
          country: "India",
          currency: "INR",
          timezone: "Asia/Kolkata",
          dateFormat: "DD/MM/YYYY",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save invoice customization");

      setSuccessMsg("Invoice customization saved successfully! All new invoices will use this design.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save invoice customization");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Invoice Customization">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Invoice Customization & Live Preview">
      <div className="space-y-4">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
            </Link>
          </div>
          <span className="text-xs font-medium text-slate-400">
            Changes apply instantly to live preview on right
          </span>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* 2-Column Side-by-Side Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Customization Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <form onSubmit={handleSave} className="space-y-6">
              {/* 1. Template Selection */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Layout className="w-4 h-4" />
                    <CardTitle>Invoice Template</CardTitle>
                  </div>
                  <CardDescription>Select a layout style for printed and PDF bills</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  {[
                    {
                      id: "CLASSIC",
                      title: "Classic",
                      desc: "Traditional clean bordered layout",
                    },
                    {
                      id: "MODERN",
                      title: "Modern",
                      desc: "Colored banner header & sleek style",
                    },
                    {
                      id: "MINIMAL",
                      title: "Minimal",
                      desc: "Ultra clean, whitespace-first",
                    },
                    {
                      id: "COMPACT",
                      title: "Compact",
                      desc: "High density thermal/receipt fit",
                    },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setInvoiceTemplate(tpl.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        invoiceTemplate === tpl.id
                          ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{tpl.title}</span>
                        {invoiceTemplate === tpl.id && (
                          <Check className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-tight">{tpl.desc}</p>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* 2. Brand Accent Color */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Palette className="w-4 h-4" />
                    <CardTitle>Brand Accent Color</CardTitle>
                  </div>
                  <CardDescription>Primary color applied to titles, headers & totals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2.5">
                    {BRAND_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setBrandColor(c.hex)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                          brandColor === c.hex ? "scale-110 ring-2 ring-offset-2 ring-slate-400" : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {brandColor === c.hex && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Input
                      label="Custom Hex Color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      placeholder="#4f46e5"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 3. Business Branding & Logo */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Image className="w-4 h-4" />
                    <CardTitle>Logo & Business Details</CardTitle>
                  </div>
                  <CardDescription>Configure logo image and field visibility</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Business Logo URL"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    helperText="Paste direct image link (PNG or JPG)"
                  />

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700 block mb-1">Field Visibility Toggles</label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAddress}
                        onChange={(e) => setShowAddress(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Show Business Address on Bills</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showContact}
                        onChange={(e) => setShowContact(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Show Phone & Email Contact Info</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showGstin}
                        onChange={(e) => setShowGstin(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Show Business GSTIN on Bills</span>
                    </label>
                  </div>

                  <div className="pt-2">
                    <Input
                      label="Custom Footer Message"
                      value={footerMessage}
                      onChange={(e) => setFooterMessage(e.target.value)}
                      placeholder="e.g. Thank you for your business! Visit again."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <Button type="submit" size="lg" className="w-full" loading={saving} icon={<Check className="w-4 h-4" />}>
                Save Invoice Customization
              </Button>
            </form>
          </div>

          {/* Right Column: Live Interactive Preview (7 cols) */}
          <div className="lg:col-span-7 sticky top-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>LIVE PREVIEW</span>
              </div>
              <span className="text-[11px] bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full">
                Template: {invoiceTemplate}
              </span>
            </div>

            <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-xl bg-slate-100 p-2 sm:p-4">
              <InvoiceDocument
                invoice={MOCK_INVOICE}
                customization={{
                  invoiceTemplate,
                  brandColor,
                  showAddress,
                  showContact,
                  showGstin,
                  footerMessage,
                  logoUrl,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
