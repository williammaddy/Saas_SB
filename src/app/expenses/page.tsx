"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/billing/calculator";
import { format } from "date-fns";
import { Plus, CreditCard, TrendingDown, Calendar } from "lucide-react";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Add Expense form
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("RENT");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const q = categoryFilter !== "ALL" ? `?category=${categoryFilter}` : "";
      const res = await fetch(`/api/expenses${q}`);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses || []);
        setTotalAmount(data.totalAmount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          category,
          amount: Number(amount),
          paymentMethod,
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log expense");
      }

      setIsAddOpen(false);
      setAmount("");
      setDescription("");
      fetchExpenses();
    } catch (err: any) {
      setError(err.message || "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { value: "ALL", label: "All Categories" },
    { value: "RENT", label: "Rent" },
    { value: "SALARY", label: "Salary / Wages" },
    { value: "ELECTRICITY", label: "Electricity / Power" },
    { value: "INTERNET", label: "Internet & Phone" },
    { value: "TRANSPORT", label: "Transport / Delivery" },
    { value: "MARKETING", label: "Marketing / Ads" },
    { value: "MAINTENANCE", label: "Maintenance & Repairs" },
    { value: "OTHER", label: "Other Expenses" },
  ];

  return (
    <AppLayout
      title="Expenses"
      actions={
        <Button size="sm" onClick={() => setIsAddOpen(true)} icon={<Plus className="w-4 h-4" />}>
          + Log Expense
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Top Summary KPI Banner */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Filtered Expenses</p>
              <p className="text-2xl font-black text-rose-600 font-mono tracking-tight">
                {formatCurrency(totalAmount)}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-56">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={categories}
            />
          </div>
        </div>

        {/* Expenses List Card */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16 text-xs text-slate-400">Loading expenses...</div>
            ) : expenses.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="w-6 h-6" />}
                title="No expenses logged"
                description="Keep your operational costs under control by tracking rent, salaries, utilities, and daily spending."
                actionLabel="+ Log First Expense"
                onAction={() => setIsAddOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {format(new Date(exp.date), "dd MMM yyyy")}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-block bg-slate-100 text-slate-800 font-medium px-2 py-0.5 rounded text-[11px] capitalize">
                            {exp.category.toLowerCase().replace("_", " ")}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 max-w-sm truncate">
                          {exp.description || <span className="text-slate-400 italic">No description</span>}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 capitalize">
                          {exp.paymentMethod.toLowerCase()}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(exp.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Log Expense Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Log New Expense"
        description="Record an operational business expense"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date *"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Input
              label="Amount (₹) *"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category *"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categories.filter((c) => c.value !== "ALL")}
            />

            <Select
              label="Payment Method *"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: "CASH", label: "Cash" },
                { value: "UPI", label: "UPI" },
                { value: "CARD", label: "Card" },
                { value: "BANK_TRANSFER", label: "Bank Transfer" },
                { value: "OTHER", label: "Other" },
              ]}
            />
          </div>

          <Input
            label="Description / Remark (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Electricity bill for September, office tea & snacks"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
