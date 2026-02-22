"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Dashboard = {
  products: number;
  suppliers: number;
  customers: number;
  purchases: number;
  sales: number;
  purchaseTotal: number;
  saleTotal: number;
  lowStock: { quantity: number; product: { name: string; id: string } }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((json) => {
        if (!json || json.error || typeof json.products !== "number") {
          setData(null);
          return;
        }
        setData({
          products: Number(json.products) ?? 0,
          suppliers: Number(json.suppliers) ?? 0,
          customers: Number(json.customers) ?? 0,
          purchases: Number(json.purchases) ?? 0,
          sales: Number(json.sales) ?? 0,
          purchaseTotal: Number(json.purchaseTotal) ?? 0,
          saleTotal: Number(json.saleTotal) ?? 0,
          lowStock: Array.isArray(json.lowStock) ? json.lowStock : [],
        });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6">
        <p className="font-medium text-amber-900">Failed to load dashboard</p>
        {/* Shown when API returns error or invalid response */}
        <p className="mt-1 text-sm text-amber-800">
          The server or database may be starting. Try refreshing in a moment.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 rounded-lg bg-amber-200 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-300"
        >
          Retry
        </button>
      </div>
    );
  }

  const cards = [
    { label: "Product Master", value: data.products, href: "/products" },
    { label: "Suppliers", value: data.suppliers, href: "/suppliers" },
    { label: "Customers", value: data.customers, href: "/customers" },
    { label: "Purchases", value: data.purchases, href: "/purchases" },
    { label: "Sales", value: data.sales, href: "/sales" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-sm font-medium text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {c.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">
            Total purchased (from suppliers)
          </h2>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            ₹{(data.purchaseTotal ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">
            Total sales (to customers)
          </h2>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            ₹{(data.saleTotal ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {(data.lowStock?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
          <h2 className="text-sm font-medium text-amber-800">
            Low stock (≤10 units)
          </h2>
          <ul className="mt-3 space-y-1">
            {(data.lowStock ?? []).map((item) => (
              <li key={item?.product?.id ?? item?.product?.name ?? Math.random()} className="flex justify-between text-sm">
                <Link
                  href="/inventory"
                  className="font-medium text-amber-900 hover:underline"
                >
                  {item?.product?.name ?? "—"}
                </Link>
                <span className="text-amber-700">{item?.quantity ?? 0} left</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
