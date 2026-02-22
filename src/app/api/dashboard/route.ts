import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [products, suppliers, customers, purchases, sales, inventory] =
      await Promise.all([
        prisma.product.count(),
        prisma.supplier.count(),
        prisma.customer.count(),
        prisma.purchase.count(),
        prisma.sale.count(),
        prisma.inventory.findMany({
          include: { product: true },
          where: { quantity: { lte: 10 } },
          orderBy: { quantity: "asc" },
        }),
      ]);

    const purchaseTotal = await prisma.purchase.aggregate({
      _sum: { total: true },
    });
    const saleTotal = await prisma.sale.aggregate({
      _sum: { total: true },
    });

    return NextResponse.json({
      products,
      suppliers,
      customers,
      purchases,
      sales,
      purchaseTotal: purchaseTotal._sum.total ?? 0,
      saleTotal: saleTotal._sum.total ?? 0,
      lowStock: inventory,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch dashboard" },
      { status: 500 }
    );
  }
}
