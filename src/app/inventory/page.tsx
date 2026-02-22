"use client";

import { useEffect, useState } from "react";

type InventoryItem = {
  id: string;
  quantity: number;
  litres: number; // total litres in stock
  product: {
    id: string;
    name: string;
    sku: string | null;
    unit: string;
    litres: number | null; // litres per unit (from Product Master)
  };
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState("");

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((json) => setInventory(Array.isArray(json) ? json : []))
      .catch(() => setInventory([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredInventory = Array.isArray(inventory)
    ? productFilter.trim()
      ? inventory.filter((item) => {
        const q = productFilter.trim().toLowerCase();
        const name = item.product.name.toLowerCase();
        const sku = (item.product.sku ?? "").toLowerCase();
        return name.includes(q) || sku.includes(q);
      })
      : inventory
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
      <p className="text-sm text-slate-600">
        Current stock. &quot;Litres/unit&quot; is from Product Master (e.g. 208 L per drum).
        &quot;Total litres&quot; is litres in stock and updates on purchase/sale.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="product-filter" className="text-sm font-medium text-slate-700">
          Filter by product
        </label>
        <input
          id="product-filter"
          type="text"
          placeholder="Search by product name or SKU..."
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 min-w-[220px]"
        />
        {productFilter.trim() && (
          <span className="text-sm text-slate-500">
            {filteredInventory.length} of {inventory.length} item{inventory.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                SKU
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                Quantity
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                Litres/unit
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                Total litres
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                Unit
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  {inventory.length === 0
                    ? "No inventory yet. Add products and record purchases."
                    : "No products match your search. Try a different name or SKU."}
                </td>
              </tr>
            ) : (
              (Array.isArray(filteredInventory) ? filteredInventory : []).map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {item.product.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {item.product.sku ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-900">
                    {item.product.litres != null
                      ? `${item.product.litres} L`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                    {item.litres.toFixed(2)} L
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {item.product.unit}
                  </td>
                  <td className="px-4 py-3">
                    {item.quantity <= 10 ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Low stock
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        In stock
                      </span>
                    )}
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
