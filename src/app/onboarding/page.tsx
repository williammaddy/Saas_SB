"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { GST_STATES, getStateCodeFromGstin } from "@/lib/billing/gst";
import { Check, Building2, Globe2, Receipt, ArrowRight, ArrowLeft } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Business Profile
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("RETAIL");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  // Step 2: Regional Defaults
  const [country, setCountry] = useState("India");
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");

  // Step 3: GST Settings
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstin, setGstin] = useState("");
  const [stateCode, setStateCode] = useState("33"); // Tamil Nadu default
  const [defaultTaxRate, setDefaultTaxRate] = useState(18);

  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.organization) {
          setName(data.organization.name || "");
          setBusinessType(data.organization.businessType || "RETAIL");
          setPhone(data.organization.phone || "");
          setEmail(data.organization.email || data.user.email || "");
          setAddress(data.organization.address || "");
          setGstEnabled(data.organization.gstEnabled || false);
          if (data.organization.stateCode) setStateCode(data.organization.stateCode);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadOrg();
  }, []);

  const handleGstinChange = (val: string) => {
    const cleaned = val.toUpperCase();
    setGstin(cleaned);
    const extractedCode = getStateCodeFromGstin(cleaned);
    if (extractedCode) {
      setStateCode(extractedCode);
    }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const selectedStateObj = GST_STATES.find((s) => s.code === stateCode);

      const payload = {
        name,
        businessType,
        phone,
        email,
        address,
        city,
        pincode,
        state: selectedStateObj?.name,
        country,
        currency,
        timezone,
        dateFormat,
        gstEnabled,
        gstin: gstEnabled ? gstin : undefined,
        stateCode: gstEnabled ? stateCode : undefined,
        defaultTaxRate: gstEnabled ? defaultTaxRate : 0,
      };

      const res = await fetch("/api/organizations/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete onboarding");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save setup");
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-xs text-slate-500">Preparing setup...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto w-full">
        {/* Wizard Header */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-700 flex items-center justify-center font-black text-white text-lg mx-auto shadow-md shadow-brand-700/30">
            laxz*
          </div>
          <h2 className="mt-3 text-xl font-bold text-slate-900">Set Up Your Business</h2>
          <p className="text-xs text-slate-500 mt-0.5">Step {step} of 3 • Takes less than 1 minute</p>

          {/* Stepper Dots */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step
                    ? "w-8 bg-brand-700"
                    : s < step
                    ? "w-4 bg-emerald-500"
                    : "w-4 bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wizard Step Card */}
        <Card className="border-slate-200 shadow-md">
          <CardContent className="p-6 sm:p-8">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* STEP 1: Business Profile */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-brand-700 mb-2">
                  <Building2 className="w-4 h-4" />
                  <h3 className="text-sm font-bold text-slate-900">Step 1: Business Profile</h3>
                </div>

                <Input
                  label="Business Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kumar Store / Chennai Salon"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@business.com"
                  />
                </div>

                <Input
                  label="Business Address (Optional)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Shop No. 12, Main Bazaar"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Chennai"
                  />
                  <Input
                    label="Pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="600001"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      if (!name.trim()) {
                        setError("Please enter your business name");
                        return;
                      }
                      setError(null);
                      setStep(2);
                    }}
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    Continue to Region
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Regional Defaults */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-brand-700 mb-2">
                  <Globe2 className="w-4 h-4" />
                  <h3 className="text-sm font-bold text-slate-900">Step 2: Region & Currency</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    options={[
                      { value: "India", label: "India" },
                      { value: "United States", label: "United States" },
                      { value: "United Kingdom", label: "United Kingdom" },
                      { value: "United Arab Emirates", label: "United Arab Emirates" },
                      { value: "Singapore", label: "Singapore" },
                      { value: "Other", label: "Other" },
                    ]}
                  />

                  <Select
                    label="Currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    options={[
                      { value: "INR", label: "INR (₹) - Indian Rupee" },
                      { value: "USD", label: "USD ($) - US Dollar" },
                      { value: "EUR", label: "EUR (€) - Euro" },
                      { value: "GBP", label: "GBP (£) - British Pound" },
                      { value: "AED", label: "AED - UAE Dirham" },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    options={[
                      { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
                      { value: "America/New_York", label: "America/New_York (EST)" },
                      { value: "Europe/London", label: "Europe/London (GMT)" },
                      { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
                      { value: "UTC", label: "UTC" },
                    ]}
                  />

                  <Select
                    label="Date Format"
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    options={[
                      { value: "DD/MM/YYYY", label: "DD/MM/YYYY (Standard India)" },
                      { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
                      { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
                    ]}
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    icon={<ArrowLeft className="w-4 h-4" />}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    Continue to Tax
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Tax / GST Settings */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-brand-700 mb-2">
                  <Receipt className="w-4 h-4" />
                  <h3 className="text-sm font-bold text-slate-900">Step 3: GST Configuration</h3>
                </div>

                {/* GST toggle buttons */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Are you GST Registered?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGstEnabled(true)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        gstEnabled
                          ? "bg-brand-700 text-white border-brand-700 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Yes, GST Registered
                    </button>
                    <button
                      type="button"
                      onClick={() => setGstEnabled(false)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        !gstEnabled
                          ? "bg-brand-700 text-white border-brand-700 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      No / Composition / Non-GST
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {!gstEnabled
                      ? "Invoices will be clean commercial bills without tax jargon."
                      : "Automatic CGST+SGST or IGST calculation will be enabled."}
                  </p>
                </div>

                {gstEnabled && (
                  <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                    <Input
                      label="GSTIN *"
                      value={gstin}
                      onChange={(e) => handleGstinChange(e.target.value)}
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      required
                    />

                    <Select
                      label="Business State *"
                      value={stateCode}
                      onChange={(e) => setStateCode(e.target.value)}
                      options={GST_STATES.map((s) => ({
                        value: s.code,
                        label: `${s.code} - ${s.name}`,
                      }))}
                    />

                    <Select
                      label="Default Tax Rate *"
                      value={String(defaultTaxRate)}
                      onChange={(e) => setDefaultTaxRate(Number(e.target.value))}
                      options={[
                        { value: "0", label: "0% - Exempt / Nil" },
                        { value: "5", label: "5% (2.5% CGST + 2.5% SGST)" },
                        { value: "12", label: "12% (6% CGST + 6% SGST)" },
                        { value: "18", label: "18% (9% CGST + 9% SGST) - Common" },
                        { value: "28", label: "28% (14% CGST + 14% SGST)" },
                      ]}
                    />
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    icon={<ArrowLeft className="w-4 h-4" />}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    loading={submitting}
                    onClick={handleComplete}
                    icon={<Check className="w-4 h-4" />}
                  >
                    Launch Laxzflow
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
