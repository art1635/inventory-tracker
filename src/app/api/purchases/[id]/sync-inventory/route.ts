import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findInventoryByProductAndBatch } from "@/lib/inventory";

/**
 * Sync this purchase's items to inventory (idempotent).
 * Uses trimmed batch-number matching so we update existing rows instead of creating duplicates.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Subtract this purchase's items from inventory (undo any prior application)
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

      // 2. Add this purchase's items to inventory (match by trimmed batch to avoid duplicates)
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
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Sync purchase to inventory error:", e);
    const message = e instanceof Error ? e.message : "Failed to sync to inventory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
