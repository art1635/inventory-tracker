"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Business Hub" },
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
    <aside className="w-60 shrink-0 bg-teal-800 shadow-lg">
      <div className="sticky top-0 flex h-screen flex-col py-6">
        <Link
          href="/"
          className="mx-4 rounded-lg bg-teal-700/50 px-4 py-3 text-center text-white transition-colors hover:bg-teal-700"
        >
          <span className="block text-sm font-bold uppercase tracking-wider">Star Industries</span>
          <span className="block mt-0.5 text-xs font-medium text-teal-200">Business Hub</span>
        </Link>
        <nav className="mt-6 flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-teal-600 text-white shadow-inner"
                    : "text-teal-100 hover:bg-teal-700/60 hover:text-white"
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
