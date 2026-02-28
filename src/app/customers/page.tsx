"use client";

import { useEffect, useState } from "react";

type Customer = {
  id: string;
  name: string;
  gstNumber: string | null;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setLoadError(null);
    return fetch("/api/customers")
      .then((r) => r.json().then((json) => ({ ok: r.ok, json })))
      .then(({ ok, json }) => {
        if (ok && Array.isArray(json)) {
          setCustomers(json);
          setLoadError(null);
        } else {
          setLoadError((json as { error?: string })?.error || "Failed to load customers");
        }
      })
      .catch(() => setLoadError("Failed to load data. Check your connection and retry."));
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Name is required.");
      return;
    }
    const url = editingCustomerId
      ? `/api/customers/${editingCustomerId}`
      : "/api/customers";
    const method = editingCustomerId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        gstNumber: gstNumber.trim() || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || (editingCustomerId ? "Failed to update customer" : "Failed to create customer"));
      return;
    }
    setName("");
    setGstNumber("");
    setShowForm(false);
    setEditingCustomerId(null);
    load();
  };

  const handleEdit = (c: Customer) => {
    setEditingCustomerId(c.id);
    setName(c.name);
    setGstNumber(c.gstNumber ?? "");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
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
      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-800">{loadError}</p>
          <button
            type="button"
            onClick={() => { setLoadError(null); setLoading(true); load().finally(() => setLoading(false)); }}
            className="rounded-lg bg-amber-200 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-300"
          >
            Retry
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Customers</h1>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) setEditingCustomerId(null);
          }}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-teal-700 hover:shadow-lg transition-all"
        >
          {showForm ? "Cancel" : "Add customer"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-md"
        >
          <h2 className="mb-4 text-sm font-medium text-slate-700">
            {editingCustomerId ? "Edit customer" : "New customer"}
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
              <label className="block text-sm text-slate-600">GST number</label>
              <input
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. 27AABCU9603R1ZM"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-teal-700 hover:shadow-lg transition-all"
            >
              {editingCustomerId ? "Update customer" : "Save customer"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                GST number
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  No customers yet. Add one above.
                </td>
              </tr>
            ) : (
              (Array.isArray(customers) ? customers : []).map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {c.gstNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(c)}
                      className="text-sm text-teal-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
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
