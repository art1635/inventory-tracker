"use client";

import { useEffect, useRef, useState } from "react";

type Supplier = { id: string; name: string; gstNumber?: string | null };
type Product = { id: string; name: string; unit: string; defaultRatePerLitre?: number | null };
type Purchase = {
  id: string;
  date: string;
  reference: string | null;
  gstNumber?: string | null;
  notes: string | null;
  total: number;
  supplier: { id: string; name: string };
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    total: number;
    batchNumber: string | null;
    ratePerLitre: number | null;
    unitsReceived: number | null;
    stockType: string | null;
    manufacturingDate?: string | null;
    product: { name: string };
  }[];
};

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [purchaseDetail, setPurchaseDetail] = useState<Purchase | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierGstNumber, setNewSupplierGstNumber] = useState("");
  const [reference, setReference] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [openProductLine, setOpenProductLine] = useState<number | null>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncingInventory, setSyncingInventory] = useState(false);
  const [syncInventoryMessage, setSyncInventoryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (openProductLine === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setOpenProductLine(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openProductLine]);

  const [lines, setLines] = useState<
    {
      productId: string;
      productSearch: string;
      batchNumber: string;
      ratePerLitre: string;
      unitsReceived: string;
      stockType: string;
      manufacturingDate: string;
      unitPrice: number;
    }[]
  >([
    {
      productId: "",
      productSearch: "",
      batchNumber: "",
      ratePerLitre: "",
      unitsReceived: "",
      stockType: "",
      manufacturingDate: "",
      unitPrice: 0,
    },
  ]);

  const load = () => {
    setLoadError(null);
    Promise.all([
      fetch("/api/purchases").then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
      fetch("/api/suppliers").then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
      fetch("/api/products").then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
    ])
      .then(([p, s, prod]) => {
        const err: string[] = [];
        if (p.ok && Array.isArray(p.json)) setPurchases(p.json);
        else err.push((p.json as { error?: string })?.error || "purchases");
        if (s.ok && Array.isArray(s.json)) setSuppliers(s.json);
        else err.push((s.json as { error?: string })?.error || "suppliers");
        if (prod.ok && Array.isArray(prod.json)) setProducts(prod.json);
        else err.push((prod.json as { error?: string })?.error || "products");
        setLoadError(err.length ? (err.length === 1 ? err[0] : "Failed to load data. Check your connection and retry.") : null);
      })
      .catch(() => setLoadError("Failed to load data. Check your connection and retry."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, []);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        productId: "",
        productSearch: "",
        batchNumber: "",
        ratePerLitre: "",
        unitsReceived: "",
        stockType: "",
        manufacturingDate: "",
        unitPrice: 0,
      },
    ]);
  };
  const updateLine = (i: number, field: string, value: string | number) => {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      if (field === "productId") {
        const pid = value as string;
        const product = products.find((p) => p.id === pid);
        next[i].productSearch = product?.name ?? "";
        if (product?.defaultRatePerLitre != null) {
          next[i].ratePerLitre = String(product.defaultRatePerLitre);
        }
        setOpenProductLine(null);
      }
      return next;
    });
  };
  const removeLine = (i: number) => {
    setLines((prev) => prev.filter((_, j) => j !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim()) {
      alert("Invoice number is required.");
      return;
    }
    if (supplierId === "__new__" && !newSupplierName.trim()) {
      alert("Enter the new supplier name");
      return;
    }
    if (supplierId === "__new__" && !newSupplierGstNumber.trim()) {
      alert("GST Number is required for the new supplier.");
      return;
    }
    const items = lines.filter(
      (l) => l.productId && (Number(l.unitsReceived) || 0) > 0
    );
    if (items.length === 0) {
      alert("Add at least one product with units received > 0");
      return;
    }
    const missingBatch = items.some((l) => !l.batchNumber?.trim());
    if (missingBatch) {
      alert("Batch number is required for every line item.");
      return;
    }
    const missingDom = items.some((l) => !l.manufacturingDate?.trim());
    if (missingDom) {
      alert("Date of manufacturing is required for every line item.");
      return;
    }
    const body = {
      supplierId: supplierId === "__new__" ? undefined : supplierId,
      ...(supplierId === "__new__" && newSupplierName.trim() && {
        newSupplier: {
          name: newSupplierName.trim(),
          gstNumber: newSupplierGstNumber.trim(),
        },
      }),
      reference: reference.trim(),
      gstNumber: gstNumber.trim() || null,
      notes: notes.trim() || null,
      date,
      items: items.map((l) => ({
        productId: l.productId,
        batchNumber: l.batchNumber.trim(),
        ratePerLitre: l.ratePerLitre.trim() ? parseFloat(l.ratePerLitre) : undefined,
        unitsReceived: Number(l.unitsReceived) || 0,
        stockType: l.stockType.trim() || undefined,
        manufacturingDate: l.manufacturingDate.trim(),
        unitPrice: Number(l.unitPrice) || 0,
      })),
    };
    const url = editingPurchaseId ? `/api/purchases/${editingPurchaseId}` : "/api/purchases";
    const method = editingPurchaseId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || (editingPurchaseId ? "Failed to update purchase" : "Failed to create purchase"));
      return;
    }
    setSupplierId("");
    setNewSupplierName("");
    setNewSupplierGstNumber("");
    setReference("");
    setGstNumber("");
    setNotes("");
    setDate(new Date().toISOString().slice(0, 10));
    setLines([
      {
        productId: "",
        productSearch: "",
        batchNumber: "",
        ratePerLitre: "",
        unitsReceived: "",
        stockType: "",
        manufacturingDate: "",
        unitPrice: 0,
      },
    ]);
    setShowForm(false);
    setEditingPurchaseId(null);
    load();
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchaseId(purchase.id);
    setSupplierId(purchase.supplier.id);
    setNewSupplierName("");
    setNewSupplierGstNumber("");
    setReference(purchase.reference ?? "");
    setGstNumber(purchase.gstNumber ?? "");
    setNotes(purchase.notes ?? "");
    setDate(purchase.date.slice(0, 10));
    setLines(
      purchase.items.length > 0
        ? purchase.items.map((it) => ({
            productId: it.productId,
            productSearch: it.product?.name ?? "",
            batchNumber: it.batchNumber ?? "",
            ratePerLitre: it.ratePerLitre != null ? String(it.ratePerLitre) : "",
            unitsReceived: String(it.unitsReceived ?? it.quantity),
            stockType: it.stockType ?? "",
            manufacturingDate: it.manufacturingDate ? it.manufacturingDate.slice(0, 10) : "",
            unitPrice: it.unitPrice,
          }))
        : [
            {
              productId: "",
              productSearch: "",
              batchNumber: "",
              ratePerLitre: "",
              unitsReceived: "",
              stockType: "",
              manufacturingDate: "",
              unitPrice: 0,
            },
          ]
    );
    setShowForm(true);
  };

  const handleDelete = async (purchase: Purchase) => {
    if (!confirm(`Delete this purchase (${purchase.supplier.name}, ${new Date(purchase.date).toLocaleDateString()})? Inventory will be reduced.`)) return;
    const res = await fetch(`/api/purchases/${purchase.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to delete purchase");
      return;
    }
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-800">{loadError}</p>
          <button
            type="button"
            onClick={() => { setLoadError(null); setLoading(true); load(); }}
            className="rounded-lg bg-amber-200 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-300"
          >
            Retry
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Purchases</h1>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) setEditingPurchaseId(null);
          }}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-teal-700 hover:shadow-lg transition-all"
        >
          {showForm ? "Cancel" : "Record purchase"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-md"
        >
          <h2 className="mb-4 text-sm font-medium text-slate-700">
            {editingPurchaseId ? "Edit purchase — inventory will be adjusted" : "New purchase (from supplier) — inventory will increase"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-600">Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSupplierId(value);
                  if (value && value !== "__new__") {
                    const supplier = (Array.isArray(suppliers) ? suppliers : []).find((s) => s.id === value);
                    setGstNumber(supplier?.gstNumber ?? "");
                  } else {
                    setGstNumber("");
                  }
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select supplier</option>
                <option value="__new__">+ Add new supplier</option>
                {(Array.isArray(suppliers) ? suppliers : []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {supplierId === "__new__" && (
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2 border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div>
                  <label className="block text-sm text-slate-600">New supplier name *</label>
                  <input
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Supplier name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600">GST Number *</label>
                  <input
                    value={newSupplierGstNumber}
                    onChange={(e) => setNewSupplierGstNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="e.g. 27AABCU9603R1ZM"
                    required
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm text-slate-600">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Invoice number *</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Invoice #"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">GST number</label>
              <input
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. 27AABCU9603R1ZM"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-600">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Items</span>
              <button
                type="button"
                onClick={addLine}
                className="text-sm text-teal-600 hover:underline"
              >
                + Add line
              </button>
            </div>
            <div className="mt-2 space-y-4">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-4"
                >
                  <div className="mb-2 text-xs font-medium text-slate-500">
                    Line {i + 1}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <div className="relative lg:col-span-2" ref={openProductLine === i ? productDropdownRef : null}>
                      <label className="block text-xs text-slate-600">
                        Product (Product Master) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setOpenProductLine((prev) => (prev === i ? null : i))}
                        className="mt-0.5 flex w-full items-center justify-between rounded border border-slate-300 bg-white px-2 py-1.5 text-left text-sm text-slate-900"
                      >
                        <span className={line.productId ? "" : "text-slate-500"}>
                          {line.productId
                            ? (products.find((p) => p.id === line.productId)?.name ?? (line.productSearch || "Select product"))
                            : "Select product"}
                        </span>
                        <span className="text-slate-400 text-xs" aria-hidden>v</span>
                      </button>
                      {openProductLine === i && (
                        <div className="absolute left-0 top-full z-10 mt-0.5 w-full rounded border border-slate-200 bg-white shadow-lg">
                          <input
                            type="text"
                            value={line.productSearch}
                            onChange={(e) =>
                              setLines((prev) => {
                                const next = [...prev];
                                next[i] = { ...next[i], productSearch: e.target.value };
                                return next;
                              })
                            }
                            placeholder="Search products..."
                            className="w-full border-b border-slate-200 px-2 py-1.5 text-sm placeholder:text-slate-400 focus:outline-none"
                            autoFocus
                          />
                          <ul className="max-h-48 overflow-y-auto py-1">
                            {(Array.isArray(products) ? products : [])
                              .filter((p) =>
                                !line.productSearch.trim()
                                  ? true
                                  : p.name.toLowerCase().includes(line.productSearch.trim().toLowerCase())
                              )
                              .map((p) => (
                                <li key={p.id}>
                                  <button
                                    type="button"
                                    onClick={() => updateLine(i, "productId", p.id)}
                                    className={`w-full px-2 py-1.5 text-left text-sm hover:bg-slate-100 ${line.productId === p.id ? "bg-teal-50 text-teal-800" : ""}`}
                                  >
                                    {p.name}
                                  </button>
                                </li>
                              ))}
                            {((Array.isArray(products) ? products : []).filter((p) =>
                              !line.productSearch.trim()
                                ? true
                                : p.name.toLowerCase().includes(line.productSearch.trim().toLowerCase())
                            ).length === 0) && (
                              <li className="px-2 py-2 text-sm text-slate-500">No products match</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600">
                        Batch number *
                      </label>
                      <input
                        type="text"
                        value={line.batchNumber}
                        onChange={(e) =>
                          updateLine(i, "batchNumber", e.target.value)
                        }
                        className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        placeholder="e.g. BATCH-001"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600">
                        Rate per litre (optional; uses product default if blank)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.ratePerLitre}
                        onChange={(e) =>
                          updateLine(i, "ratePerLitre", e.target.value)
                        }
                        className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        placeholder="Auto from product"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600">
                        Units received *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={line.unitsReceived}
                        onChange={(e) =>
                          updateLine(i, "unitsReceived", e.target.value)
                        }
                        className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600">
                        Stock type
                      </label>
                      <select
                        value={line.stockType}
                        onChange={(e) =>
                          updateLine(i, "stockType", e.target.value)
                        }
                        className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">Select</option>
                        <option value="Drum">Drum</option>
                        <option value="Pail">Pail</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600">
                        Date of manufacturing *
                      </label>
                      <input
                        type="date"
                        value={line.manufacturingDate}
                        onChange={(e) =>
                          updateLine(i, "manufacturingDate", e.target.value)
                        }
                        className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove line
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-teal-700 hover:shadow-lg transition-all"
            >
              {editingPurchaseId ? "Update purchase" : "Save purchase"}
            </button>
          </div>
        </form>
      )}

      {!showForm && (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                Supplier
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                Invoice number
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                Total
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No purchases yet. Record one above.
                </td>
              </tr>
            ) : (
              (Array.isArray(purchases) ? purchases : []).map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {new Date(p.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {p.supplier.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <button
                      type="button"
                      onClick={() => setPurchaseDetail(p)}
                      className="text-teal-600 hover:underline text-left"
                    >
                      {p.reference ?? "—"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                    ₹{p.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(p)}
                        className="text-sm text-teal-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {purchaseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" aria-modal="true" role="dialog">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-900">Purchase details</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!purchaseDetail?.id || syncingInventory) return;
                    setSyncingInventory(true);
                    setSyncInventoryMessage(null);
                    try {
                      const r = await fetch(`/api/purchases/${purchaseDetail.id}/sync-inventory`, { method: "POST" });
                      const json = await r.json();
                      if (r.ok) {
                        setSyncInventoryMessage({ type: "success", text: "Synced to inventory. Check the Inventory page." });
                      } else {
                        setSyncInventoryMessage({ type: "error", text: (json as { error?: string }).error ?? "Failed to sync" });
                      }
                    } catch {
                      setSyncInventoryMessage({ type: "error", text: "Failed to sync. Check your connection." });
                    } finally {
                      setSyncingInventory(false);
                    }
                  }}
                  disabled={syncingInventory}
                  title="Only needed if this purchase’s products are missing from Inventory (e.g. old data)"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {syncingInventory ? "Syncing…" : "Fix missing inventory"}
                </button>
                <button
                  type="button"
                  onClick={() => { setPurchaseDetail(null); setSyncInventoryMessage(null); }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-4rem)] p-4 space-y-4">
              <p className="text-xs text-slate-500">
                Inventory is updated automatically when you create or edit a purchase (product, batch, quantity, litres). Use &quot;Fix missing inventory&quot; only if this purchase’s products don’t appear in Inventory.
              </p>
              {syncInventoryMessage && (
                <div className={`rounded-lg border p-3 text-sm ${syncInventoryMessage.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                  {syncInventoryMessage.text}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">Date</span>
                  <p className="font-medium text-slate-900">{new Date(purchaseDetail.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-slate-500">Invoice number</span>
                  <p className="font-medium text-slate-900">{purchaseDetail.reference ?? "—"}</p>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium text-slate-500 mb-2">Line items</h4>
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Product name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Batch number</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">DOM</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Units</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Purchase price per litre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(purchaseDetail.items ?? []).map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-slate-900">{item.product?.name ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-600">{item.batchNumber ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {item.manufacturingDate ? new Date(item.manufacturingDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-900">{item.quantity ?? item.unitsReceived ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-slate-900">
                          {item.ratePerLitre != null ? `₹${Number(item.ratePerLitre).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
