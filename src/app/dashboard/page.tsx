"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { RecordPaymentModal } from "@/components/billing/RecordPaymentModal";
import { formatCurrency } from "@/lib/billing/calculator";
import { format } from "date-fns";
import {
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Users,
  PlusCircle,
  Plus,
  Receipt,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [salesFilter, setSalesFilter] = useState<"today" | "week" | "month">("today");
  const [loading, setLoading] = useState(true);
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard");
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const metrics = data?.metrics || {};
  const recentInvoices = data?.recentInvoices || [];
  const pendingInvoices = data?.pendingInvoices || [];
  const lowStockItems = data?.lowStockItems || [];

  const currentSalesAmount =
    salesFilter === "today"
      ? metrics.todaySales || 0
      : salesFilter === "week"
      ? metrics.weekSales || 0
      : metrics.monthSales || 0;

  return (
    <AppLayout title="Business Dashboard">
      <div className="space-y-6">
        {/* Quick actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Today</h2>
            <p className="text-sm text-slate-500">Sales, collections, and inventory at a glance</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/billing/new">
              <Button size="md" icon={<PlusCircle className="w-4 h-4" />}>
                New bill
              </Button>
            </Link>
            <Link href="/customers">
              <Button variant="outline" size="md" icon={<Plus className="w-3.5 h-3.5" />}>
                Customer
              </Button>
            </Link>
            <Link href="/items">
              <Button variant="outline" size="md" icon={<Plus className="w-3.5 h-3.5" />}>
                Item
              </Button>
            </Link>
            <Link href="/expenses">
              <Button variant="outline" size="md" icon={<Plus className="w-3.5 h-3.5" />}>
                Expense
              </Button>
            </Link>
          </div>
        </div>

        {/* Primary KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Card 1: Sales with Period Toggle */}
          <Card className="col-span-2 sm:col-span-1 lg:col-span-1 border-slate-200/80">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Sales</span>
                <div className="flex bg-slate-100 p-0.5 rounded text-[10px] font-medium text-slate-600">
                  <button
                    onClick={() => setSalesFilter("today")}
                    className={`px-1.5 py-0.5 rounded ${salesFilter === "today" ? "bg-white font-bold text-slate-900 shadow-xs" : ""}`}
                  >
                    1D
                  </button>
                  <button
                    onClick={() => setSalesFilter("week")}
                    className={`px-1.5 py-0.5 rounded ${salesFilter === "week" ? "bg-white font-bold text-slate-900 shadow-xs" : ""}`}
                  >
                    1W
                  </button>
                  <button
                    onClick={() => setSalesFilter("month")}
                    className={`px-1.5 py-0.5 rounded ${salesFilter === "month" ? "bg-white font-bold text-slate-900 shadow-xs" : ""}`}
                  >
                    1M
                  </button>
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                {formatCurrency(currentSalesAmount)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {salesFilter === "today" ? "Today" : salesFilter === "week" ? "This week" : "This month"}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Pending Payments */}
          <Card className="border-slate-200/80">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending</span>
                <CreditCard className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xl sm:text-2xl font-semibold text-amber-600 tracking-tight">
                {formatCurrency(metrics.pendingPayments || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Unpaid customer balance</p>
            </CardContent>
          </Card>

          {/* Card 3: Today's Expenses */}
          <Card className="border-slate-200/80">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Expenses</span>
                <TrendingUp className="w-4 h-4 text-rose-500 rotate-180" />
              </div>
              <p className="text-xl sm:text-2xl font-semibold text-rose-600 tracking-tight">
                {formatCurrency(metrics.todayExpenses || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Today&apos;s logged expenses</p>
            </CardContent>
          </Card>

          {/* Card 4: Total Customers */}
          <Card className="border-slate-200/80">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Customers</span>
                <Users className="w-4 h-4 text-slate-800" />
              </div>
              <p className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                {metrics.totalCustomers || 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Active customer records</p>
            </CardContent>
          </Card>

          {/* Card 5: Low Stock Items */}
          <Card className={metrics.lowStockCount > 0 ? "border-amber-300 bg-amber-50/40" : "border-slate-200/80"}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Low Stock</span>
                <AlertTriangle className={`w-4 h-4 ${metrics.lowStockCount > 0 ? "text-amber-600" : "text-slate-400"}`} />
              </div>
              <p className={`text-xl sm:text-2xl font-semibold tracking-tight ${metrics.lowStockCount > 0 ? "text-amber-700" : "text-slate-900"}`}>
                {metrics.lowStockCount || 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Products below minimum</p>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Warning Alert if any */}
        {lowStockItems.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-xs">
                <strong className="font-bold">{lowStockItems.length} products</strong> have reached or fallen below minimum stock level:{" "}
                {lowStockItems.slice(0, 3).map((it: any) => `${it.name} (${it.stock} ${it.unit})`).join(", ")}
                {lowStockItems.length > 3 && "..."}
              </div>
            </div>
            <Link href="/items?lowStock=true">
              <Button size="sm" variant="outline" className="bg-white text-xs shrink-0">
                View Inventory
              </Button>
            </Link>
          </div>
        )}

        {/* Lower Grid: Recent Sales & Pending Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Invoices Table (7 cols on lg) */}
          <Card className="lg:col-span-7">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Invoices</CardTitle>
                <p className="text-xs text-slate-500">Latest transactions generated</p>
              </div>
              <Link href="/invoices">
                <Button variant="ghost" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentInvoices.length === 0 ? (
                <div className="text-center py-10 px-4 text-xs text-slate-400">
                  No invoices created yet. Click <strong>+ New Bill</strong> above to create your first bill!
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {recentInvoices.map((inv: any) => (
                    <Link
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-bold font-mono">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{inv.customerName}</p>
                          <p className="text-[11px] text-slate-400">
                            {inv.invoiceNumber} • {format(new Date(inv.invoiceDate), "dd MMM yyyy")}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-slate-900 font-mono">
                          {formatCurrency(inv.grandTotal)}
                        </p>
                        <div className="mt-0.5">
                          <StatusBadge status={inv.status} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Collections / Receivables (5 cols on lg) */}
          <Card className="lg:col-span-5">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pending Collections</CardTitle>
                <p className="text-xs text-slate-500">Unpaid balances awaiting payment</p>
              </div>
              <Link href="/invoices?status=ISSUED">
                <Button variant="ghost" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                  All
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {pendingInvoices.length === 0 ? (
                <div className="text-center py-10 px-4 text-xs text-slate-400">
                  🎉 No pending customer balances. All payments are clear!
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {pendingInvoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{inv.customerName}</p>
                        <p className="text-[11px] text-slate-400">
                          {inv.invoiceNumber} • Due: {formatCurrency(inv.balanceAmount)}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-semibold"
                        onClick={() => setPaymentInvoice(inv)}
                      >
                        Collect
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Payment Modal */}
      {paymentInvoice && (
        <RecordPaymentModal
          isOpen={true}
          onClose={() => setPaymentInvoice(null)}
          invoice={paymentInvoice}
          onPaymentRecorded={() => {
            setPaymentInvoice(null);
            fetchDashboard();
          }}
        />
      )}
    </AppLayout>
  );
}
