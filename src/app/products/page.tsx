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
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; createdNames: string[]; errors?: { row: number; message: string }[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredProducts =
    !searchLower
      ? products
      : products.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            (p.sku ?? "").toLowerCase().includes(searchLower) ||
            (p.description ?? "").toLowerCase().includes(searchLower) ||
            (p.unit ?? "").toLowerCase().includes(searchLower) ||
            (p.stockType ?? "").toLowerCase().includes(searchLower)
        );

  const load = () =>
    fetch("/api/products")
      .then((r) => r.json())
      .then((json) => setProducts(Array.isArray(json) ? json : []))
      .catch(() => setProducts([]));

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
    const nameVal = name.trim();
    const skuVal = sku.trim();
    const unitVal = unit.trim();
    const stockVal = stockType.trim();
    const litresVal = litres.trim();
    if (!nameVal) {
      alert("Name is required.");
      return;
    }
    if (!skuVal) {
      alert("SKU is required.");
      return;
    }
    if (!unitVal) {
      alert("Unit is required.");
      return;
    }
    if (!stockVal) {
      alert("Stock type is required.");
      return;
    }
    const litresNum = litresVal ? parseFloat(litresVal) : NaN;
    if (litresVal === "" || !Number.isFinite(litresNum) || litresNum < 0) {
      alert("Litres is required (0 or more).");
      return;
    }
    const payload = {
      name: nameVal,
      sku: skuVal,
      description: description.trim() || null,
      unit: unitVal,
      stockType: stockVal,
      litres: litresNum,
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

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      alert("Choose an Excel file first.");
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.set("file", importFile);
      const res = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Import failed");
        setImporting(false);
        return;
      }
      setImportResult(data);
      setImportFile(null);
      if (document.getElementById("import-file-input")) {
        (document.getElementById("import-file-input") as HTMLInputElement).value = "";
      }
      load();
    } catch {
      alert("Import failed");
    } finally {
      setImporting(false);
    }
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
        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={handleImport}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <span className="text-slate-600">Import:</span>
              <span className="rounded border-2 border-dashed border-teal-500 bg-teal-50 px-3 py-1.5 font-medium text-teal-700 hover:border-teal-600 hover:bg-teal-100">
                Choose Excel file
              </span>
              <input
                id="import-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
            {importFile && (
              <span className="text-sm text-slate-600">
                {importFile.name}
              </span>
            )}
            <button
              type="submit"
              disabled={importing}
              className="rounded bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {importing ? "Importing…" : "Upload"}
            </button>
          </form>
          <span className="text-xs text-slate-500">
            First row = headers. Required: <strong>Name</strong>, <strong>SKU</strong>, <strong>Unit</strong>, <strong>Stock type</strong>, <strong>Litres</strong>. Optional: Description, Default rate per litre, GST %
          </span>
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
      </div>

      {importResult != null && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-medium text-slate-800">
            Imported {importResult.created} product(s).
            {importResult.createdNames.length > 0 && (
              <span className="ml-1 font-normal text-slate-600">
                ({importResult.createdNames.slice(0, 10).join(", ")}
                {importResult.createdNames.length > 10 ? ` +${importResult.createdNames.length - 10} more` : ""})
              </span>
            )}
          </p>
          {importResult.errors && importResult.errors.length > 0 && (
            <p className="mt-2 text-amber-700">
              {importResult.errors.length} row(s) had errors:{" "}
              {importResult.errors.slice(0, 3).map((e) => e.message).join("; ")}
              {importResult.errors.length > 3 ? ` (+${importResult.errors.length - 3} more)` : ""}
            </p>
          )}
        </div>
      )}

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
              <label className="block text-sm text-slate-600">SKU *</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
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
              <label className="block text-sm text-slate-600">Unit *</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. pcs, 1, 250"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600">Stock type *</label>
              <select
                value={stockType}
                onChange={(e) => setStockType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              >
                <option value="">Select stock type</option>
                <option value="Drum">Drum</option>
                <option value="Pail">Pail</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600">Litres *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Volume in litres (0 or more)"
                required
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

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, SKU, description, unit or stock type..."
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            aria-label="Search products"
          />
        </div>
        <div className="overflow-hidden">
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
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  {products.length === 0
                    ? "No products yet. Add one above."
                    : "No products match your search."}
                </td>
              </tr>
            ) : (
              (Array.isArray(filteredProducts) ? filteredProducts : []).map((p) => (
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
    </div>
  );
}
