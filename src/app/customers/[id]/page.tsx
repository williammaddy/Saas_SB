"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/billing/calculator";
import { format } from "date-fns";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Receipt,
  PlusCircle,
  ArrowLeft,
  Loader2,
  Eye,
} from "lucide-react";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCustomer = async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      if (data.success) {
        setCustomer(data.customer);
      } else {
        router.push("/customers");
      }
    } catch (err) {
      console.error(err);
      router.push("/customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) fetchCustomer();
  }, [customerId]);

  if (loading || !customer) {
    return (
      <AppLayout title="Customer Statement">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-900 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const invoices = customer.invoices || [];

  return (
    <AppLayout
      title={customer.name}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/customers")}
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Back
          </Button>
          <Link href={`/billing/new?customerId=${customer.id}`}>
            <Button size="sm" icon={<PlusCircle className="w-4 h-4" />}>
              + Bill Customer
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Customer Header Info & Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Profile Card */}
          <Card className="md:col-span-1 border-slate-200">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-lg">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{customer.name}</h3>
                  <p className="text-xs text-slate-400">Customer ID: {customer.id.substring(0, 8)}</p>
                </div>
              </div>

              <div className="pt-2 space-y-1.5 text-xs text-slate-600 border-t border-slate-100">
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{[customer.address, customer.city, customer.state].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {customer.gstin && (
                  <p className="font-semibold text-slate-700 pt-1">
                    GSTIN: <span className="font-mono">{customer.gstin}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Metrics Overview */}
          <div className="md:col-span-2 grid grid-cols-3 gap-3">
            <Card className="border-slate-200">
              <CardContent className="p-5 flex flex-col justify-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Billed</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                  {formatCurrency(customer.totalSales)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">{invoices.length} invoices generated</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-5 flex flex-col justify-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Paid</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-1">
                  {formatCurrency(customer.totalPaid)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Settled payments</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-amber-50/30">
              <CardContent className="p-5 flex flex-col justify-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Outstanding</span>
                <p className="text-xl sm:text-2xl font-black text-amber-700 font-mono mt-1">
                  {formatCurrency(customer.outstanding)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Current receivable</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Invoices Statement Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History & Invoices</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {invoices.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                No invoices found for this customer yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Invoice Total</th>
                      <th className="py-3 px-4 text-right">Paid Amount</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <Link href={`/invoices/${inv.id}`} className="hover:underline">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {format(new Date(inv.invoiceDate), "dd MMM yyyy")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(inv.grandTotal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-600">
                          {formatCurrency(inv.paidAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold">
                          {Number(inv.balanceAmount) > 0 ? (
                            <span className="text-amber-600">{formatCurrency(inv.balanceAmount)}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
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
