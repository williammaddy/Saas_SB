"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { InvoiceDocument } from "@/components/billing/InvoiceDocument";
import { RecordPaymentModal } from "@/components/billing/RecordPaymentModal";
import { Loader2 } from "lucide-react";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const data = await res.json();
      if (data.success) {
        setInvoice(data.invoice);
      } else {
        router.push("/invoices");
      }
    } catch (err) {
      console.error("Failed to load invoice:", err);
      router.push("/invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const handleCancelInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CANCEL" }),
      });
      const data = await res.json();
      if (data.success) {
        fetchInvoice();
      } else {
        alert(data.error || "Failed to cancel invoice");
      }
    } catch (err) {
      console.error(err);
      alert("Error cancelling invoice");
    }
  };

  return (
    <AppLayout title={invoice ? `Invoice ${invoice.invoiceNumber}` : "Invoice Details"}>
      {loading || !invoice ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-900 animate-spin" />
        </div>
      ) : (
        <>
          <InvoiceDocument
            invoice={invoice}
            onBack={() => router.push("/invoices")}
            onRecordPayment={() => setIsPaymentModalOpen(true)}
            onCancelInvoice={handleCancelInvoice}
          />

          <RecordPaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            invoice={invoice}
            onPaymentRecorded={() => {
              setIsPaymentModalOpen(false);
              fetchInvoice();
            }}
          />
        </>
      )}
    </AppLayout>
  );
}
