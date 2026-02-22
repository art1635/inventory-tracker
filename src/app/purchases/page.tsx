"use client";

import { useEffect, useState } from "react";

type Supplier = { id: string; name: string };
type Product = { id: string; name: string; unit: string; defaultRatePerLitre?: number | null };
type Purchase = {
  id: string;
  date: string;
  reference: string | null;
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
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierAddress, setNewSupplierAddress] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<
    {
      productId: string;
      batchNumber: string;
      ratePerLitre: string;
      unitsReceived: string;
      stockType: string;
      unitPrice: number;
    }[]
  >([
    {
      productId: "",
      batchNumber: "",
      ratePerLitre: "",
      unitsReceived: "",
      stockType: "",
      unitPrice: 0,
    },
  ]);

  const load = () => {
    fetch("/api/purchases").then((r) => r.json()).then((json) => setPurchases(Array.isArray(json) ? json : [])).catch(() => setPurchases([]));
    fetch("/api/suppliers").then((r) => r.json()).then((json) => setSuppliers(Array.isArray(json) ? json : [])).catch(() => setSuppliers([]));
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/purchases").then((r) => r.json()),
      fetch("/api/suppliers").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ])
      .then(([p, s, prod]) => {
        setPurchases(Array.isArray(p) ? p : []);
        setSuppliers(Array.isArray(s) ? s : []);
        setProducts(Array.isArray(prod) ? prod : []);
      })
      .catch(() => {
        setPurchases([]);
        setSuppliers([]);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        productId: "",
        batchNumber: "",
        ratePerLitre: "",
        unitsReceived: "",
        stockType: "",
        unitPrice: 0,
      },
    ]);
  };
  const updateLine = (i: number, field: string, value: string | number) => {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      if (field === "productId") {
        const product = products.find((p) => p.id === value);
        if (product?.defaultRatePerLitre != null) {
          next[i].ratePerLitre = String(product.defaultRatePerLitre);
        }
      }
      return next;
    });
  };
  const removeLine = (i: number) => {
    setLines((prev) => prev.filter((_, j) => j !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supplierId === "__new__" && !newSupplierName.trim()) {
      alert("Enter the new supplier name");
      return;
    }
    const items = lines.filter(
      (l) => l.productId && (Number(l.unitsReceived) || 0) > 0
    );
    if (items.length === 0) {
      alert("Add at least one product with units received > 0");
      return;
    }
    const body = {
      supplierId: supplierId === "__new__" ? undefined : supplierId,
      ...(supplierId === "__new__" && newSupplierName.trim() && {
        newSupplier: {
          name: newSupplierName.trim(),
          email: newSupplierEmail.trim() || undefined,
          phone: newSupplierPhone.trim() || undefined,
          address: newSupplierAddress.trim() || undefined,
        },
      }),
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      date,
      items: items.map((l) => ({
        productId: l.productId,
        batchNumber: l.batchNumber.trim() || undefined,
        ratePerLitre: l.ratePerLitre.trim() ? parseFloat(l.ratePerLitre) : undefined,
        unitsReceived: Number(l.unitsReceived) || 0,
        stockType: l.stockType.trim() || undefined,
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
    setNewSupplierEmail("");
    setNewSupplierPhone("");
    setNewSupplierAddress("");
    setReference("");
    setNotes("");
    setDate(new Date().toISOString().slice(0, 10));
    setLines([
      {
        productId: "",
        batchNumber: "",
        ratePerLitre: "",
        unitsReceived: "",
        stockType: "",
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
    setNewSupplierEmail("");
    setNewSupplierPhone("");
    setNewSupplierAddress("");
    setReference(purchase.reference ?? "");
    setNotes(purchase.notes ?? "");
    setDate(purchase.date.slice(0, 10));
    setLines(
      purchase.items.length > 0
        ? purchase.items.map((it) => ({
            productId: it.productId,
            batchNumber: it.batchNumber ?? "",
            ratePerLitre: it.ratePerLitre != null ? String(it.ratePerLitre) : "",
            unitsReceived: String(it.unitsReceived ?? it.quantity),
            stockType: it.stockType ?? "",
            unitPrice: it.unitPrice,
          }))
        : [
            {
              productId: "",
              batchNumber: "",
              ratePerLitre: "",
              unitsReceived: "",
              stockType: "",
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Purchases</h1>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) setEditingPurchaseId(null);
          }}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          {showForm ? "Cancel" : "Record purchase"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-medium text-slate-700">
            {editingPurchaseId ? "Edit purchase — inventory will be adjusted" : "New purchase (from supplier) — inventory will increase"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-600">Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
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
                  <label className="block text-sm text-slate-600">Email</label>
                  <input
                    type="email"
                    value={newSupplierEmail}
                    onChange={(e) => setNewSupplierEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600">Phone</label>
                  <input
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Optional"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-slate-600">Address</label>
                  <input
                    value={newSupplierAddress}
                    onChange={(e) => setNewSupplierAddress(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Optional"
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
              <label className="block text-sm text-slate-600">Reference (PO #)</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
                    <div>
                      <label className="block text-xs text-slate-600">
                        Product (Product Master) *
                      </label>
                      <select
                        value={line.productId}
                        onChange={(e) =>
                          updateLine(i, "productId", e.target.value)
                        }
                        className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">Select product</option>
                        {(Array.isArray(products) ? products : []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600">
                        Batch number
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
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs text-slate-600">
                      Price per unit (only if not using rate per litre):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice || ""}
                      onChange={(e) =>
                        updateLine(
                          i,
                          "unitPrice",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              {editingPurchaseId ? "Update purchase" : "Save purchase"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                Reference
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
                    {p.reference ?? "—"}
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
    </div>
  );
}
