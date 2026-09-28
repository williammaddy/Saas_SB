"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { GST_STATES, getStateCodeFromGstin } from "@/lib/billing/gst";
import { Building2, Receipt, FileText, Check, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("RETAIL");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("33");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("India");
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");

  // GST Settings
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstin, setGstin] = useState("");
  const [defaultTaxRate, setDefaultTaxRate] = useState("18");

  // Invoice Settings
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState("1");
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("Due on Receipt");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/organizations/settings");
        const data = await res.json();
        if (data.success && data.organization) {
          const org = data.organization;
          setName(org.name || "");
          setBusinessType(org.businessType || "RETAIL");
          setPhone(org.phone || "");
          setEmail(org.email || "");
          setAddress(org.address || "");
          setCity(org.city || "");
          if (org.stateCode) setStateCode(org.stateCode);
          setPincode(org.pincode || "");
          setCountry(org.country || "India");
          setCurrency(org.currency || "INR");
          setTimezone(org.timezone || "Asia/Kolkata");
          setDateFormat(org.dateFormat || "DD/MM/YYYY");

          setGstEnabled(org.gstEnabled || false);
          setGstin(org.gstin || "");
          setDefaultTaxRate(String(org.defaultTaxRate || 18));

          setInvoicePrefix(org.invoicePrefix || "INV-");
          setNextInvoiceNumber(String(org.nextInvoiceNumber || 1));
          setDefaultPaymentTerms(org.defaultPaymentTerms || "Due on Receipt");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleGstinChange = (val: string) => {
    const cleaned = val.toUpperCase();
    setGstin(cleaned);
    const code = getStateCodeFromGstin(cleaned);
    if (code) setStateCode(code);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const selectedStateObj = GST_STATES.find((s) => s.code === stateCode);

      const payload = {
        name: name.trim(),
        businessType,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: selectedStateObj?.name,
        stateCode: gstEnabled ? stateCode : undefined,
        pincode: pincode.trim() || undefined,
        country,
        currency,
        timezone,
        dateFormat,
        gstEnabled,
        gstin: gstEnabled ? gstin.trim() : undefined,
        defaultTaxRate: gstEnabled ? Number(defaultTaxRate) : 0,
        invoicePrefix: invoicePrefix.trim() || "INV-",
        nextInvoiceNumber: Number(nextInvoiceNumber) || 1,
        defaultPaymentTerms: defaultPaymentTerms.trim() || "Due on Receipt",
      };

      const res = await fetch("/api/organizations/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update settings");
      }

      setSuccessMsg("Settings saved successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Settings">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Business Settings">
      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
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

        {/* Section 1: Business Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-indigo-600">
              <Building2 className="w-4 h-4" />
              <CardTitle>Business Profile</CardTitle>
            </div>
            <CardDescription>Public details displayed on your bills and customer invoices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Business Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Select
                label="Business Type *"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                options={[
                  { value: "RETAIL", label: "Retail Shop / Store" },
                  { value: "SALON", label: "Barber / Salon / Beauty" },
                  { value: "SERVICE", label: "General Service Business" },
                  { value: "WHOLESALE", label: "Wholesale / Distribution" },
                  { value: "FREELANCER", label: "Freelancer / Digital Creator" },
                  { value: "CONSULTANT", label: "Consultant / Agency" },
                  { value: "REPAIR", label: "Repair / Workshop" },
                  { value: "OTHER", label: "Other Business" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Official Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
              />
              <Input
                label="Official Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@business.com"
              />
            </div>

            <Input
              label="Business Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Door No, Street Name, Complex"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Chennai"
              />
              <Input
                label="Pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="e.g. 600001"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: GST & Tax Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-indigo-600">
              <Receipt className="w-4 h-4" />
              <CardTitle>Tax & GST Configuration</CardTitle>
            </div>
            <CardDescription>Determine how taxes and invoices calculate for your trade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                GST Registration Status
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setGstEnabled(true)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    gstEnabled
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  GST Registered
                </button>
                <button
                  type="button"
                  onClick={() => setGstEnabled(false)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    !gstEnabled
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Non-GST / Composition
                </button>
              </div>
            </div>

            {gstEnabled && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="GSTIN *"
                    value={gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder="15-character GSTIN"
                    required
                  />

                  <Select
                    label="Registered Business State *"
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    options={GST_STATES.map((s) => ({
                      value: s.code,
                      label: `${s.code} - ${s.name}`,
                    }))}
                  />
                </div>

                <Select
                  label="Default Tax Rate (%)"
                  value={defaultTaxRate}
                  onChange={(e) => setDefaultTaxRate(e.target.value)}
                  options={[
                    { value: "0", label: "0% - Exempt" },
                    { value: "5", label: "5% (2.5% CGST + 2.5% SGST)" },
                    { value: "12", label: "12% (6% CGST + 6% SGST)" },
                    { value: "18", label: "18% (9% CGST + 9% SGST) - Standard" },
                    { value: "28", label: "28% (14% CGST + 14% SGST)" },
                  ]}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Invoicing Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-indigo-600">
              <FileText className="w-4 h-4" />
              <CardTitle>Invoice Numbering & Terms</CardTitle>
            </div>
            <CardDescription>Custom prefix and terms printed on outgoing customer bills</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Invoice Prefix"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="e.g. INV- or BILL-"
                helperText="Appears before sequential bill numbers (e.g. INV-001)"
              />

              <Input
                label="Next Sequence Number"
                type="number"
                min="1"
                value={nextInvoiceNumber}
                onChange={(e) => setNextInvoiceNumber(e.target.value)}
                helperText="Next bill created will use this counter"
              />
            </div>

            <Input
              label="Default Payment Terms / Notes"
              value={defaultPaymentTerms}
              onChange={(e) => setDefaultPaymentTerms(e.target.value)}
              placeholder="e.g. Due on Receipt. Thank you for your business!"
            />
          </CardContent>
        </Card>

        {/* Section 4: Invoice Branding & Template Customization */}
        <Card className="border-indigo-200 bg-indigo-50/40">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-600" />
                Invoice Design & Branding Customization
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                Choose from 4 professional templates (Classic, Modern, Minimal, Compact), pick your brand accent color, and see a live side-by-side preview!
              </p>
            </div>

            <a
              href="/settings/invoice-customization"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors shrink-0"
            >
              Customize Invoice Design →
            </a>
          </CardContent>
        </Card>

        {/* Save Changes Button */}
        <div className="flex justify-end pt-2">
          <Button type="submit" size="lg" loading={saving} icon={<Check className="w-4 h-4" />}>
            Save All Settings
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
