import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findInventoryByProductAndBatch } from "@/lib/inventory";

/**
 * Sync all purchases to inventory (idempotent).
 * For each purchase, subtracts its items then adds them back, using trimmed batch matching.
 * Use to fix missing inventory or after data corrections.
 */
export async function POST() {
  try {
    const purchases = await prisma.purchase.findMany({
      orderBy: { date: "asc" },
      include: { items: { include: { product: true } } },
    });

    await prisma.$transaction(async (tx) => {
      for (const purchase of purchases) {
        for (const item of purchase.items) {
          if (!item.productId) continue;
          const batchNum = (item.batchNumber ?? "").trim();
          const inv = await findInventoryByProductAndBatch(tx, item.productId, batchNum);
          const litresPerUnit = item.product?.litres ?? 0;
          const litresToSubtract = item.quantity * litresPerUnit;
          if (inv) {
            const newQty = Math.max(0, inv.quantity - item.quantity);
            const newLitres = Math.max(0, inv.litres - litresToSubtract);
            if (newQty === 0) {
              await tx.inventory.delete({ where: { id: inv.id } });
            } else {
              await tx.inventory.update({
                where: { id: inv.id },
                data: { quantity: newQty, litres: newLitres },
              });
            }
          }
        }
      }

      for (const purchase of purchases) {
        for (const item of purchase.items) {
          if (!item.productId) continue;
          const batchNum = (item.batchNumber ?? "").trim();
          const litresPerUnit = item.product?.litres ?? 0;
          const litresToAdd = item.quantity * litresPerUnit;
          const inv = await findInventoryByProductAndBatch(tx, item.productId, batchNum);
          if (inv) {
            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                quantity: inv.quantity + item.quantity,
                litres: inv.litres + litresToAdd,
              },
            });
          } else {
            await tx.inventory.create({
              data: {
                productId: item.productId,
                batchNumber: batchNum,
                quantity: item.quantity,
                litres: litresToAdd,
              },
            });
          }
        }
      }

      await tx.inventory.deleteMany({ where: { quantity: { lte: 0 } } });
    });

    return NextResponse.json({ success: true, count: purchases.length });
  } catch (e) {
    console.error("Sync all purchases to inventory error:", e);
    const message = e instanceof Error ? e.message : "Failed to sync all purchases to inventory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
