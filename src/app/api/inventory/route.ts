import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const inventory = await prisma.inventory.findMany({
      include: { product: true },
      orderBy: { product: { name: "asc" } },
    });
    const productIds = inventory.map((inv) => inv.productId);
    const latestPurchaseItems = await prisma.purchaseItem.findMany({
      where: { productId: { in: productIds } },
      include: { purchase: true },
      orderBy: { purchase: { date: "desc" } },
    });
    const byProduct: Record<string, { batchNumber: string | null; manufacturingDate: string | null }> = {};
    for (const pi of latestPurchaseItems) {
      if (byProduct[pi.productId] == null) {
        byProduct[pi.productId] = {
          batchNumber: pi.batchNumber ?? null,
          manufacturingDate: pi.manufacturingDate
            ? pi.manufacturingDate.toISOString().slice(0, 10)
            : null,
        };
      }
    }
    const enriched = inventory.map((inv) => ({
      ...inv,
      batchNumber: byProduct[inv.productId]?.batchNumber ?? null,
      manufacturingDate: byProduct[inv.productId]?.manufacturingDate ?? null,
    }));
    return NextResponse.json(enriched);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
