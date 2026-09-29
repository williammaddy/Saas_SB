"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
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
  Barcode,
  Grid,
  FileSpreadsheet,
  Check,
} from "lucide-react";

interface QuickBillProps {
  organization: any;
}

interface SelectedItem {
  itemId?: string;
  itemType: "PRODUCT" | "SERVICE";
  name: string;
  sku?: string | null;
  barcode?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  availableStock?: number | null;
}

export function QuickBill({ organization }: QuickBillProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Data states
  const [customers, setCustomers] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Bill customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("WALK_IN");

  // Quick Add Customer modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustGstin, setNewCustGstin] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Top Barcode Search Input state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Line items state (Initial spreadsheet rows for Excel-style instant billing)
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([
    {
      itemType: "PRODUCT",
      name: "",
      quantity: 1,
      unit: "pcs",
      unitPrice: 0,
      discountAmount: 0,
      taxRate: organization.defaultTaxRate ? Number(organization.defaultTaxRate) : 0,
    },
    {
      itemType: "PRODUCT",
      name: "",
      quantity: 1,
      unit: "pcs",
      unitPrice: 0,
      discountAmount: 0,
      taxRate: organization.defaultTaxRate ? Number(organization.defaultTaxRate) : 0,
    },
    {
      itemType: "PRODUCT",
      name: "",
      quantity: 1,
      unit: "pcs",
      unitPrice: 0,
      discountAmount: 0,
      taxRate: organization.defaultTaxRate ? Number(organization.defaultTaxRate) : 0,
    },
  ]);

  // Track active autocomplete dropdown row index for in-cell product search
  const [activeCellRowIndex, setActiveCellRowIndex] = useState<number | null>(null);

  // Bill level discount and payments
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [discountValue, setDiscountValue] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [isCredit, setIsCredit] = useState(false);
  const [customPaidAmount, setCustomPaidAmount] = useState<string>("");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  // Load Customers & Items on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [custRes, itemsRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/items?status=ACTIVE"),
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

  // Filter valid line items for financial calculations (ignore completely empty draft rows)
  const validBillingItems = useMemo(() => {
    return selectedItems.filter(
      (it) => it.name.trim() !== "" || it.unitPrice > 0 || (it.itemId && it.itemId !== "")
    );
  }, [selectedItems]);

  // Filtered top barcode suggestions
  const matchingSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return itemsList.filter((it) => {
      const matchName = it.name.toLowerCase().includes(q);
      const matchSku = it.sku && it.sku.toLowerCase().includes(q);
      const matchBarcode = it.barcode && it.barcode.toLowerCase().includes(q);
      return matchName || matchSku || matchBarcode;
    });
  }, [itemsList, searchQuery]);

  // Real-time financial calculations
  const calculation = useMemo(() => {
    return calculateBill({
      items: validBillingItems.map((it) => ({
        itemId: it.itemId,
        itemType: it.itemType,
        name: it.name || "Item",
        quantity: it.quantity || 1,
        unit: it.unit || "pcs",
        unitPrice: it.unitPrice || 0,
        discountAmount: it.discountAmount || 0,
        taxRate: organization.gstEnabled ? it.taxRate || 0 : 0,
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
        : undefined,
    });
  }, [
    validBillingItems,
    organization,
    activeCustomer,
    discountType,
    discountValue,
    isCredit,
    customPaidAmount,
  ]);

  // Actual paid amount
  const actualPaidAmount = useMemo(() => {
    if (isCredit) return 0;
    if (customPaidAmount !== "") return Math.min(calculation.grandTotal, Number(customPaidAmount) || 0);
    return calculation.grandTotal;
  }, [isCredit, customPaidAmount, calculation.grandTotal]);

  const actualBalance = useMemo(() => {
    return Math.max(0, calculation.grandTotal - actualPaidAmount);
  }, [calculation.grandTotal, actualPaidAmount]);

  // Cash change calculation
  const cashChange = useMemo(() => {
    if (paymentMethod !== "CASH" || isCredit || !cashReceived) return 0;
    const received = Number(cashReceived) || 0;
    return Math.max(0, received - calculation.grandTotal);
  }, [paymentMethod, isCredit, cashReceived, calculation.grandTotal]);

  // Stock limit validation
  useEffect(() => {
    let warning = null;
    for (const item of validBillingItems) {
      if (
        item.itemType === "PRODUCT" &&
        item.availableStock !== null &&
        item.availableStock !== undefined
      ) {
        if (item.quantity > item.availableStock) {
          warning = `Stock alert for "${item.name}". Available: ${item.availableStock}, Billing: ${item.quantity}`;
          break;
        }
      }
    }
    setStockWarning(warning);
  }, [validBillingItems]);

  // Add Item from Top Search / Barcode to Table
  const addItemFromCatalog = (catalogItem: any) => {
    setError(null);
    // Find first blank row in table to populate, or append new row
    const emptyRowIndex = selectedItems.findIndex((it) => !it.name.trim() && it.unitPrice === 0);

    const newItemObj: SelectedItem = {
      itemId: catalogItem.id,
      itemType: catalogItem.type,
      name: catalogItem.name,
      sku: catalogItem.sku,
      barcode: catalogItem.barcode,
      quantity: 1,
      unit: catalogItem.unit || (catalogItem.type === "SERVICE" ? "hr" : "pcs"),
      unitPrice: Number(catalogItem.sellingPrice),
      discountAmount: 0,
      taxRate: Number(catalogItem.taxRate || 0),
      availableStock: catalogItem.type === "PRODUCT" ? (catalogItem.stock !== null ? Number(catalogItem.stock) : null) : null,
    };

    if (emptyRowIndex >= 0) {
      const updated = [...selectedItems];
      updated[emptyRowIndex] = newItemObj;
      setSelectedItems(updated);
    } else {
      setSelectedItems([...selectedItems, newItemObj]);
    }

    setSearchQuery("");
    setIsDropdownOpen(false);
  };

  // Add Blank Excel Row and focus it immediately
  const addBlankRowAndFocus = () => {
    setSelectedItems((prev) => {
      const newRow: SelectedItem = {
        itemType: "PRODUCT",
        name: "",
        quantity: 1,
        unit: "pcs",
        unitPrice: 0,
        discountAmount: 0,
        taxRate: organization.defaultTaxRate ? Number(organization.defaultTaxRate) : 0,
      };
      const nextList = [...prev, newRow];
      const newIdx = nextList.length - 1;
      setTimeout(() => {
        document.getElementById(`row-name-${newIdx}`)?.focus();
      }, 50);
      return nextList;
    });
  };

  // Update cell field directly (Excel Spreadsheet style)
  const updateCell = (index: number, field: keyof SelectedItem, value: any) => {
    const updated = [...selectedItems];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedItems(updated);
  };

  // Select catalog item into specific cell row
  const selectCatalogIntoRow = (rowIndex: number, catalogItem: any) => {
    const updated = [...selectedItems];
    updated[rowIndex] = {
      itemId: catalogItem.id,
      itemType: catalogItem.type,
      name: catalogItem.name,
      sku: catalogItem.sku,
      barcode: catalogItem.barcode,
      quantity: updated[rowIndex]?.quantity || 1,
      unit: catalogItem.unit || (catalogItem.type === "SERVICE" ? "hr" : "pcs"),
      unitPrice: Number(catalogItem.sellingPrice),
      discountAmount: updated[rowIndex]?.discountAmount || 0,
      taxRate: Number(catalogItem.taxRate || 0),
      availableStock: catalogItem.type === "PRODUCT" ? (catalogItem.stock !== null ? Number(catalogItem.stock) : null) : null,
    };
    setSelectedItems(updated);
    setActiveCellRowIndex(null);

    // Auto focus quantity input after selecting product from catalog suggestion
    setTimeout(() => {
      document.getElementById(`row-qty-${rowIndex}`)?.focus();
    }, 50);
  };

  // Keydown navigation across grid rows for fast senior-friendly billing (Press Enter moves to next row)
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    field: "name" | "qty" | "unit" | "price" | "discount" | "tax",
    hasSuggestions: boolean = false
  ) => {
    if (e.key === "Enter") {
      // If suggestions dropdown is actively shown on item name input, let the dropdown select first
      if (field === "name" && hasSuggestions) {
        return;
      }
      e.preventDefault();

      if (field === "name") {
        document.getElementById(`row-qty-${rowIndex}`)?.focus();
      } else if (field === "qty") {
        document.getElementById(`row-price-${rowIndex}`)?.focus();
      } else if (field === "unit") {
        document.getElementById(`row-price-${rowIndex}`)?.focus();
      } else if (field === "price" || field === "discount" || field === "tax") {
        const nextIdx = rowIndex + 1;
        if (nextIdx < selectedItems.length) {
          document.getElementById(`row-name-${nextIdx}`)?.focus();
        } else {
          addBlankRowAndFocus();
        }
      }
    } else if (e.key === "ArrowDown" && field !== "name") {
      e.preventDefault();
      const nextIdx = rowIndex + 1;
      if (nextIdx < selectedItems.length) {
        document.getElementById(`row-${field}-${nextIdx}`)?.focus();
      } else {
        addBlankRowAndFocus();
      }
    } else if (e.key === "ArrowUp" && field !== "name" && rowIndex > 0) {
      e.preventDefault();
      document.getElementById(`row-${field}-${rowIndex - 1}`)?.focus();
    }
  };

  // Remove row
  const removeRow = (index: number) => {
    if (selectedItems.length <= 1) {
      // Keep at least one empty row
      setSelectedItems([
        {
          itemType: "PRODUCT",
          name: "",
          quantity: 1,
          unit: "pcs",
          unitPrice: 0,
          discountAmount: 0,
          taxRate: organization.defaultTaxRate ? Number(organization.defaultTaxRate) : 0,
        },
      ]);
      return;
    }
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // Top search keydown handler
  const handleTopSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (matchingSuggestions.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % matchingSuggestions.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (matchingSuggestions.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + matchingSuggestions.length) % matchingSuggestions.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isDropdownOpen && matchingSuggestions.length > 0) {
        const target = matchingSuggestions[selectedIndex] || matchingSuggestions[0];
        if (target) addItemFromCatalog(target);
      }
    }
  };

  // Keyboard shortcut Ctrl+Enter / F2 for complete sale
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === "Enter") || e.key === "F2") {
        e.preventDefault();
        handleGenerateBill();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [validBillingItems, calculation, activeCustomer, discountType, discountValue, paymentMethod, isCredit, customPaidAmount, notes]);

  // Quick Add Customer handler
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
    if (validBillingItems.length === 0) {
      setError("Please type or select at least one product/item to create a bill");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        customerId: selectedCustomerId === "WALK_IN" ? null : selectedCustomerId,
        customerName: activeCustomer?.name || "Direct Customer",
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
        items: validBillingItems.map((it) => ({
          itemId: it.itemId || undefined,
          itemType: it.itemType,
          name: it.name.trim() || "Item",
          quantity: it.quantity || 1,
          unit: it.unit || "pcs",
          unitPrice: Number(it.unitPrice) || 0,
          discountAmount: Number(it.discountAmount) || 0,
          taxRate: Number(it.taxRate) || 0,
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

      router.push(`/invoices/${data.invoice.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to generate bill");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* TOP BARCODE / SKU QUICK SCAN BAR */}
      {/* ============================================================ */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-slate-900 text-white p-2.5 sm:p-3 rounded-2xl shadow-md border border-slate-800">
          <div className="pl-2 text-slate-400">
            <Barcode className="w-5 h-5" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            className="flex-1 bg-transparent text-white placeholder-slate-400 text-sm font-mono focus:outline-none border-0 ring-0 px-2"
            placeholder="Scan Barcode or Search Inventory Catalog... (Optional quick add)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleTopSearchKeyDown}
            onFocus={() => searchQuery.trim() && setIsDropdownOpen(true)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs text-slate-400 hover:text-white px-2"
            >
              Clear
            </button>
          )}
        </div>

        {/* Catalog Suggestions Dropdown */}
        {isDropdownOpen && matchingSuggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100">
            {matchingSuggestions.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => addItemFromCatalog(item)}
                className={`p-3 cursor-pointer flex items-center justify-between hover:bg-slate-100 transition-colors ${
                  idx === selectedIndex ? "bg-slate-900 text-white font-bold" : "text-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xs">{item.name}</span>
                  {item.sku && <span className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</span>}
                </div>
                <span className="font-mono font-bold text-xs text-slate-900">
                  {formatCurrency(item.sellingPrice, organization.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* EXCEL SPREADSHEET STYLE BILLING GRID (MAIN BILL COUNTER) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customer & Excel Billing Grid (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Customer Bar */}
          <Card className="border-slate-200">
            <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer:</span>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId("WALK_IN")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                    selectedCustomerId === "WALK_IN"
                      ? "bg-slate-900 text-white shadow"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Direct Customer
                </button>
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <Select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  options={[
                    { value: "WALK_IN", label: "Direct Customer (Unregistered)" },
                    ...customers.map((c) => ({
                      value: c.id,
                      label: `${c.name} ${c.phone ? `(${c.phone})` : ""}`,
                    })),
                  ]}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<UserPlus className="w-3.5 h-3.5" />}
                onClick={() => setIsAddCustomerOpen(true)}
              >
                + Customer
              </Button>
            </CardContent>
          </Card>

          {/* EXCEL SPREADSHEET TABLE CARD (Senior Friendly High Visibility UI) */}
          <Card className="border-2 border-slate-300 shadow-md bg-white overflow-hidden rounded-2xl">
            <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-slate-300" />
                <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-white">
                  Excel Billing Sheet ({validBillingItems.length} active items)
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-200 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                Senior Friendly • Press ENTER to jump to next row
              </span>
            </div>

            {stockWarning && (
              <div className="p-3 bg-amber-50 border-b border-amber-300 text-amber-900 text-xs sm:text-sm font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                <span>{stockWarning}</span>
              </div>
            )}

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-200/90 border-b-2 border-slate-300 text-slate-900 font-extrabold text-xs sm:text-sm tracking-wide text-left uppercase">
                    <th className="py-3 px-3 w-12 text-center border-r border-slate-300">No.</th>
                    <th className="py-3 px-3 border-r border-slate-300 min-w-[260px]">
                      Product / Item Name (Type Anything)
                    </th>
                    <th className="py-3 px-2 w-28 text-center border-r border-slate-300">Qty</th>
                    <th className="py-3 px-2 w-24 text-center border-r border-slate-300">Unit</th>
                    <th className="py-3 px-3 w-36 text-right border-r border-slate-300">Price (₹)</th>
                    <th className="py-3 px-2 w-28 text-right border-r border-slate-300">Discount (₹)</th>
                    {organization.gstEnabled && (
                      <th className="py-3 px-2 w-24 text-center border-r border-slate-300">GST %</th>
                    )}
                    <th className="py-3 px-3 text-right font-black border-r border-slate-300 w-36">
                      Total (₹)
                    </th>
                    <th className="py-3 px-2 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 bg-white">
                  {selectedItems.map((item, idx) => {
                    const qty = item.quantity || 0;
                    const price = item.unitPrice || 0;
                    const discount = item.discountAmount || 0;
                    const lineTaxable = Math.max(0, qty * price - discount);
                    const lineTax = organization.gstEnabled ? (lineTaxable * (item.taxRate || 0)) / 100 : 0;
                    const lineTotal = lineTaxable + lineTax;

                    // Filter inline cell suggestions if user is typing in item name cell
                    const cellSuggestions =
                      item.name.trim() && !item.itemId
                        ? itemsList.filter((it) => it.name.toLowerCase().includes(item.name.toLowerCase().trim())).slice(0, 5)
                        : [];

                    return (
                      <tr key={idx} className="hover:bg-slate-100/80 transition-colors h-14">
                        {/* Row Number */}
                        <td className="py-2.5 px-3 text-center font-black text-sm text-slate-600 font-mono border-r border-slate-300 bg-slate-100/70">
                          {idx + 1}
                        </td>

                        {/* Product / Item Name Cell (Direct Typing + Optional Auto-suggest + Enter navigation) */}
                        <td className="py-2 px-2 border-r border-slate-300 relative">
                          <input
                            id={`row-name-${idx}`}
                            type="text"
                            className="w-full font-bold text-sm sm:text-base text-slate-900 bg-slate-50/60 border-2 border-slate-300 hover:border-slate-400 focus:border-slate-900 focus:bg-white rounded-lg px-3 py-2 transition-all focus:outline-none placeholder:text-slate-400 shadow-xs"
                            placeholder="Type any product / service name..."
                            value={item.name}
                            onChange={(e) => {
                              updateCell(idx, "name", e.target.value);
                              // Clear matched itemId if user edits typed text
                              if (item.itemId) updateCell(idx, "itemId", undefined);
                              setActiveCellRowIndex(idx);
                            }}
                            onFocus={() => setActiveCellRowIndex(idx)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, "name", cellSuggestions.length > 0)}
                          />

                          {/* Inline Catalog Suggestions Dropdown */}
                          {activeCellRowIndex === idx && cellSuggestions.length > 0 && (
                            <div className="absolute z-50 left-2 right-2 top-full mt-1 bg-white rounded-xl shadow-2xl border-2 border-slate-300 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                              <div className="px-3 py-1.5 bg-slate-100 text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                                Catalog Quick Match:
                              </div>
                              {cellSuggestions.map((catItem) => (
                                <div
                                  key={catItem.id}
                                  onClick={() => selectCatalogIntoRow(idx, catItem)}
                                  className="p-3 cursor-pointer hover:bg-slate-100 flex justify-between items-center text-sm font-semibold text-slate-900 transition-colors"
                                >
                                  <span className="font-bold text-slate-900">{catItem.name}</span>
                                  <span className="font-mono text-slate-900 font-extrabold">
                                    ₹{catItem.sellingPrice}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Quantity Cell */}
                        <td className="py-2 px-2 border-r border-slate-300 text-center">
                          <input
                            id={`row-qty-${idx}`}
                            type="number"
                            min="1"
                            className="w-full text-center font-black text-sm sm:text-base text-slate-900 bg-slate-50/60 border-2 border-slate-300 hover:border-slate-400 focus:border-slate-900 focus:bg-white rounded-lg px-2 py-2 transition-all font-mono focus:outline-none shadow-xs"
                            value={item.quantity}
                            onChange={(e) => updateCell(idx, "quantity", Math.max(1, Number(e.target.value) || 1))}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, "qty")}
                          />
                        </td>

                        {/* Unit Cell */}
                        <td className="py-2 px-2 border-r border-slate-300">
                          <input
                            id={`row-unit-${idx}`}
                            type="text"
                            className="w-full text-center font-bold text-xs sm:text-sm text-slate-800 bg-slate-50/60 border-2 border-slate-300 hover:border-slate-400 focus:border-slate-900 focus:bg-white rounded-lg px-1.5 py-2 font-mono focus:outline-none shadow-xs"
                            value={item.unit}
                            onChange={(e) => updateCell(idx, "unit", e.target.value)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, "unit")}
                            placeholder="pcs"
                          />
                        </td>

                        {/* Unit Price Cell */}
                        <td className="py-2 px-2 border-r border-slate-300 text-right">
                          <input
                            id={`row-price-${idx}`}
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full text-right font-black text-sm sm:text-base text-slate-900 bg-slate-50/60 border-2 border-slate-300 hover:border-slate-400 focus:border-slate-900 focus:bg-white rounded-lg px-3 py-2 transition-all font-mono focus:outline-none shadow-xs"
                            value={item.unitPrice || ""}
                            onChange={(e) => updateCell(idx, "unitPrice", Number(e.target.value) || 0)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, "price")}
                            placeholder="0.00"
                          />
                        </td>

                        {/* Discount Cell */}
                        <td className="py-2 px-2 border-r border-slate-300 text-right">
                          <input
                            id={`row-discount-${idx}`}
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full text-right font-bold text-xs sm:text-sm text-slate-800 bg-slate-50/60 border-2 border-slate-300 hover:border-slate-400 focus:border-slate-900 focus:bg-white rounded-lg px-2 py-2 font-mono focus:outline-none shadow-xs"
                            value={item.discountAmount || ""}
                            onChange={(e) => updateCell(idx, "discountAmount", Number(e.target.value) || 0)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, "discount")}
                            placeholder="0"
                          />
                        </td>

                        {/* GST % Cell (if GST enabled) */}
                        {organization.gstEnabled && (
                          <td className="py-2 px-2 border-r border-slate-300 text-center">
                            <input
                              id={`row-tax-${idx}`}
                              type="number"
                              step="0.5"
                              min="0"
                              max="100"
                              className="w-full text-center font-bold text-xs sm:text-sm text-slate-800 bg-slate-50/60 border-2 border-slate-300 hover:border-slate-400 focus:border-slate-900 focus:bg-white rounded-lg px-1.5 py-2 font-mono focus:outline-none shadow-xs"
                              value={item.taxRate}
                              onChange={(e) => updateCell(idx, "taxRate", Number(e.target.value) || 0)}
                              onKeyDown={(e) => handleCellKeyDown(e, idx, "tax")}
                            />
                          </td>
                        )}

                        {/* Live Total Amount Cell */}
                        <td className="py-2.5 px-3 text-right font-black text-sm sm:text-base text-slate-950 font-mono border-r border-slate-300 bg-slate-100">
                          {formatCurrency(lineTotal, organization.currency)}
                        </td>

                        {/* Delete Row Button */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg p-2 transition-all"
                            title="Delete Row"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Add Excel Row Controls */}
              <div className="p-4 bg-slate-100 border-t-2 border-slate-300 flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  size="md"
                  onClick={addBlankRowAndFocus}
                  className="bg-slate-900 border-2 border-slate-900 text-white font-extrabold hover:bg-black text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  + Add Excel Row (or Press Enter on last row)
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Quick Catalog Add:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-w-md">
                    {itemsList.slice(0, 5).map((catItem) => (
                      <button
                        key={catItem.id}
                        type="button"
                        onClick={() => addItemFromCatalog(catItem)}
                        className="text-xs px-2.5 py-1 bg-white border border-slate-300 hover:border-slate-900 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-bold text-slate-800 transition-all shadow-xs"
                      >
                        + {catItem.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Checkout Counter Summary (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-300 shadow-xl bg-white sticky top-4">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Bill Summary
                </h3>
                <kbd className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-mono rounded border">
                  Ctrl+Enter (F2)
                </kbd>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Overall Bill Discount */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Bill Level Discount</label>
                  <div className="flex rounded-md shadow-sm border border-slate-200 overflow-hidden text-[11px]">
                    <button
                      type="button"
                      onClick={() => setDiscountType("FIXED")}
                      className={`px-2.5 py-1 font-medium ${discountType === "FIXED" ? "bg-slate-950 text-white" : "bg-white text-slate-600"}`}
                    >
                      ₹ Fixed
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("PERCENTAGE")}
                      className={`px-2.5 py-1 font-medium ${discountType === "PERCENTAGE" ? "bg-slate-950 text-white" : "bg-white text-slate-600"}`}
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
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-700 block">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCredit(false);
                      setPaymentMethod("CASH");
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      !isCredit && paymentMethod === "CASH"
                        ? "bg-slate-950 text-white border-slate-950 shadow"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    Cash
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCredit(false);
                      setPaymentMethod("UPI");
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      !isCredit && paymentMethod === "UPI"
                        ? "bg-slate-950 text-white border-slate-950 shadow"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    UPI / QR
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCredit(false);
                      setPaymentMethod("CARD");
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      !isCredit && paymentMethod === "CARD"
                        ? "bg-slate-950 text-white border-slate-950 shadow"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Card
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCredit(true);
                      setPaymentMethod("CREDIT");
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isCredit
                        ? "bg-amber-600 text-white border-amber-600 shadow"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Credit / Unpaid
                  </button>
                </div>
              </div>

              {/* CASH CALCULATOR */}
              {!isCredit && paymentMethod === "CASH" && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <label className="text-xs font-bold text-emerald-900 block">
                    Cash Received Calculator
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-emerald-700 font-medium block mb-0.5">Cash Received</span>
                      <Input
                        type="number"
                        step="1"
                        placeholder={String(calculation.grandTotal)}
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col justify-center bg-white p-2 rounded-lg border border-emerald-200 text-right">
                      <span className="text-[10px] text-emerald-700 font-medium">Change Return</span>
                      <span className="text-sm font-black text-emerald-600 font-mono">
                        {formatCurrency(cashChange, organization.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Calculation Box */}
              <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs border border-slate-200/80">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(calculation.subtotal, organization.currency)}</span>
                </div>

                {calculation.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(calculation.discountAmount, organization.currency)}</span>
                  </div>
                )}

                {calculation.isGst && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Taxable Amount</span>
                      <span className="font-mono">{formatCurrency(calculation.taxableAmount, organization.currency)}</span>
                    </div>
                    {calculation.isInterState ? (
                      <div className="flex justify-between text-slate-600">
                        <span>IGST</span>
                        <span className="font-mono">{formatCurrency(calculation.igstAmount, organization.currency)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>CGST</span>
                          <span className="font-mono">{formatCurrency(calculation.cgstAmount, organization.currency)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>SGST</span>
                          <span className="font-mono">{formatCurrency(calculation.sgstAmount, organization.currency)}</span>
                        </div>
                      </>
                    )}
                  </>
                )}

                <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="text-slate-950 font-mono">
                    {formatCurrency(calculation.grandTotal, organization.currency)}
                  </span>
                </div>

                {actualBalance > 0 && (
                  <div className="flex justify-between text-xs font-bold text-amber-700 pt-1">
                    <span>Balance Outstanding</span>
                    <span className="font-mono">{formatCurrency(actualBalance, organization.currency)}</span>
                  </div>
                )}
              </div>

              {/* 1-Click Complete Sale Button */}
              <Button
                size="lg"
                className="w-full text-base font-bold shadow-lg shadow-slate-950/20 py-3.5"
                loading={submitting}
                onClick={handleGenerateBill}
                icon={<CheckCircle2 className="w-5 h-5" />}
              >
                Complete Sale (F2)
              </Button>
            </CardContent>
          </Card>
        </div>
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
              placeholder="e.g. 27ABCDE1234F1Z5"
            />
          )}

          <div className="flex justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddCustomerOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creatingCustomer}>
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
