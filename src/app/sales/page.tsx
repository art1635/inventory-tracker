"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Customer = { id: string; name: string };
type Product = { id: string; name: string; unit: string; litres?: number | null };
type Sale = {
  id: string;
  date: string;
  reference: string | null;
  notes: string | null;
  total: number;
  gstPerc?: number | null;
  customer: { id: string; name: string };
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    total: number;
    batchNumber: string | null;
    stockType: string | null;
    manufacturingDate?: string | null;
    product: { name: string; litres?: number | null };
  }[];
};

type LineState = {
  productId: string;
  productSearch: string;
  batchNumber: string;
  quantity: number;
  stockType: string;
  unitPrice: number;
};

type InventoryOption = {
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  stockTypes: string[];
};

const emptyLine: LineState = {
  productId: "",
  productSearch: "",
  batchNumber: "",
  quantity: 0,
  stockType: "",
  unitPrice: 0,
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryOptions, setInventoryOptions] = useState<{
    products: { id: string; name: string }[];
    inventoryOptions: InventoryOption[];
  }>({ products: [], inventoryOptions: [] });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [saleDetail, setSaleDetail] = useState<Sale | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerGstNumber, setNewCustomerGstNumber] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [gstPerc, setGstPerc] = useState(18);
  const [lines, setLines] = useState<LineState[]>([{ ...emptyLine }]);
  const [batchesByProduct, setBatchesByProduct] = useState<Record<string, string[]>>({});
  const [openProductLine, setOpenProductLine] = useState<number | null>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchBatches = useCallback(async (productId: string) => {
    if (!productId) return [];
    const res = await fetch(`/api/products/${productId}/batches`);
    const data = await res.json();
    return (data.batches ?? []) as string[];
  }, []);

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

  const load = () => {
    setLoadError(null);
    Promise.all([
      fetch("/api/sales").then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
      fetch("/api/customers").then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
      fetch("/api/products").then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
      fetch("/api/inventory?options=true").then((r) => r.json().then((json) => ({ ok: r.ok, json }))),
    ])
      .then(([s, c, prod, invOpt]) => {
        const err: string[] = [];
        if (s.ok && Array.isArray(s.json)) setSales(s.json);
        else err.push((s.json as { error?: string })?.error || "sales");
        if (c.ok && Array.isArray(c.json)) setCustomers(c.json);
        else err.push((c.json as { error?: string })?.error || "customers");
        if (prod.ok && Array.isArray(prod.json)) setProducts(prod.json);
        else err.push((prod.json as { error?: string })?.error || "products");
        if (invOpt.ok && invOpt.json?.products && Array.isArray(invOpt.json?.inventoryOptions)) {
          setInventoryOptions({
            products: invOpt.json.products,
            inventoryOptions: invOpt.json.inventoryOptions,
          });
          const batchMap: Record<string, string[]> = {};
          for (const o of invOpt.json.inventoryOptions as InventoryOption[]) {
            if (!batchMap[o.productId]) batchMap[o.productId] = [];
            if (!batchMap[o.productId].includes(o.batchNumber)) batchMap[o.productId].push(o.batchNumber);
          }
          setBatchesByProduct(batchMap);
        }
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
    setLines((prev) => [...prev, { ...emptyLine }]);
  };
  const updateLine = (i: number, field: keyof LineState, value: string | number) => {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      if (field === "productId") {
        const product = inventoryOptions.products.find((p) => p.id === (value as string));
        next[i].productSearch = product?.name ?? "";
        next[i].batchNumber = "";
        next[i].stockType = "";
        setOpenProductLine(null);
      }
      if (field === "batchNumber") {
        const opt = inventoryOptions.inventoryOptions.find(
          (o) => o.productId === next[i].productId && o.batchNumber === value
        );
        if (opt?.stockTypes?.length && !next[i].stockType) next[i].stockType = opt.stockTypes[0];
      }
      return next;
    });
  };
  const removeLine = (i: number) => {
    setLines((prev) => prev.filter((_, j) => j !== i));
  };

  const formProducts = (() => {
    const list = [...(inventoryOptions.products ?? [])];
    if (editingSaleId && lines.some((l) => l.productId)) {
      const ids = new Set(list.map((p) => p.id));
      for (const line of lines) {
        if (line.productId && !ids.has(line.productId)) {
          list.push({ id: line.productId, name: line.productSearch || "Unknown" });
          ids.add(line.productId);
        }
      }
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim()) {
      alert("Invoice number is required.");
      return;
    }
    if (customerId === "__new__" && !newCustomerName.trim()) {
      alert("Enter the new customer name");
      return;
    }
    const items = lines.filter((l) => l.productId && l.quantity > 0);
    if (items.length === 0) {
      alert("Add at least one product with total units dispatched > 0");
      return;
    }
    const missingBatch = items.some((l) => !l.batchNumber?.trim());
    if (missingBatch) {
      alert("Batch is required for every line item.");
      return;
    }
    const missingStockType = items.some((l) => !l.stockType?.trim());
    if (missingStockType) {
      alert("Stock type is required for every line item.");
      return;
    }
    const invalidUnitPrice = items.some(
      (l) => typeof l.unitPrice !== "number" || Number.isNaN(l.unitPrice) || l.unitPrice < 0
    );
    if (invalidUnitPrice) {
      alert("Sale price per litre is required for every line item (enter 0 or more).");
      return;
    }
    const body = {
      customerId: customerId === "__new__" ? undefined : customerId,
      ...(customerId === "__new__" &&
        newCustomerName.trim() && {
          newCustomer: {
            name: newCustomerName.trim(),
            gstNumber: newCustomerGstNumber.trim() || undefined,
          },
        }),
      reference: reference.trim(),
      notes: notes.trim() || null,
      date,
      gstPerc: Number(gstPerc) || 0,
      items: items.map((l) => ({
        productId: l.productId,
        batchNumber: l.batchNumber.trim(),
        quantity: l.quantity,
        stockType: l.stockType.trim(),
        unitPrice: Number(l.unitPrice) || 0,
      })),
    };
    const url = editingSaleId ? `/api/sales/${editingSaleId}` : "/api/sales";
    const method = editingSaleId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || (editingSaleId ? "Failed to update sale" : "Failed to create sale"));
      return;
    }
    setCustomerId("");
    setNewCustomerName("");
    setNewCustomerGstNumber("");
    setReference("");
    setNotes("");
    setDate(new Date().toISOString().slice(0, 10));
    setGstPerc(18);
    setLines([{ ...emptyLine }]);
    setShowForm(false);
    setEditingSaleId(null);
    load();
  };

  const handleEdit = async (sale: Sale) => {
    setEditingSaleId(sale.id);
    setCustomerId(sale.customer.id);
    setNewCustomerName("");
    setNewCustomerGstNumber("");
    setReference(sale.reference ?? "");
    setNotes(sale.notes ?? "");
    setDate(sale.date.slice(0, 10));
    setGstPerc(sale.gstPerc ?? 18);
    setLines(
      sale.items.length > 0
        ? sale.items.map((it) => ({
            productId: it.productId,
            productSearch: it.product?.name ?? "",
            batchNumber: it.batchNumber ?? "",
            quantity: it.quantity,
            stockType: it.stockType ?? "",
            unitPrice: it.unitPrice,
          }))
        : [{ ...emptyLine }]
    );
    const productIds = [...new Set(sale.items.map((i) => i.productId))];
    const batches: Record<string, string[]> = {};
    for (const pid of productIds) {
      const b = await fetchBatches(pid);
      batches[pid] = [...b];
    }
    for (const it of sale.items) {
      if (it.batchNumber?.trim()) {
        if (!batches[it.productId]) batches[it.productId] = [];
        if (!batches[it.productId].includes(it.batchNumber)) batches[it.productId].push(it.batchNumber);
      }
    }
    setBatchesByProduct((prev) => ({ ...prev, ...batches }));
    setShowForm(true);
  };

  const handleDelete = async (sale: Sale) => {
    if (!confirm(`Delete this sale (${sale.customer.name}, ${new Date(sale.date).toLocaleDateString()})? Inventory will be restored.`)) return;
    const res = await fetch(`/api/sales/${sale.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to delete sale");
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Sales</h1>
        <button
          type="button"
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingSaleId(null);
            } else {
              setEditingSaleId(null);
              setCustomerId("");
              setNewCustomerName("");
              setNewCustomerGstNumber("");
              setReference("");
              setNotes("");
              setDate(new Date().toISOString().slice(0, 10));
              setGstPerc(18);
              setLines([{ ...emptyLine }]);
              setShowForm(true);
            }
          }}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-teal-700 hover:shadow-lg transition-all"
        >
          {showForm ? "Cancel" : "Record sale"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-md"
        >
          <h2 className="mb-4 text-sm font-medium text-slate-700">
            {editingSaleId ? "Edit sale — inventory will be adjusted" : "New sale (to customer) — inventory will decrease"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-600">Customer *</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select customer</option>
                <option value="__new__">+ Add new customer</option>
                {(Array.isArray(customers) ? customers : []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {customerId === "__new__" && (
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2 border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div>
                  <label className="block text-sm text-slate-600">New customer name *</label>
                  <input
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600">GST number</label>
                  <input
                    value={newCustomerGstNumber}
                    onChange={(e) => setNewCustomerGstNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Optional"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm text-slate-600">Date of sale</label>
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
                onChange={(e) => setGstPerc(Number(e.target.value) || 0)}
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
                            ? (formProducts.find((p) => p.id === line.productId)?.name ?? (line.productSearch || "Select product"))
                            : "Select product"}
                        </span>
                        <span className="text-slate-400 text-xs" aria-hidden>▼</span>
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
                            {formProducts
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
                            {formProducts.filter((p) =>
                              !line.productSearch.trim()
                                ? true
                                : p.name.toLowerCase().includes(line.productSearch.trim().toLowerCase())
                            ).length === 0 && (
                              <li className="px-2 py-2 text-sm text-slate-500">
                                {formProducts.length ? "No products match" : "No products in stock. Add inventory via Purchases."}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600">
                        Batch *
                      </label>
                      <select
                        value={line.batchNumber}
                        onChange={(e) =>
                          updateLine(i, "batchNumber", e.target.value)
                        }
                        className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">Select batch</option>
                        {(line.productId
                          ? batchesByProduct[line.productId] ?? []
                          : []
                        ).map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600">
                        Total units dispatched *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={line.quantity || ""}
                        onChange={(e) =>
                          updateLine(
                            i,
                            "quantity",
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600">
                        Stock type *
                      </label>
                      <select
                        value={line.stockType}
                        onChange={(e) =>
                          updateLine(i, "stockType", e.target.value)
                        }
                        className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">Select</option>
                        {(() => {
                          const opt = line.productId && line.batchNumber
                            ? inventoryOptions.inventoryOptions.find(
                                (o) =>
                                  o.productId === line.productId &&
                                  (o.batchNumber ?? "").trim() === (line.batchNumber ?? "").trim()
                              )
                            : null;
                          const types =
                            opt && opt.stockTypes?.length
                              ? opt.stockTypes
                              : ["Drum", "Pail"];
                          return types.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600">
                        Sale price per litre *
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
                        className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        placeholder="0.00"
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
          {(() => {
            const subtotal = lines.reduce((sum, l) => {
              const qty = Number(l.quantity) || 0;
              const price = Number(l.unitPrice) || 0;
              const product = (Array.isArray(products) ? products : []).find((p) => p.id === l.productId);
              const litresPerUnit = product?.litres ?? 0;
              const lineTotal =
                litresPerUnit > 0 ? (qty * litresPerUnit) * price : qty * price;
              return sum + lineTotal;
            }, 0);
            const gstPct = Number(gstPerc) || 0;
            const gstAmount = subtotal * (gstPct / 100);
            const totalInclGst = subtotal + gstAmount;
            return (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {gstPct > 0 && (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>GST ({gstPct}%)</span>
                        <span>₹{gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between font-medium text-slate-900 border-t border-slate-200 pt-2 mt-1">
                        <span>Total (incl. GST)</span>
                        <span>₹{totalInclGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                  {gstPct === 0 && (
                    <div className="flex justify-between font-medium text-slate-900 border-t border-slate-200 pt-2 mt-1">
                      <span>Total</span>
                      <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          <div className="mt-4">
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-teal-700 hover:shadow-lg transition-all"
            >
              {editingSaleId ? "Update sale" : "Save sale"}
            </button>
          </div>
        </form>
      )}

      {!showForm && (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                Date of sale
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                Invoice number
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                Total (incl. GST)
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No sales yet. Record one above.
                </td>
              </tr>
            ) : (
              (Array.isArray(sales) ? sales : []).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {new Date(s.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {s.customer.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <button
                      type="button"
                      onClick={() => setSaleDetail(s)}
                      className="text-teal-600 hover:underline text-left"
                    >
                      {s.reference ?? "—"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                    ₹{s.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(s)}
                        className="text-sm text-teal-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s)}
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

      {saleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" aria-modal="true" role="dialog">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Sale details</h3>
              <button
                type="button"
                onClick={() => setSaleDetail(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-4rem)] p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">Date</span>
                  <p className="font-medium text-slate-900">{new Date(saleDetail.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-slate-500">Invoice number</span>
                  <p className="font-medium text-slate-900">{saleDetail.reference ?? "—"}</p>
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
                      <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Sale price per litre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(saleDetail.items ?? []).map((item, idx) => {
                      const litres = item.product?.litres ?? 0;
                      const salePricePerLitre = litres > 0 ? item.unitPrice / litres : null;
                      return (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-slate-900">{item.product?.name ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{item.batchNumber ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {item.manufacturingDate
                              ? new Date(item.manufacturingDate).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-900">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-slate-900">
                            {salePricePerLitre != null ? `₹${salePricePerLitre.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
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
