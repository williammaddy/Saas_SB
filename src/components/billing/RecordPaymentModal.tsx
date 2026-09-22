"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/billing/calculator";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onPaymentRecorded: () => void;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  invoice,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState(invoice ? String(invoice.balanceAmount) : "0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const paymentVal = Number(amount);
    if (isNaN(paymentVal) || paymentVal <= 0) {
      setError("Please enter a valid positive payment amount");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: paymentVal,
          paymentMethod,
          referenceNumber: referenceNumber || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record payment");
      }

      onPaymentRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      description={`Invoice: ${invoice.invoiceNumber} • Outstanding Balance: ${formatCurrency(invoice.balanceAmount, invoice.organization?.currency)}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div>
          <Input
            label="Payment Amount"
            type="number"
            step="0.01"
            min="0.01"
            max={invoice.balanceAmount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            helperText={`Max payable: ${formatCurrency(invoice.balanceAmount, invoice.organization?.currency)}`}
          />
        </div>

        <div>
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { value: "CASH", label: "Cash" },
              { value: "UPI", label: "UPI / QR Code" },
              { value: "CARD", label: "Debit / Credit Card" },
              { value: "BANK_TRANSFER", label: "Bank Transfer" },
              { value: "OTHER", label: "Other" },
            ]}
          />
        </div>

        <div>
          <Input
            label="Reference / Transaction ID (Optional)"
            placeholder="e.g. UPI Ref / Cheque No"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />
        </div>

        <div>
          <Input
            label="Notes (Optional)"
            placeholder="Payment note"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Confirm Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
