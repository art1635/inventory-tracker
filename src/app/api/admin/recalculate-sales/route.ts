import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/admin/recalculate-sales
 *
 * Recalculates all existing sales (and their line items) using the formula:
 *   line total = (quantity × product.litres) × unitPrice  when product.litres > 0
 *   else line total = quantity × unitPrice
 *   sale total = subtotal × (1 + gstPerc/100)
 *
 * Call this once after deploying the new sales formula, then you can remove or
 * protect this route (e.g. require a secret query param or disable in production).
 */
export async function POST() {
  try {
    const sales = await prisma.sale.findMany({
      include: {
        items: { include: { product: { select: { litres: true } } } },
      },
      orderBy: { date: "desc" },
    });

    let salesUpdated = 0;
    let itemsUpdated = 0;

    await prisma.$transaction(async (tx) => {
      for (const sale of sales) {
        let subtotal = 0;
        const updates: { itemId: string; newTotal: number }[] = [];

        for (const item of sale.items) {
          const qty = item.quantity;
          const price = item.unitPrice;
          const litresPerUnit = item.product?.litres ?? 0;
          const newTotal =
            litresPerUnit > 0 ? (qty * litresPerUnit) * price : qty * price;
          subtotal += newTotal;
          updates.push({ itemId: item.id, newTotal });
        }

        const gst = Number(sale.gstPerc) ?? 0;
        const newSaleTotal = subtotal * (1 + gst / 100);

        for (const { itemId, newTotal } of updates) {
          await tx.saleItem.update({
            where: { id: itemId },
            data: { total: newTotal },
          });
          itemsUpdated += 1;
        }

        await tx.sale.update({
          where: { id: sale.id },
          data: { total: newSaleTotal },
        });
        salesUpdated += 1;
      }
    });

    return NextResponse.json({
      ok: true,
      salesUpdated,
      itemsUpdated,
      message: `Recalculated ${salesUpdated} sales and ${itemsUpdated} line items.`,
    });
  } catch (e) {
    console.error("Recalculate sales error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to recalculate sales" },
      { status: 500 }
    );
  }
}
