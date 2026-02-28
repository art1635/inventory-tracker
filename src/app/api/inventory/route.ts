import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const optionsOnly = searchParams.get("options") === "true";

    const inventory = await prisma.inventory.findMany({
      where: { quantity: { gt: 0 } },
      include: { product: true },
      orderBy: { product: { name: "asc" } },
    });
    const purchaseItems =
      inventory.length === 0
        ? []
        : await prisma.purchaseItem.findMany({
            where: {
              OR: inventory.map((inv) => ({
                productId: inv.productId,
                batchNumber: inv.batchNumber,
              })),
            },
            include: { purchase: true },
            orderBy: { purchase: { date: "desc" } },
          });
    const byProductBatch = new Map<string, string | null>();
    const stockTypesByProductBatch = new Map<string, string[]>();
    const batchKey = (productId: string, batchNumber: string | null) =>
      `${productId}|${(batchNumber ?? "").trim()}`;
    for (const pi of purchaseItems) {
      const key = batchKey(pi.productId, pi.batchNumber);
      if (!byProductBatch.has(key)) {
        byProductBatch.set(
          key,
          pi.manufacturingDate ? pi.manufacturingDate.toISOString().slice(0, 10) : null
        );
      }
      if (pi.stockType?.trim()) {
        const existing = stockTypesByProductBatch.get(key) ?? [];
        if (!existing.includes(pi.stockType.trim())) {
          stockTypesByProductBatch.set(key, [...existing, pi.stockType.trim()]);
        }
      }
    }
    const enriched = inventory
      .map((inv) => ({
        ...inv,
        manufacturingDate: byProductBatch.get(batchKey(inv.productId, inv.batchNumber)) ?? null,
        stockTypes: stockTypesByProductBatch.get(batchKey(inv.productId, inv.batchNumber)) ?? [],
      }))
      .sort((a, b) => {
        const nameA = a.product?.name ?? "";
        const nameB = b.product?.name ?? "";
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return (a.batchNumber ?? "").localeCompare(b.batchNumber ?? "");
      });

    if (optionsOnly) {
      const products = Array.from(
        new Map(enriched.map((inv) => [inv.productId, { id: inv.productId, name: inv.product?.name ?? "" }])).values()
      ).sort((a, b) => a.name.localeCompare(b.name));
      const inventoryOptions = enriched.map((inv) => ({
        productId: inv.productId,
        productName: inv.product?.name ?? "",
        batchNumber: inv.batchNumber,
        quantity: inv.quantity,
        stockTypes: (inv as { stockTypes?: string[] }).stockTypes ?? [],
      }));
      return NextResponse.json({ products, inventoryOptions });
    }

    return NextResponse.json(enriched);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
