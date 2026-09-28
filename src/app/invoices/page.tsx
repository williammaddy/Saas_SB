"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/billing/calculator";
import { format } from "date-fns";
import { Search, Receipt, Eye } from "lucide-react";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/invoices?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices();
  };

  return (
    <AppLayout title="Invoices">
      <div className="space-y-4">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
            <Input
              placeholder="Search invoice number, customer, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </form>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 overflow-x-auto text-xs font-medium">
            {["ALL", "PAID", "PARTIALLY_PAID", "ISSUED", "CANCELLED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  statusFilter === st
                    ? "bg-indigo-600 text-white font-bold shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st === "ALL" ? "All" : st.replace("_", " ").toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices Table Card */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16 text-xs text-slate-400">Loading invoices...</div>
            ) : invoices.length === 0 ? (
              <EmptyState
                icon={<Receipt className="w-6 h-6" />}
                title="No invoices found"
                description={
                  search || statusFilter !== "ALL"
                    ? "No invoices matched your current search filters."
                    : "Create your first customer bill to start tracking transactions."
                }
                actionLabel="+ Create First Bill"
                onAction={() => (window.location.href = "/billing/new")}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-right">Paid</th>
                      <th className="py-3 px-4 text-right">Balance</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                          <Link href={`/invoices/${inv.id}`} className="hover:underline">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {format(new Date(inv.invoiceDate), "dd MMM yyyy")}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          {inv.customerName && inv.customerName.trim() !== "" && inv.customerName.trim() !== "Walk-in Customer" ? (
                            <>
                              {inv.customerName}
                              {inv.customerPhone && (
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {inv.customerPhone}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(inv.grandTotal)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-600">
                          {formatCurrency(inv.paidAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700">
                          {Number(inv.balanceAmount) > 0 ? (
                            <span className="text-amber-600">{formatCurrency(inv.balanceAmount)}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link href={`/invoices/${inv.id}`}>
                            <Button variant="outline" size="sm" icon={<Eye className="w-3.5 h-3.5" />}>
                              View
                            </Button>
                          </Link>
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
    </AppLayout>
  );
}
