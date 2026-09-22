"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, calculateBill } from "@/lib/billing/calculator";
import {
  Search,
  Plus,
  Trash2,
  UserPlus,
  CreditCard,
  Banknote,
  QrCode,
  FileText,
  CheckCircle2,
  Package,
  Scissors,
  AlertCircle,
} from "lucide-react";

interface QuickBillProps {
  organization: any;
}

interface SelectedItem {
  itemId?: string;
  itemType: "PRODUCT" | "SERVICE";
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  availableStock?: number | null;
}

export function QuickBill({ organization }: QuickBillProps) {
  const router = useRouter();

  // Data states
  const [customers, setCustomers] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Bill customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("WALK_IN");
  const [customerSearch, setCustomerSearch] = useState("");

  // Quick Add Customer modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustGstin, setNewCustGstin] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Line items state
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState("");

  // Bill level discount and payments
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [discountValue, setDiscountValue] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [isCredit, setIsCredit] = useState(false); // If credit: paidAmount = 0
  const [customPaidAmount, setCustomPaidAmount] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Customers & Items on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [custRes, itemsRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/items"),
        ]);
        const custData = await custRes.json();
        const itemsData = await itemsRes.json();

        if (custData.success) setCustomers(custData.customers || []);
        if (itemsData.success) setItemsList(itemsData.items || []);
      } catch (err) {
        console.error("Failed to load billing data:", err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  // Selected customer object
  const activeCustomer = useMemo(() => {
    if (selectedCustomerId === "WALK_IN") return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  // Real-time calculation using centralized engine
  const calculation = useMemo(() => {
    return calculateBill({
      items: selectedItems.map((it) => ({
        itemId: it.itemId,
        itemType: it.itemType,
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        discountAmount: it.discountAmount,
        taxRate: organization.gstEnabled ? it.taxRate : 0,
      })),
      taxConfig: {
        gstEnabled: organization.gstEnabled,
        businessStateCode: organization.stateCode,
        customerStateCode: activeCustomer?.stateCode,
      },
      discountType,
      discountValue: Number(discountValue) || 0,
      paidAmount: isCredit
        ? 0
        : customPaidAmount !== ""
        ? Number(customPaidAmount)
        : undefined, // undefined will auto-calculate in next step
    });
  }, [
    selectedItems,
    organization,
    activeCustomer,
    discountType,
    discountValue,
    isCredit,
    customPaidAmount,
  ]);

  // Actual paid amount defaults to grand total if not credit or custom
  const actualPaidAmount = useMemo(() => {
    if (isCredit) return 0;
    if (customPaidAmount !== "") return Math.min(calculation.grandTotal, Number(customPaidAmount) || 0);
    return calculation.grandTotal;
  }, [isCredit, customPaidAmount, calculation.grandTotal]);

  const actualBalance = useMemo(() => {
    return Math.max(0, calculation.grandTotal - actualPaidAmount);
  }, [calculation.grandTotal, actualPaidAmount]);

  // Add Item to Bill
  const addItemToBill = (item: any) => {
    const existingIndex = selectedItems.findIndex((it) => it.itemId === item.id);
    if (existingIndex >= 0) {
      // Increment quantity
      const updated = [...selectedItems];
      updated[existingIndex].quantity += 1;
      setSelectedItems(updated);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          itemId: item.id,
          itemType: item.type,
          name: item.name,
          quantity: 1,
          unit: item.unit || (item.type === "SERVICE" ? "hr" : "pcs"),
          unitPrice: Number(item.sellingPrice),
          discountAmount: 0,
          taxRate: Number(item.taxRate || 0),
          availableStock: item.type === "PRODUCT" ? Number(item.stock) : null,
        },
      ]);
    }
  };

  // Add Custom / Ad-hoc Item
  const addCustomItem = () => {
    setSelectedItems([
      ...selectedItems,
      {
        itemType: "PRODUCT",
        name: "Custom Item",
        quantity: 1,
        unit: "pcs",
        unitPrice: 100,
        discountAmount: 0,
        taxRate: organization.defaultTaxRate ? Number(organization.defaultTaxRate) : 0,
      },
    ]);
  };

  const updateItem = (index: number, field: keyof SelectedItem, value: any) => {
    const updated = [...selectedItems];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedItems(updated);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // Handle Quick Add Customer
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    setCreatingCustomer(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustName.trim(),
          phone: newCustPhone.trim() || undefined,
          gstin: newCustGstin.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.customer) {
        setCustomers([data.customer, ...customers]);
        setSelectedCustomerId(data.customer.id);
        setIsAddCustomerOpen(false);
        setNewCustName("");
        setNewCustPhone("");
        setNewCustGstin("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Generate Bill / Checkout
  const handleGenerateBill = async () => {
    if (selectedItems.length === 0) {
      setError("Please add at least one product or service to create a bill");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        customerId: selectedCustomerId === "WALK_IN" ? null : selectedCustomerId,
        customerName: activeCustomer?.name || "Walk-in Customer",
        customerPhone: activeCustomer?.phone || undefined,
        customerEmail: activeCustomer?.email || undefined,
        customerAddress: activeCustomer?.address || undefined,
        customerGstin: activeCustomer?.gstin || undefined,
        customerStateCode: activeCustomer?.stateCode || undefined,
        discountType,
        discountValue: Number(discountValue) || 0,
        paymentMethod: isCredit ? "CREDIT" : paymentMethod,
        paidAmount: actualPaidAmount,
        notes: notes || undefined,
        items: selectedItems.map((it) => ({
          itemId: it.itemId || undefined,
          itemType: it.itemType,
          name: it.name,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          discountAmount: it.discountAmount,
          taxRate: it.taxRate,
        })),
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate bill");
      }

      // Success: Navigate directly to the generated invoice!
      router.push(`/invoices/${data.invoice.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to generate bill");
      setSubmitting(false);
    }
  };

  // Filter items for quick picker
  const filteredCatalogItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return itemsList.slice(0, 12);
    const q = itemSearchQuery.toLowerCase();
    return itemsList.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (it.sku && it.sku.toLowerCase().includes(q)) ||
        (it.category && it.category.toLowerCase().includes(q))
    );
  }, [itemsList, itemSearchQuery]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Customer & Line Items (8 cols on lg) */}
      <div className="lg:col-span-8 space-y-6">
        {/* Customer Selector Card */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Customer</span>
                <span className="text-xs text-slate-400">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId("WALK_IN")}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    selectedCustomerId === "WALK_IN"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Walk-in Customer
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<UserPlus className="w-3.5 h-3.5" />}
                onClick={() => setIsAddCustomerOpen(true)}
              >
                + New Customer
              </Button>
            </div>

            {/* Customer Dropdown */}
            {selectedCustomerId !== "WALK_IN" && (
              <div className="space-y-2">
                <Select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  options={[
                    { value: "WALK_IN", label: "Walk-in Customer" },
                    ...customers.map((c) => ({
                      value: c.id,
                      label: `${c.name} ${c.phone ? `(${c.phone})` : ""}`,
                    })),
                  ]}
                />
                {activeCustomer && (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs flex flex-wrap gap-x-4 gap-y-1 text-slate-600 border border-slate-100">
                    {activeCustomer.phone && <span>Phone: {activeCustomer.phone}</span>}
                    {activeCustomer.gstin && <span>GSTIN: {activeCustomer.gstin}</span>}
                    {activeCustomer.outstanding > 0 && (
                      <span className="text-amber-700 font-semibold">
                        Outstanding: {formatCurrency(activeCustomer.outstanding, organization.currency)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Line Items Table */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Bill Items ({selectedItems.length})
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addCustomItem} icon={<Plus className="w-3.5 h-3.5" />}>
                + Custom Item
              </Button>
            </div>

            {selectedItems.length === 0 ? (
              <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="text-sm font-medium text-slate-700">No items added yet</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select an item from the catalog below or add a custom item
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold text-left">
                      <th className="py-2 pr-2">Item</th>
                      <th className="py-2 px-2 w-20 text-center">Qty</th>
                      <th className="py-2 px-2 w-28 text-right">Price</th>
                      {organization.gstEnabled && (
                        <th className="py-2 px-2 w-20 text-right">Tax %</th>
                      )}
                      <th className="py-2 pl-2 text-right">Total</th>
                      <th className="py-2 pl-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedItems.map((item, idx) => {
                      const lineTaxable = Math.max(0, item.quantity * item.unitPrice - item.discountAmount);
                      const lineTax = organization.gstEnabled
                        ? (lineTaxable * item.taxRate) / 100
                        : 0;
                      const lineTotal = lineTaxable + lineTax;

                      return (
                        <tr key={idx} className="group">
                          <td className="py-2.5 pr-2">
                            <input
                              type="text"
                              className="font-semibold text-slate-900 bg-transparent border-0 p-0 focus:ring-0 w-full"
                              value={item.name}
                              onChange={(e) => updateItem(idx, "name", e.target.value)}
                            />
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400 uppercase font-mono">
                                {item.itemType}
                              </span>
                              {item.availableStock !== null && item.availableStock !== undefined && (
                                <span className={`text-[10px] ${item.availableStock < 5 ? "text-rose-500 font-bold" : "text-slate-400"}`}>
                                  • Stock: {item.availableStock}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-2">
                            <div className="flex items-center justify-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                              <button
                                type="button"
                                onClick={() =>
                                  updateItem(idx, "quantity", Math.max(1, item.quantity - 1))
                                }
                                className="px-2 py-1 text-slate-500 hover:bg-slate-100"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                className="w-10 text-center font-bold text-xs p-1 border-0 focus:ring-0"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(idx, "quantity", Math.max(1, Number(e.target.value) || 1))
                                }
                              />
                              <button
                                type="button"
                                onClick={() => updateItem(idx, "quantity", item.quantity + 1)}
                                className="px-2 py-1 text-slate-500 hover:bg-slate-100"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          <td className="py-2.5 px-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              className="w-24 text-right rounded border border-slate-200 py-1 px-1.5 text-xs font-semibold"
                              value={item.unitPrice}
                              onChange={(e) =>
                                updateItem(idx, "unitPrice", Number(e.target.value) || 0)
                              }
                            />
                          </td>

                          {organization.gstEnabled && (
                            <td className="py-2.5 px-2 text-right">
                              <input
                                type="number"
                                step="0.5"
                                className="w-16 text-right rounded border border-slate-200 py-1 px-1.5 text-xs"
                                value={item.taxRate}
                                onChange={(e) =>
                                  updateItem(idx, "taxRate", Number(e.target.value) || 0)
                                }
                              />
                            </td>
                          )}

                          <td className="py-2.5 pl-2 text-right font-bold text-slate-900">
                            {formatCurrency(lineTotal, organization.currency)}
                          </td>

                          <td className="py-2.5 pl-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Item Picker Catalog */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select from Catalog
              </h4>
              <div className="w-full sm:w-64">
                <Input
                  placeholder="Search item or SKU..."
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-3.5 h-3.5" />}
                />
              </div>
            </div>

            {filteredCatalogItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No items found. Create items in Products & Services module.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {filteredCatalogItems.map((catItem) => (
                  <button
                    key={catItem.id}
                    type="button"
                    onClick={() => addItemToBill(catItem)}
                    className="flex flex-col p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-500 hover:shadow-sm text-left transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[10px] font-bold text-slate-400">
                        {catItem.type === "SERVICE" ? (
                          <Scissors className="w-3 h-3 text-purple-500" />
                        ) : (
                          <Package className="w-3 h-3 text-indigo-500" />
                        )}
                      </span>
                      {catItem.type === "PRODUCT" && (
                        <span className={`text-[10px] ${Number(catItem.stock) <= Number(catItem.minimumStock) ? "text-rose-500 font-bold" : "text-slate-400"}`}>
                          Qty: {catItem.stock ?? 0}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-900 truncate w-full">
                      {catItem.name}
                    </p>
                    <p className="text-xs font-bold text-indigo-600 mt-1 font-mono">
                      {formatCurrency(catItem.sellingPrice, organization.currency)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Checkout Summary & Payment (4 cols on lg) */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="sticky top-20 border-slate-300 shadow-md">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Payment & Checkout
            </h3>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Discount Option */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Discount</label>
                <div className="flex rounded-md shadow-sm border border-slate-200 overflow-hidden text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDiscountType("FIXED")}
                    className={`px-2 py-0.5 font-medium ${discountType === "FIXED" ? "bg-indigo-600 text-white" : "bg-white text-slate-600"}`}
                  >
                    ₹ Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("PERCENTAGE")}
                    className={`px-2 py-0.5 font-medium ${discountType === "PERCENTAGE" ? "bg-indigo-600 text-white" : "bg-white text-slate-600"}`}
                  >
                    % Percent
                  </button>
                </div>
              </div>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-slate-700 block">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCredit(false);
                    setPaymentMethod("CASH");
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    !isCredit && paymentMethod === "CASH"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  Cash
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCredit(false);
                    setPaymentMethod("UPI");
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    !isCredit && paymentMethod === "UPI"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  UPI / QR
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCredit(false);
                    setPaymentMethod("CARD");
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    !isCredit && paymentMethod === "CARD"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Card
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCredit(true);
                    setPaymentMethod("CREDIT");
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    isCredit
                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Credit / Unpaid
                </button>
              </div>
            </div>

            {/* If partial payment */}
            {!isCredit && (
              <div className="pt-1">
                <Input
                  label="Paid Amount (Optional partial)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={String(calculation.grandTotal)}
                  value={customPaidAmount}
                  onChange={(e) => setCustomPaidAmount(e.target.value)}
                  helperText="Leave blank for full payment"
                />
              </div>
            )}

            {/* Bill Calculation Summary */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs border border-slate-200/80">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(calculation.subtotal, organization.currency)}</span>
              </div>

              {calculation.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span>-{formatCurrency(calculation.discountAmount, organization.currency)}</span>
                </div>
              )}

              {calculation.isGst && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount</span>
                    <span>{formatCurrency(calculation.taxableAmount, organization.currency)}</span>
                  </div>
                  {calculation.isInterState ? (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST</span>
                      <span>{formatCurrency(calculation.igstAmount, organization.currency)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST</span>
                        <span>{formatCurrency(calculation.cgstAmount, organization.currency)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST</span>
                        <span>{formatCurrency(calculation.sgstAmount, organization.currency)}</span>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Amount</span>
                <span className="text-indigo-600 font-mono">
                  {formatCurrency(calculation.grandTotal, organization.currency)}
                </span>
              </div>

              <div className="flex justify-between text-xs text-emerald-600 font-semibold pt-1">
                <span>Paying Now</span>
                <span>{formatCurrency(actualPaidAmount, organization.currency)}</span>
              </div>

              {actualBalance > 0 && (
                <div className="flex justify-between text-xs font-bold text-amber-700 pt-1">
                  <span>Balance Due</span>
                  <span>{formatCurrency(actualBalance, organization.currency)}</span>
                </div>
              )}
            </div>

            {/* Big Checkout Button */}
            <Button
              size="lg"
              className="w-full text-base font-bold shadow-lg shadow-indigo-600/30 py-3"
              loading={submitting}
              onClick={handleGenerateBill}
              icon={<CheckCircle2 className="w-5 h-5" />}
            >
              Generate Bill
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title="Add Customer"
        description="Quickly save customer details for billing"
      >
        <form onSubmit={handleQuickAddCustomer} className="space-y-4">
          <Input
            label="Customer Name *"
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            required
            autoFocus
          />
          <Input
            label="Phone Number"
            value={newCustPhone}
            onChange={(e) => setNewCustPhone(e.target.value)}
            placeholder="e.g. 9876543210"
          />
          {organization.gstEnabled && (
            <Input
              label="GSTIN (Optional)"
              value={newCustGstin}
              onChange={(e) => setNewCustGstin(e.target.value)}
              placeholder="15-character GSTIN"
            />
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddCustomerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creatingCustomer}>
              Save & Select
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
