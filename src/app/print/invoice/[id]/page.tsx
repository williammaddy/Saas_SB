"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { InvoicePrintView } from "@/components/invoices/InvoicePrintView";
import "@/app/invoice-print.css";

export default function InvoicePrintPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const invoiceId = params.id as string;
  const formatType = (searchParams.get("format") as "A4" | "80mm" | "58mm") || "A4";
  const autoprint = searchParams.get("autoprint") === "true";

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvoice() {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}`);
        const data = await res.json();
        if (data.success && data.invoice) {
          setInvoice(data.invoice);
        } else {
          setError(data.error || "Invoice not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }

    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId]);

  // Set clean document title to prevent browser from printing unwanted URL strings in page headers
  useEffect(() => {
    if (invoice) {
      document.title = "";
    }
  }, [invoice]);

  // Auto trigger print if autoprint parameter is passed
  useEffect(() => {
    if (invoice && autoprint) {
      // Wait for fonts to be ready before printing
      document.fonts?.ready?.then(() => {
        const timer = setTimeout(() => {
          window.print();
        }, 300);
        return () => clearTimeout(timer);
      });
    }
  }, [invoice, autoprint]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white text-slate-800 font-sans p-6 text-center">
        <p className="font-bold text-sm">Preparing Invoice Print View...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white text-rose-600 font-sans p-6 text-center">
        <p className="font-bold text-sm">Error: {error || "Invoice not found"}</p>
      </div>
    );
  }

  return <InvoicePrintView invoice={invoice} formatType={formatType} />;
}
