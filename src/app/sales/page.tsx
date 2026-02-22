"use client";

import { useCallback, useEffect, useState } from "react";

type Customer = { id: string; name: string };
type Product = { id: string; name: string; unit: string };
type Sale = {
  id: string;
  date: string;
  reference: string | null;
  notes: string | null;
  total: number;
  customer: { id: string; name: string };
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    total: number;
    batchNumber: string | null;
    stockType: string | null;
    product: { name: string };
  }[];
};

type LineState = {
  productId: string;
  batchNumber: string;
  quantity: number;
  stockType: string;
  unitPrice: number;
};

const emptyLine: LineState = {
  productId: "",
  batchNumber: "",
  quantity: 0,
  stockType: "",
  unitPrice: 0,
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<LineState[]>([{ ...emptyLine }]);
  const [batchesByProduct, setBatchesByProduct] = useState<Record<string, string[]>>({});

  const fetchBatches = useCallback(async (productId: string) => {
    if (!productId) return [];
    const res = await fetch(`/api/products/${productId}/batches`);
    const data = await res.json();
    return (data.batches ?? []) as string[];
  }, []);

  const load = () => {
    fetch("/api/sales").then((r) => r.json()).then(setSales);
    fetch("/api/customers").then((r) => r.json()).then(setCustomers);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/sales").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ])
      .then(([s, c, prod]) => {
        setSales(s);
        setCustomers(c);
        setProducts(prod);
      })
      .finally(() => setLoading(false));
  }, []);

  const addLine = () => {
    setLines((prev) => [...prev, { ...emptyLine }]);
  };
  const updateLine = (i: number, field: keyof LineState, value: string | number) => {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      if (field === "productId") {
        next[i].batchNumber = "";
        const pid = value as string;
        if (pid && !batchesByProduct[pid]) {
          fetchBatches(pid).then((batches) =>
            setBatchesByProduct((b) => ({ ...b, [pid]: batches }))
          );
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
    if (customerId === "__new__" && !newCustomerName.trim()) {
      alert("Enter the new customer name");
      return;
    }
    const items = lines.filter((l) => l.productId && l.quantity > 0);
    if (items.length === 0) {
      alert("Add at least one product with total units dispatched > 0");
      return;
    }
    const body = {
      customerId: customerId === "__new__" ? undefined : customerId,
      ...(customerId === "__new__" &&
        newCustomerName.trim() && {
          newCustomer: {
            name: newCustomerName.trim(),
            email: newCustomerEmail.trim() || undefined,
            phone: newCustomerPhone.trim() || undefined,
            address: newCustomerAddress.trim() || undefined,
          },
        }),
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      date,
      items: items.map((l) => ({
        productId: l.productId,
        batchNumber: l.batchNumber.trim() || undefined,
        quantity: l.quantity,
        stockType: l.stockType.trim() || undefined,
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
    setNewCustomerEmail("");
    setNewCustomerPhone("");
    setNewCustomerAddress("");
    setReference("");
    setNotes("");
    setDate(new Date().toISOString().slice(0, 10));
    setLines([{ ...emptyLine }]);
    setShowForm(false);
    setEditingSaleId(null);
    load();
  };

  const handleEdit = async (sale: Sale) => {
    setEditingSaleId(sale.id);
    setCustomerId(sale.customer.id);
    setNewCustomerName("");
    setNewCustomerEmail("");
    setNewCustomerPhone("");
    setNewCustomerAddress("");
    setReference(sale.reference ?? "");
    setNotes(sale.notes ?? "");
    setDate(sale.date.slice(0, 10));
    setLines(
      sale.items.length > 0
        ? sale.items.map((it) => ({
            productId: it.productId,
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
      batches[pid] = b;
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Sales</h1>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) setEditingSaleId(null);
          }}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          {showForm ? "Cancel" : "Record sale"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
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
                {customers.map((c) => (
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
                  <label className="block text-sm text-slate-600">Email</label>
                  <input
                    type="email"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600">Phone</label>
                  <input
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Optional"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-slate-600">Address</label>
                  <input
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
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
              <label className="block text-sm text-slate-600">Reference (Invoice #)</label>
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
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600">
                        Batch
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
                        Selling price
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
          <div className="mt-4">
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              {editingSaleId ? "Update sale" : "Save sale"}
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
                Customer
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
            {sales.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No sales yet. Record one above.
                </td>
              </tr>
            ) : (
              sales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {new Date(s.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {s.customer.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {s.reference ?? "—"}
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
    </div>
  );
}
