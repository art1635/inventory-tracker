"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unit: string;
  stockType: string | null;
  litres: number | null;
  defaultRatePerLitre: number | null;
  gstPerc: number | null;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [stockType, setStockType] = useState("");
  const [litres, setLitres] = useState("");
  const [defaultRatePerLitre, setDefaultRatePerLitre] = useState("");
  const [gstPerc, setGstPerc] = useState("");

  const load = () =>
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setSku(p.sku ?? "");
    setDescription(p.description ?? "");
    setUnit(p.unit ?? "");
    setStockType(p.stockType ?? "");
    setLitres(p.litres != null ? String(p.litres) : "");
    setDefaultRatePerLitre(p.defaultRatePerLitre != null ? String(p.defaultRatePerLitre) : "");
    setGstPerc(p.gstPerc != null ? String(p.gstPerc) : "");
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setSku("");
    setDescription("");
    setUnit("");
    setStockType("");
    setLitres("");
    setDefaultRatePerLitre("");
    setGstPerc("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      sku: sku.trim() || null,
      description: description.trim() || null,
      unit: unit.trim() || "",
      stockType: stockType.trim() || null,
      litres: litres.trim() ? parseFloat(litres) || null : null,
      defaultRatePerLitre: defaultRatePerLitre.trim() ? parseFloat(defaultRatePerLitre) || null : null,
      gstPerc: gstPerc.trim() ? parseFloat(gstPerc) || null : null,
    };
    if (editingId) {
      const res = await fetch(`/api/products/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to update product");
        return;
      }
      cancelForm();
    } else {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to create product");
        return;
      }
      cancelForm();
    }
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else alert("Failed to delete");
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
        <h1 className="text-2xl font-semibold text-slate-900">Product Master</h1>
        <button
          type="button"
          onClick={() => {
            if (showForm) cancelForm();
            else {
              setEditingId(null);
              setName("");
              setSku("");
              setDescription("");
              setUnit("");
              setStockType("");
              setLitres("");
              setDefaultRatePerLitre("");
              setGstPerc("");
              setShowForm(true);
            }
          }}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          {showForm ? "Cancel" : "Add product"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-medium text-slate-700">
            {editingId ? "Edit product" : "New product (Product Master)"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-600">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">SKU</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-600">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Units</label>
              <input
                type="number"
                min="0"
                step="1"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. 1, 250"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Stock type</label>
              <select
                value={stockType}
                onChange={(e) => setStockType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select stock type</option>
                <option value="Drum">Drum</option>
                <option value="Pail">Pail</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600">Litres</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Volume in litres"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Default rate per litre (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={defaultRatePerLitre}
                onChange={(e) => setDefaultRatePerLitre(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Auto-fills purchase line total"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">GST %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={gstPerc}
                onChange={(e) => setGstPerc(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. 18"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              {editingId ? "Update product" : "Save product"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                SKU
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                Unit
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                Stock type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                Litres
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                Default ₹/L
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                GST %
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No products yet. Add one above.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {p.sku ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.unit}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {p.stockType ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {p.litres != null ? p.litres : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {p.defaultRatePerLitre != null ? p.defaultRatePerLitre : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {p.gstPerc != null ? `${p.gstPerc}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="text-sm text-teal-600 hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
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
