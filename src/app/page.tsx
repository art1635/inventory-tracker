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
      .then((r) => r.json().then((json) => ({ ok: r.ok, json })))
      .then(({ ok, json }) => {
        if (!ok || !json || json.error) {
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-md">
        <p className="font-semibold text-amber-900">Failed to load dashboard</p>
        <p className="mt-1 text-sm text-amber-800">
          The server or database may be starting. Try refreshing in a moment.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-amber-600"
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
  const lowStockList = Array.isArray(data.lowStock) ? data.lowStock : [];

  const cardAccents = [
    "border-l-4 border-l-emerald-500 bg-white",
    "border-l-4 border-l-blue-500 bg-white",
    "border-l-4 border-l-violet-500 bg-white",
    "border-l-4 border-l-amber-500 bg-white",
    "border-l-4 border-l-teal-500 bg-white",
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-800">
        Dashboard
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.isArray(cards) && cards.map((c, i) => (
          <Link
            key={c.href}
            href={c.href}
            className={`rounded-xl p-5 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg ${cardAccents[i % cardAccents.length]}`}
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {c.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {c.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-blue-50 to-white p-6 shadow-md">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Total purchased (from suppliers)
          </h2>
          <p className="mt-2 text-3xl font-bold text-slate-800">
            ₹{(data.purchaseTotal ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-teal-50 to-white p-6 shadow-md">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Total sales (to customers)
          </h2>
          <p className="mt-2 text-3xl font-bold text-slate-800">
            ₹{(data.saleTotal ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {lowStockList.length > 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-md">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-800">
            Low stock (≤10 units)
          </h2>
          <ul className="mt-3 space-y-2">
            {lowStockList.map((item) => (
              <li key={item?.product?.id ?? item?.product?.name ?? Math.random()} className="flex justify-between rounded-lg bg-white/60 px-3 py-2 text-sm">
                <Link
                  href="/inventory"
                  className="font-medium text-amber-900 hover:underline"
                >
                  {item?.product?.name ?? "—"}
                </Link>
                <span className="font-semibold text-amber-700">{item?.quantity ?? 0} left</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
