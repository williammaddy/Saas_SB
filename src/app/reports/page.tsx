"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/billing/calculator";
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  Award,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function ReportsPage() {
  const [range, setRange] = useState<"TODAY" | "THIS_WEEK" | "THIS_MONTH" | "ALL" | "CUSTOM">("THIS_MONTH");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("range", range);
      if (range === "CUSTOM" && startDate) {
        params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [range]);

  const summary = data?.summary || {};
  const expenseByCategory = data?.expenseByCategory || {};
  const topSellingItems = data?.topSellingItems || [];
  const outstandingInvoices = data?.outstandingInvoices || [];

  return (
    <AppLayout title="Business Reports">
      <div className="space-y-6">
        {/* Range Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
            {[
              { id: "TODAY", label: "Today" },
              { id: "THIS_WEEK", label: "This Week" },
              { id: "THIS_MONTH", label: "This Month" },
              { id: "ALL", label: "All Time" },
              { id: "CUSTOM", label: "Custom Dates" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRange(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  range === tab.id
                    ? "bg-indigo-600 text-white font-bold shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {range === "CUSTOM" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-xs text-slate-400">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <Button size="sm" onClick={() => fetchReports()}>
                Apply
              </Button>
            </div>
          )}
        </div>

        {/* 4 Summary Scorecards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gross Sales</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono">
                {formatCurrency(summary.totalSales || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{data?.invoicesCount || 0} invoices issued</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Expenses</span>
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-black text-rose-600 font-mono">
                {formatCurrency(summary.totalExpenses || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{data?.expensesCount || 0} expenses recorded</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Net Margin</span>
                <Award className="w-4 h-4 text-indigo-500" />
              </div>
              <p className={`text-2xl font-black font-mono ${summary.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatCurrency(summary.netProfit || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Gross sales minus expenses</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-amber-50/40">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Outstanding Due</span>
                <CreditCard className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-700 font-mono">
                {formatCurrency(summary.totalOutstanding || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Pending payments to collect</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Report Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Items */}
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {topSellingItems.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No sales recorded in this time period.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {topSellingItems.map((it: any, index: number) => (
                    <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">{it.name}</p>
                          <p className="text-[11px] text-slate-400">Quantity Sold: {it.quantity}</p>
                        </div>
                      </div>
                      <p className="font-mono font-bold text-slate-900">
                        {formatCurrency(it.totalRevenue)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses by Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {Object.keys(expenseByCategory).length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No expenses recorded in this period.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {Object.entries(expenseByCategory).map(([cat, amt]: [string, any]) => (
                    <div key={cat} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <span className="font-medium text-slate-800 capitalize">
                        {cat.toLowerCase().replace("_", " ")}
                      </span>
                      <span className="font-mono font-bold text-rose-600">
                        {formatCurrency(amt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Highest Outstanding Invoices to Collect */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending Receivables by Invoice</CardTitle>
            <Link href="/invoices?status=ISSUED">
              <Button variant="ghost" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                All Unpaid
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {outstandingInvoices.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                🎉 No pending customer balances in the system!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4 text-right">Invoice Total</th>
                      <th className="py-3 px-4 text-right">Paid So Far</th>
                      <th className="py-3 px-4 text-right">Pending Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {outstandingInvoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                          <Link href={`/invoices/${inv.id}`} className="hover:underline">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{inv.customerName}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {formatCurrency(inv.grandTotal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-600">
                          {formatCurrency(inv.paidAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                          {formatCurrency(inv.balanceAmount)}
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
