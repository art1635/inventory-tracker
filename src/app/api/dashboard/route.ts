import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const zero = {
  products: 0,
  suppliers: 0,
  customers: 0,
  purchases: 0,
  sales: 0,
  purchaseTotal: 0,
  saleTotal: 0,
  lowStock: [] as { quantity: number; product: { name: string; id: string } }[],
};

export async function GET() {
  try {
    const [products, suppliers, customers, purchases, sales, inventory] =
      await Promise.all([
        prisma.product.count().catch(() => 0),
        prisma.supplier.count().catch(() => 0),
        prisma.customer.count().catch(() => 0),
        prisma.purchase.count().catch(() => 0),
        prisma.sale.count().catch(() => 0),
        prisma.inventory
          .findMany({
            include: { product: true },
            where: { quantity: { lte: 10 } },
            orderBy: { quantity: "asc" },
          })
          .catch(() => []),
      ]);

    const [purchaseSum, saleSum] = await Promise.all([
      prisma.purchase.aggregate({ _sum: { total: true } }).catch(() => ({ _sum: { total: null } })),
      prisma.sale.aggregate({ _sum: { total: true } }).catch(() => ({ _sum: { total: null } })),
    ]);

    return NextResponse.json({
      products: Number(products) ?? 0,
      suppliers: Number(suppliers) ?? 0,
      customers: Number(customers) ?? 0,
      purchases: Number(purchases) ?? 0,
      sales: Number(sales) ?? 0,
      purchaseTotal: Number(purchaseSum._sum?.total) ?? 0,
      saleTotal: Number(saleSum._sum?.total) ?? 0,
      lowStock: Array.isArray(inventory) ? inventory : [],
    });
  } catch (e) {
    console.error("Dashboard error:", e);
    return NextResponse.json(zero, { status: 200 });
  }
}
