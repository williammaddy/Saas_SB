"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuickBill } from "@/components/billing/QuickBill";
import { Loader2 } from "lucide-react";

export default function NewBillingPage() {
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch("/api/organizations/settings");
        const data = await res.json();
        if (data.success) {
          setOrg(data.organization);
        }
      } catch (err) {
        console.error("Failed to load organization settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadOrg();
  }, []);

  return (
    <AppLayout title="New Bill / Quick Checkout">
      {loading || !org ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-900 animate-spin" />
        </div>
      ) : (
        <QuickBill organization={org} />
      )}
    </AppLayout>
  );
}
