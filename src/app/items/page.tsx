"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/billing/calculator";
import {
  Search,
  Package,
  Scissors,
  Plus,
  AlertTriangle,
  Tag,
  Clock,
  Archive,
  Edit2,
  Sliders,
  CheckCircle,
  XCircle,
  Barcode,
  RotateCcw,
  Check,
  Printer,
  Download,
  Filter,
  FileSpreadsheet,
} from "lucide-react";

function ItemsPageContent() {
  const searchParams = useSearchParams();
  const initialLowStock = searchParams.get("lowStock") === "true";

  // Data state
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Advanced Search & Filter states (matching uploaded desktop software report)
  const [searchName, setSearchName] = useState("");
  const [searchSku, setSearchSku] = useState("");
  const [reportType, setReportType] = useState<"ALL" | "IN_HAND" | "LOW_STOCK" | "OUT_OF_STOCK" | "SERVICES">("ALL");
  const [minUnitPrice, setMinUnitPrice] = useState("");
  const [maxUnitPrice, setMaxUnitPrice] = useState("");
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");

  // Pagination states
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Add / Edit item modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [itemType, setItemType] = useState<"PRODUCT" | "SERVICE">("PRODUCT");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [unit, setUnit] = useState("pcs");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [stock, setStock] = useState("10");
  const [minimumStock, setMinimumStock] = useState("3");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stock Adjustment Modal states
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<any | null>(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState<
    "NEW_SHIPMENT" | "DAMAGED" | "AUDIT_CORRECTION" | "EXPIRED" | "OTHER"
  >("NEW_SHIPMENT");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  // CSV Import Modal states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Type,SellingPrice,PurchasePrice,Unit,Stock,MinimumStock,Category,Description,SKU,Barcode,TaxRate\nSample Product,PRODUCT,150,100,pcs,25,5,Groceries,Sample product description,SKU-001,8901234567,18\nSample Service,SERVICE,500,,hr,,,,Beauty & Salon,Sample service description,,";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "laxzflow_product_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMessage(null);
    setImportError(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

      if (lines.length <= 1) {
        throw new Error("CSV file is empty or missing headers");
      }

      const headers = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase());
      const parsedItems = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map((val) => val.replace(/^["']|["']$/g, "").trim());

        const getVal = (key: string) => {
          const idx = headers.indexOf(key.toLowerCase());
          return idx !== -1 && row[idx] !== undefined ? row[idx] : "";
        };

        const name = getVal("name");
        if (!name) continue;

        parsedItems.push({
          name,
          type: getVal("type").toUpperCase() === "SERVICE" ? "SERVICE" : "PRODUCT",
          sellingPrice: getVal("sellingprice") || getVal("price") || "0",
          purchasePrice: getVal("purchaseprice") || getVal("cost") || "",
          unit: getVal("unit") || "pcs",
          stock: getVal("stock") || getVal("quantity") || getVal("qty") || "0",
          minimumStock: getVal("minimumstock") || getVal("minstock") || "0",
          category: getVal("category") || "",
          description: getVal("description") || "",
          sku: getVal("sku") || "",
          barcode: getVal("barcode") || "",
          taxRate: getVal("taxrate") || getVal("gst") || "0",
        });
      }

      if (parsedItems.length === 0) {
        throw new Error("No valid item rows found in CSV file");
      }

      const res = await fetch("/api/items/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsedItems }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import CSV");
      }

      setImportMessage(`🎉 Successfully imported ${data.importedCount} products/services!`);
      fetchItems();
    } catch (err: any) {
      setImportError(err.message || "Failed to parse CSV file");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchName.trim()) params.set("q", searchName.trim());
      if (statusFilter !== "ACTIVE") params.set("status", statusFilter);

      const res = await fetch(`/api/items?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [statusFilter]);

  // Handle Search button click
  const handleFilterSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchItems();
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchName("");
    setSearchSku("");
    setReportType("ALL");
    setMinUnitPrice("");
    setMaxUnitPrice("");
    setMinQty("");
    setMaxQty("");
    setCurrentPage(1);
    fetchItems();
  };

  // Filtered items computation
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      // 1. Name search
      if (searchName.trim()) {
        const q = searchName.toLowerCase().trim();
        const matchName = it.name.toLowerCase().includes(q);
        const matchCat = it.category && it.category.toLowerCase().includes(q);
        if (!matchName && !matchCat) return false;
      }

      // 2. SKU / Barcode search
      if (searchSku.trim()) {
        const sq = searchSku.toLowerCase().trim();
        const matchSku = it.sku && it.sku.toLowerCase().includes(sq);
        const matchBarcode = it.barcode && it.barcode.toLowerCase().includes(sq);
        if (!matchSku && !matchBarcode) return false;
      }

      // 3. Report Type
      if (reportType === "IN_HAND") {
        if (it.type !== "PRODUCT" || (it.stock !== null && Number(it.stock) <= 0)) return false;
      } else if (reportType === "LOW_STOCK") {
        if (it.type !== "PRODUCT" || it.stock === null || Number(it.stock) > Number(it.minimumStock ?? 0) || Number(it.stock) <= 0) return false;
      } else if (reportType === "OUT_OF_STOCK") {
        if (it.type !== "PRODUCT" || (it.stock !== null && Number(it.stock) > 0)) return false;
      } else if (reportType === "SERVICES") {
        if (it.type !== "SERVICE") return false;
      }

      // 4. Price range
      const price = Number(it.sellingPrice);
      if (minUnitPrice !== "" && price < Number(minUnitPrice)) return false;
      if (maxUnitPrice !== "" && price > Number(maxUnitPrice)) return false;

      // 5. Quantity range
      if (it.type === "PRODUCT" && it.stock !== null) {
        const qty = Number(it.stock);
        if (minQty !== "" && qty < Number(minQty)) return false;
        if (maxQty !== "" && qty > Number(maxQty)) return false;
      }

      return true;
    });
  }, [items, searchName, searchSku, reportType, minUnitPrice, maxUnitPrice, minQty, maxQty]);

  // Aggregated Summary Totals ("TOTAL ALL" row matching screenshot)
  const reportSummary = useMemo(() => {
    let totalQty = 0;
    let totalValuation = 0;
    let totalCogs = 0;

    for (const it of filteredItems) {
      if (it.type === "PRODUCT" && it.stock !== null) {
        const q = Number(it.stock);
        const price = Number(it.sellingPrice);
        const cost = Number(it.purchasePrice ?? 0);

        totalQty += q;
        totalValuation += q * price;
        totalCogs += q * cost;
      }
    }

    const totalGrossMargin = totalValuation - totalCogs;
    const grossMarginPct = totalValuation > 0 ? (totalGrossMargin / totalValuation) * 100 : 0;

    return {
      itemCount: filteredItems.length,
      totalQty,
      totalValuation,
      totalCogs,
      totalGrossMargin,
      grossMarginPct,
    };
  }, [filteredItems]);

  // Paginated slice
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      "No",
      "Name",
      "Type",
      "Description",
      "Stock Quantity",
      "Unit Price (INR)",
      "UoM",
      "SKU",
      "Barcode",
      "COGS / Purchase Price",
      "Total Valuation (INR)",
      "Gross Margin (INR)",
      "Gross Margin %",
    ];

    const rows = filteredItems.map((it, idx) => {
      const q = it.type === "PRODUCT" ? Number(it.stock ?? 0) : 0;
      const price = Number(it.sellingPrice);
      const cost = Number(it.purchasePrice ?? 0);
      const margin = price - cost;
      const marginPct = price > 0 ? ((margin / price) * 100).toFixed(1) : "0.0";

      return [
        idx + 1,
        `"${it.name.replace(/"/g, '""')}"`,
        it.type,
        `"${(it.description || "").replace(/"/g, '""')}"`,
        q,
        price,
        it.unit || "pcs",
        it.sku || "",
        it.barcode || "",
        cost,
        q * price,
        margin,
        `${marginPct}%`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Products_Services_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setItemType("PRODUCT");
    setName("");
    setSku("");
    setBarcode("");
    setCategory("");
    setDescription("");
    setSellingPrice("");
    setPurchasePrice("");
    setTaxRate("0");
    setUnit("pcs");
    setDurationMinutes("");
    setStock("10");
    setMinimumStock("3");
    setIsActive(true);
    setError(null);
    setIsAddEditOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setItemType(item.type);
    setName(item.name || "");
    setSku(item.sku || "");
    setBarcode(item.barcode || "");
    setCategory(item.category || "");
    setDescription(item.description || "");
    setSellingPrice(String(item.sellingPrice ?? ""));
    setPurchasePrice(item.purchasePrice !== null ? String(item.purchasePrice) : "");
    setTaxRate(String(item.taxRate ?? "0"));
    setUnit(item.unit || "pcs");
    setDurationMinutes(item.durationMinutes ? String(item.durationMinutes) : "");
    setStock(item.stock !== null ? String(item.stock) : "0");
    setMinimumStock(item.minimumStock !== null ? String(item.minimumStock) : "0");
    setIsActive(item.isActive ?? true);
    setError(null);
    setIsAddEditOpen(true);
  };

  const openStockModal = (item: any) => {
    setAdjustingItem(item);
    setAdjustmentDelta("");
    setAdjustmentReason("NEW_SHIPMENT");
    setAdjustmentNotes("");
    setStockError(null);
    setIsStockModalOpen(true);
  };

  // Add / Edit Save Handler
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sellingPrice) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        name: name.trim(),
        type: itemType,
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        sellingPrice: Number(sellingPrice),
        taxRate: Number(taxRate) || 0,
        unit: unit.trim() || (itemType === "SERVICE" ? "hr" : "pcs"),
        isActive,
      };

      if (purchasePrice !== "") payload.purchasePrice = Number(purchasePrice);

      if (itemType === "PRODUCT") {
        payload.stock = Number(stock) || 0;
        payload.minimumStock = Number(minimumStock) || 0;
      } else {
        if (durationMinutes) payload.durationMinutes = Number(durationMinutes);
      }

      const url = editingItem ? `/api/items/${editingItem.id}` : "/api/items";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save item");
      }

      setIsAddEditOpen(false);
      fetchItems();
    } catch (err: any) {
      setError(err.message || "Failed to save item");
    } finally {
      setSubmitting(false);
    }
  };

  // Stock Adjustment Handler
  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem || !adjustmentDelta) return;

    setAdjusting(true);
    setStockError(null);

    try {
      const delta = Number(adjustmentDelta);
      if (isNaN(delta) || delta === 0) {
        throw new Error("Please enter a non-zero adjustment amount (e.g. +10 or -3)");
      }

      const res = await fetch(`/api/items/${adjustingItem.id}/adjust-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityDelta: delta,
          reason: adjustmentReason,
          notes: adjustmentNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to adjust stock");
      }

      setIsStockModalOpen(false);
      fetchItems();
    } catch (err: any) {
      setStockError(err.message || "Failed to adjust stock");
    } finally {
      setAdjusting(false);
    }
  };

  // Deactivate or Reactivate Item
  const handleToggleDeactivate = async (item: any) => {
    const action = item.isActive ? "deactivate" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} "${item.name}"?`)) return;

    try {
      if (item.isActive) {
        await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      } else {
        await fetch(`/api/items/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...item, isActive: true }),
        });
      }
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout title="Products & Services Inventory Report">
      <div className="space-y-5">
        {/* ============================================================ */}
        {/* TOP SEARCH FILTER PANEL (MATCHING DESKTOP SOFTWARE SCREENSHOT) */}
        {/* ============================================================ */}
        <Card className="border-slate-200/80 shadow-sm bg-slate-50/50">
          <CardContent className="p-4 sm:p-5">
            <form onSubmit={handleFilterSearch} className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-900" />
                  Search Products / Services Filter
                </h3>
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === "ACTIVE" ? "ALL" : "ACTIVE")}
                  className="text-xs text-slate-900 hover:text-slate-700 font-semibold"
                >
                  {statusFilter === "ACTIVE" ? "Include Archived Items" : "Showing All (Click for Active Only)"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {/* Product/Service Name */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Product / Service Name</label>
                  <Input
                    placeholder="e.g. Shampoo, Haircut..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                </div>

                {/* Report Type */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">REPORT TYPE</label>
                  <Select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as any)}
                    options={[
                      { value: "ALL", label: "All Items & Services" },
                      { value: "IN_HAND", label: "Items in Hand (Stock > 0)" },
                      { value: "LOW_STOCK", label: "Low Stock Alert Items" },
                      { value: "OUT_OF_STOCK", label: "Out of Stock Items" },
                      { value: "SERVICES", label: "Services Only" },
                    ]}
                  />
                </div>

                {/* SKU / Barcode */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">SKU / Barcode</label>
                  <Input
                    placeholder="e.g. SKU-101 / 890123..."
                    value={searchSku}
                    onChange={(e) => setSearchSku(e.target.value)}
                  />
                </div>

                {/* Unit Price Between */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Unit Price Between (₹)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min ₹"
                      value={minUnitPrice}
                      onChange={(e) => setMinUnitPrice(e.target.value)}
                    />
                    <span className="text-slate-400 font-medium">and</span>
                    <Input
                      type="number"
                      placeholder="Max ₹"
                      value={maxUnitPrice}
                      onChange={(e) => setMaxUnitPrice(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quantity Between */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Quantity Between</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min Qty"
                      value={minQty}
                      onChange={(e) => setMinQty(e.target.value)}
                    />
                    <span className="text-slate-400 font-medium">and</span>
                    <Input
                      type="number"
                      placeholder="Max Qty"
                      value={maxQty}
                      onChange={(e) => setMaxQty(e.target.value)}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-end gap-2 pt-1">
                  <Button type="submit" size="sm" icon={<Search className="w-3.5 h-3.5" />}>
                    Search
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleResetFilters} icon={<RotateCcw className="w-3.5 h-3.5" />}>
                    Reset
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* RESULTS BAR & EXPORT / PRINT ACTIONS */}
        {/* ============================================================ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Results ({filteredItems.length} items)
            </h3>
            {statusFilter !== "ACTIVE" && (
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                Including Archived
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={openAddModal} icon={<Plus className="w-3.5 h-3.5" />}>
              + New Product/Service
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} icon={<Download className="w-3.5 h-3.5 rotate-180" />}>
              + Import CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} icon={<FileSpreadsheet className="w-3.5 h-3.5" />}>
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} icon={<Printer className="w-3.5 h-3.5" />}>
              Print Report
            </Button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RESULTS TABLE GRID (EXACT LAYOUT FROM UPLOADED SCREENSHOT) */}
        {/* ============================================================ */}
        <Card className="border-slate-200">
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16 text-xs text-slate-400">Loading inventory records...</div>
            ) : filteredItems.length === 0 ? (
              <EmptyState
                icon={<Package className="w-6 h-6" />}
                title="No matching products or services found"
                description="Try adjusting your search query, price range, or reset filters."
                actionLabel="+ Add New Product/Service"
                onAction={openAddModal}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-slate-700 font-bold bg-slate-100">
                      <th className="py-3 px-3 w-10 text-center">No.</th>
                      <th className="py-3 px-3">Product / Service Name</th>
                      <th className="py-3 px-3">Description</th>
                      <th className="py-3 px-3 text-center w-24">Quantity</th>
                      <th className="py-3 px-3 text-right w-28">Valuation Amt</th>
                      <th className="py-3 px-3 text-right w-24">Unit Price</th>
                      <th className="py-3 px-3 text-center w-16">UoM</th>
                      <th className="py-3 px-3 w-28">SKU / Barcode</th>
                      <th className="py-3 px-3 text-right w-24">COGS (Cost)</th>
                      <th className="py-3 px-3 text-right w-24">Gross Margin</th>
                      <th className="py-3 px-3 text-center w-24">Margin %</th>
                      <th className="py-3 px-3 text-right w-28 no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedItems.map((it, idx) => {
                      const isProduct = it.type === "PRODUCT";
                      const qty = isProduct && it.stock !== null ? Number(it.stock) : 0;
                      const price = Number(it.sellingPrice);
                      const cost = Number(it.purchasePrice ?? 0);
                      const valuation = qty * price;
                      const margin = price - cost;
                      const marginPct = price > 0 ? (margin / price) * 100 : 0;
                      const minStock = Number(it.minimumStock ?? 0);
                      const isLow = isProduct && qty > 0 && qty <= minStock;
                      const isOut = isProduct && qty <= 0;

                      const rowIndex = (currentPage - 1) * itemsPerPage + idx + 1;

                      return (
                        <tr
                          key={it.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            !it.isActive ? "opacity-60 bg-slate-50/50" : ""
                          }`}
                        >
                          <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono">
                            {rowIndex}
                          </td>

                          <td className="py-3 px-3 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              {it.type === "SERVICE" ? (
                                <Scissors className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              ) : (
                                <Package className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                              )}
                              <span>{it.name}</span>
                              {!it.isActive && (
                                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                                  Archived
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-slate-500 truncate max-w-xs">
                            {it.description || "-"}
                          </td>

                          <td className="py-3 px-3 text-center font-mono font-bold">
                            {isProduct ? (
                              <span className={isOut ? "text-rose-600 font-bold" : isLow ? "text-amber-600 font-bold" : "text-slate-800"}>
                                {qty}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">Service</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(valuation)}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(price)}
                          </td>

                          <td className="py-3 px-3 text-center text-slate-600 uppercase font-mono">
                            {it.unit || (it.type === "SERVICE" ? "hr" : "pcs")}
                          </td>

                          <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                            {it.sku || it.barcode || "-"}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {cost > 0 ? formatCurrency(cost) : "-"}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600">
                            {formatCurrency(margin)}
                          </td>

                          <td className="py-3 px-3 text-center font-mono">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                marginPct >= 20
                                  ? "bg-emerald-50 text-emerald-700"
                                  : marginPct > 0
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {marginPct.toFixed(1)}%
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right no-print">
                            <div className="flex items-center justify-end gap-1">
                              {isProduct && it.isActive && (
                                <button
                                  type="button"
                                  onClick={() => openStockModal(it)}
                                  className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded transition-colors"
                                  title="Adjust Stock (+/-)"
                                >
                                  + / - Stock
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => openEditModal(it)}
                                className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleDeactivate(it)}
                                className={`p-1 rounded transition-colors ${
                                  it.isActive
                                    ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                    : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                }`}
                                title={it.isActive ? "Deactivate / Archive" : "Reactivate"}
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* ============================================================ */}
                    {/* TOTAL ALL SUMMARY ROW (EXACTLY MATCHING DESKTOP SCREENSHOT) */}
                    {/* ============================================================ */}
                    <tr className="border-t-2 border-slate-900 bg-slate-900 text-white font-black text-xs">
                      <td colSpan={3} className="py-3 px-3 uppercase tracking-wider text-right">
                        TOTAL ALL ({reportSummary.itemCount} Items)
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-sm text-slate-300">
                        {reportSummary.totalQty}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm text-emerald-400">
                        {formatCurrency(reportSummary.totalValuation)}
                      </td>
                      <td colSpan={3} className="py-3 px-3"></td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-300">
                        {formatCurrency(reportSummary.totalCogs)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-emerald-300">
                        {formatCurrency(reportSummary.totalGrossMargin)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-xs text-amber-300">
                        {reportSummary.grossMarginPct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 no-print"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>

          {/* Pagination Controls */}
          {filteredItems.length > 0 && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-semibold">Results Per Page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded border border-slate-300 py-1 px-2 font-bold bg-white text-slate-800"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded border border-slate-300 bg-white font-bold disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded border border-slate-300 bg-white font-bold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ============================================================ */}
      {/* ADD / EDIT ITEM MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingItem ? `Edit ${editingItem.name}` : "Add Item to Catalog"}
        description={editingItem ? "Update product details, pricing, and stock settings" : "Create a new product or service for billing"}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Type Toggle: Product vs Service */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Item Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setItemType("PRODUCT")}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  itemType === "PRODUCT"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Package className="w-4 h-4" />
                Product (with Inventory)
              </button>
              <button
                type="button"
                onClick={() => setItemType("SERVICE")}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  itemType === "SERVICE"
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Scissors className="w-4 h-4" />
                Service (no Stock needed)
              </button>
            </div>
          </div>

          <Input
            label={itemType === "PRODUCT" ? "Product Name *" : "Service Name *"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={itemType === "PRODUCT" ? "e.g. Basmati Rice 1kg / Shampoo" : "e.g. Haircut / Website Maintenance"}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Selling Price (₹) *"
              type="number"
              step="0.01"
              min="0"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="0.00"
              required
            />

            <Input
              label="Purchase Cost Price (COGS ₹ Optional)"
              type="number"
              step="0.01"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="GST Tax Rate (%)"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              options={[
                { value: "0", label: "0% - Exempt / Nil" },
                { value: "5", label: "5%" },
                { value: "12", label: "12%" },
                { value: "18", label: "18% - Standard" },
                { value: "28", label: "28%" },
              ]}
            />

            <Input
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Groceries, Beauty"
            />

            <Input
              label="SKU Code"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. PRD-001"
            />
          </div>

          {itemType === "PRODUCT" && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Inventory & Barcode Details</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input
                  label="Barcode Number"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g. 890123456789"
                />
                <Input
                  label="Unit (UoM)"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="pcs / box / kg"
                />
                <Input
                  label="Current Stock"
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="10"
                />
                <Input
                  label="Min Stock Alert"
                  type="number"
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(e.target.value)}
                  placeholder="3"
                />
              </div>
            </div>
          )}

          {itemType === "SERVICE" && (
            <Input
              label="Estimated Duration (Minutes)"
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="e.g. 30"
            />
          )}

          <Input
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short details displayed on bill"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingItem ? "Update Item" : "Create Item"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* STOCK ADJUSTMENT MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={`Adjust Stock: ${adjustingItem?.name}`}
        description="Record stock received, damaged goods, or audit corrections"
      >
        <form onSubmit={handleAdjustStock} className="space-y-4">
          {stockError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {stockError}
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
            <span className="text-slate-600 font-semibold">Current Stock Level:</span>
            <span className="text-base font-black text-indigo-600 font-mono">
              {adjustingItem?.stock ?? 0} {adjustingItem?.unit || "pcs"}
            </span>
          </div>

          <Input
            label="Adjustment Quantity (e.g. +10 for new shipment, -3 for damaged) *"
            type="number"
            value={adjustmentDelta}
            onChange={(e) => setAdjustmentDelta(e.target.value)}
            placeholder="e.g. +10 or -3"
            required
            autoFocus
          />

          <Select
            label="Reason for Adjustment *"
            value={adjustmentReason}
            onChange={(e) => setAdjustmentReason(e.target.value as any)}
            options={[
              { value: "NEW_SHIPMENT", label: "New Stock / Supplier Shipment (+)" },
              { value: "DAMAGED", label: "Damaged / Broken Goods (-)" },
              { value: "EXPIRED", label: "Expired Stock (-)" },
              { value: "AUDIT_CORRECTION", label: "Inventory Audit Correction (+/-)" },
              { value: "OTHER", label: "Other Reason" },
            ]}
          />

          <Input
            label="Notes / Supplier Ref (Optional)"
            value={adjustmentNotes}
            onChange={(e) => setAdjustmentNotes(e.target.value)}
            placeholder="e.g. Invoice #9910 from wholesaler"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsStockModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={adjusting}>
              Record Stock Adjustment
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          setImportMessage(null);
          setImportError(null);
        }}
        title="Import Products & Services via CSV"
        description="Upload a CSV file containing your product catalog or inventory list"
      >
        <div className="space-y-4">
          {importMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg">
              {importMessage}
            </div>
          )}

          {importError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg">
              {importError}
            </div>
          )}

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">CSV Template Format</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your CSV should include column headers: <strong>Name, Type, SellingPrice, PurchasePrice, Unit, Stock, MinimumStock, Category, Description, SKU, Barcode, TaxRate</strong>.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
            >
              Download Sample CSV Template
            </Button>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-slate-400 transition-colors bg-white">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={importing}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-black cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-2">
              {importing ? "Parsing and importing catalog items..." : "Select a .csv file from your computer"}
            </p>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsImportOpen(false);
                setImportMessage(null);
                setImportError(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

export default function ItemsPage() {
  return (
    <React.Suspense fallback={<div className="text-center py-20 text-xs text-slate-400">Loading catalog...</div>}>
      <ItemsPageContent />
    </React.Suspense>
  );
}
