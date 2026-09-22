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
  Layers,
  Archive,
} from "lucide-react";

function ItemsPageContent() {
  const searchParams = useSearchParams();
  const initialLowStock = searchParams.get("lowStock") === "true";

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PRODUCT" | "SERVICE">("ALL");
  const [lowStockFilter, setLowStockFilter] = useState(initialLowStock);

  // Add item modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [itemType, setItemType] = useState<"PRODUCT" | "SERVICE">("PRODUCT");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [unit, setUnit] = useState("pcs");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [stock, setStock] = useState("10");
  const [minimumStock, setMinimumStock] = useState("3");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (lowStockFilter) params.set("lowStock", "true");

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
  }, [typeFilter, lowStockFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sellingPrice) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        name: name.trim(),
        type: itemType,
        sku: sku.trim() || undefined,
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        sellingPrice: Number(sellingPrice),
        taxRate: Number(taxRate) || 0,
        unit: unit.trim() || (itemType === "SERVICE" ? "hr" : "pcs"),
      };

      if (purchasePrice) payload.purchasePrice = Number(purchasePrice);

      if (itemType === "PRODUCT") {
        payload.stock = Number(stock) || 0;
        payload.minimumStock = Number(minimumStock) || 0;
      } else {
        if (durationMinutes) payload.durationMinutes = Number(durationMinutes);
      }

      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create item");
      }

      setIsAddOpen(false);
      setName("");
      setSku("");
      setCategory("");
      setDescription("");
      setSellingPrice("");
      setPurchasePrice("");
      setTaxRate("0");
      setStock("10");
      setMinimumStock("3");
      setDurationMinutes("");
      fetchItems();
    } catch (err: any) {
      setError(err.message || "Failed to save item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Products & Services"
      actions={
        <Button size="sm" onClick={() => setIsAddOpen(true)} icon={<Plus className="w-4 h-4" />}>
          + Add Item
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
            <Input
              placeholder="Search by name, SKU, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </form>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
            <button
              onClick={() => {
                setLowStockFilter(false);
                setTypeFilter("ALL");
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                !lowStockFilter && typeFilter === "ALL"
                  ? "bg-indigo-600 text-white font-bold shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => {
                setLowStockFilter(false);
                setTypeFilter("PRODUCT");
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                !lowStockFilter && typeFilter === "PRODUCT"
                  ? "bg-indigo-600 text-white font-bold shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Products
            </button>
            <button
              onClick={() => {
                setLowStockFilter(false);
                setTypeFilter("SERVICE");
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                !lowStockFilter && typeFilter === "SERVICE"
                  ? "bg-indigo-600 text-white font-bold shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              Services
            </button>
            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                lowStockFilter
                  ? "bg-amber-600 text-white font-bold shadow-sm"
                  : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Low Stock
            </button>
          </div>
        </div>

        {/* Catalog Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16 text-xs text-slate-400">Loading catalog...</div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Package className="w-6 h-6" />}
                title="No items found"
                description={
                  search || typeFilter !== "ALL" || lowStockFilter
                    ? "No products or services match your current filters."
                    : "Add products you sell or services you offer to start billing customers."
                }
                actionLabel="+ Add First Item"
                onAction={() => setIsAddOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Category / SKU</th>
                      <th className="py-3 px-4 text-right">Selling Price</th>
                      <th className="py-3 px-4 text-center">Tax Rate</th>
                      <th className="py-3 px-4 text-right">Inventory Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it) => {
                      const isProduct = it.type === "PRODUCT";
                      const isLow =
                        isProduct &&
                        it.stock !== null &&
                        it.minimumStock !== null &&
                        Number(it.stock) <= Number(it.minimumStock);

                      return (
                        <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {it.name}
                            {it.description && (
                              <span className="block text-[11px] text-slate-400 font-normal truncate max-w-sm">
                                {it.description}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge variant={isProduct ? "product" : "service"} size="sm">
                              {isProduct ? "Product" : "Service"}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            {it.category && (
                              <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium mr-1.5">
                                {it.category}
                              </span>
                            )}
                            {it.sku && (
                              <span className="text-[11px] font-mono text-slate-400">
                                SKU: {it.sku}
                              </span>
                            )}
                            {!it.category && !it.sku && <span className="text-slate-400">-</span>}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(it.sellingPrice)}
                          </td>

                          <td className="py-3.5 px-4 text-center text-slate-600">
                            {Number(it.taxRate) > 0 ? `${it.taxRate}%` : "0%"}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {isProduct ? (
                              <div className="inline-flex items-center gap-1.5">
                                <span className={`font-mono font-bold ${isLow ? "text-rose-600" : "text-slate-800"}`}>
                                  {it.stock ?? 0} {it.unit || "pcs"}
                                </span>
                                {isLow && (
                                  <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded font-bold">
                                    Low
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 flex items-center justify-end gap-1 text-[11px]">
                                <Clock className="w-3 h-3" />
                                {it.durationMinutes ? `${it.durationMinutes} mins` : "Service"}
                              </span>
                            )}
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
      </div>

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Item to Catalog"
        description="Add a product or service for quick billing"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateItem} className="space-y-4">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Category (Optional)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Groceries, Beauty, Electronics"
            />
            {itemType === "PRODUCT" ? (
              <Input
                label="SKU / Barcode (Optional)"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. PRD-001"
              />
            ) : (
              <Input
                label="Estimated Duration (Minutes)"
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="e.g. 30"
              />
            )}
          </div>

          {/* Product Inventory Fields */}
          {itemType === "PRODUCT" && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Inventory Details</span>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="pcs / kg"
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

          <Input
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short details displayed on bill"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save {itemType === "PRODUCT" ? "Product" : "Service"}
            </Button>
          </div>
        </form>
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

