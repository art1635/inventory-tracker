"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/products", label: "Product Master" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/customers", label: "Customers" },
  { href: "/purchases", label: "Purchases" },
  { href: "/sales", label: "Sales" },
  { href: "/inventory", label: "Inventory" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white">
      <div className="sticky top-0 flex h-screen flex-col py-6">
        <Link
          href="/"
          className="px-6 pb-4 text-lg font-semibold text-teal-700"
        >
          Inventory Tracker
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-teal-50 text-teal-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
