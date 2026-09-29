"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { GST_STATES } from "@/lib/billing/gst";
import { formatCurrency } from "@/lib/billing/calculator";
import { Search, UserPlus, Users, Phone, Mail, ArrowRight, PlusCircle } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [gstin, setGstin] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const q = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const res = await fetch(`/api/customers${q}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const selectedStateObj = GST_STATES.find((s) => s.code === stateCode);

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          state: selectedStateObj?.name,
          stateCode: stateCode || undefined,
          gstin: gstin.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create customer");
      }

      setIsAddOpen(false);
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setStateCode("");
      setGstin("");
      setNotes("");
      fetchCustomers();
    } catch (err: any) {
      setError(err.message || "Error saving customer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Customers"
      actions={
        <Button size="sm" onClick={() => setIsAddOpen(true)} icon={<UserPlus className="w-4 h-4" />}>
          + Add Customer
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search bar */}
        <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
            <Input
              placeholder="Search by customer name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </form>

          <Button size="sm" variant="outline" onClick={() => fetchCustomers()}>
            Search
          </Button>
        </div>

        {/* Customer Directory Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16 text-xs text-slate-400">Loading customers...</div>
            ) : customers.length === 0 ? (
              <EmptyState
                icon={<Users className="w-6 h-6" />}
                title="No customers yet"
                description={
                  search
                    ? "No customers matched your search query."
                    : "Add your customers to easily track transaction history, credit balances, and generate personalized bills."
                }
                actionLabel="+ Add First Customer"
                onAction={() => setIsAddOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">GSTIN / State</th>
                      <th className="py-3 px-4 text-right">Lifetime Sales</th>
                      <th className="py-3 px-4 text-right">Outstanding Balance</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/customers/${c.id}`}
                            className="font-bold text-slate-900 hover:text-slate-700 block"
                          >
                            {c.name}
                          </Link>
                          {c.notes && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                              {c.notes}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {c.phone && (
                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{c.phone}</span>
                            </div>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                              <Mail className="w-3 h-3" />
                              <span>{c.email}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {c.gstin ? (
                            <span className="font-mono text-xs font-semibold text-slate-800">
                              {c.gstin}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                          {c.state && (
                            <span className="block text-[10px] text-slate-400">{c.state}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                          {formatCurrency(c.totalSales)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          {c.outstanding > 0 ? (
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              {formatCurrency(c.outstanding)}
                            </span>
                          ) : (
                            <span className="text-emerald-600">₹0.00</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Link href={`/customers/${c.id}`}>
                            <Button variant="outline" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                              Statement
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

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Customer"
        description="Enter customer information"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <Input
            label="Customer Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Anand Sharma"
            required
            autoFocus
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
              placeholder="anand@example.com"
            />
          </div>

          <Input
            label="Address (Optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Door No, Street name, Area"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="State (GST State Code)"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              options={[
                { value: "", label: "Select State (Optional)" },
                ...GST_STATES.map((s) => ({
                  value: s.code,
                  label: `${s.code} - ${s.name}`,
                })),
              ]}
            />
            <Input
              label="GSTIN (Optional)"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="15-character GSTIN"
            />
          </div>

          <Input
            label="Notes / Remarks"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Preferred delivery time, customer type"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
