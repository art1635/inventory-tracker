import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findInventoryByProductAndBatch } from "@/lib/inventory";

const round2 = (value: number) => Math.round(value * 100) / 100;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });
    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(purchase);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch purchase" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
      for (const item of purchase.items) {
        if (!item.productId) continue;
        const batchNum = (item.batchNumber ?? "").trim();
        try {
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
        } catch (inner) {
          console.error("Inventory rollback for purchase item:", inner);
          throw inner;
        }
      }
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
      await tx.purchase.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete purchase error:", e);
    const message = e instanceof Error ? e.message : "Failed to delete purchase";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
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

    const body = await request.json();
    const { supplierId, newSupplier, reference, notes, date, gstNumber, gstPerc, items } = body;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }
    if (!reference?.trim()) {
      return NextResponse.json(
        { error: "Invoice number is required" },
        { status: 400 }
      );
    }
    for (const item of items) {
      if (!item.batchNumber?.trim()) {
        return NextResponse.json(
          { error: "Batch number is required for every line item" },
          { status: 400 }
        );
      }
      if (!item.manufacturingDate?.trim()) {
        return NextResponse.json(
          { error: "Date of manufacturing is required for every line item" },
          { status: 400 }
        );
      }
    }

    const NEW_SUPPLIER = "__new__";
    let resolvedSupplierId: string;
    if (newSupplier?.name?.trim()) {
      const name = newSupplier.name.trim();
      if (!newSupplier.gstNumber?.trim()) {
        return NextResponse.json(
          { error: "GST Number is required for the new supplier" },
          { status: 400 }
        );
      }
      const existing = await prisma.supplier.findFirst({ where: { name } });
      if (existing) {
        resolvedSupplierId = existing.id;
      } else {
        const created = await prisma.supplier.create({
          data: {
            name,
            gstNumber: newSupplier.gstNumber.trim(),
          },
        });
        resolvedSupplierId = created.id;
      }
    } else if (supplierId?.trim() && supplierId !== NEW_SUPPLIER) {
      resolvedSupplierId = supplierId.trim();
    } else {
      return NextResponse.json(
        { error: "Select a supplier or enter a new supplier name" },
        { status: 400 }
      );
    }

    const rawItems = items.map(
      (item: {
        productId: string;
        quantity?: number;
        unitPrice: number;
        batchNumber?: string;
        ratePerLitre?: number;
        unitsReceived?: number;
        stockType?: string;
        manufacturingDate?: string | null;
      }) => {
        const units = Math.max(0, Number(item.unitsReceived ?? item.quantity) || 0);
        return {
          productId: item.productId,
          quantity: units,
          unitPrice: Number(item.unitPrice) || 0,
          batchNumber: item.batchNumber!.trim(),
          ratePerLitre: item.ratePerLitre != null ? Number(item.ratePerLitre) : null,
          unitsReceived: units,
          stockType: item.stockType?.trim() || null,
          manufacturingDate: new Date(item.manufacturingDate!),
        };
      }
    );

    const parsedGst = Number(gstPerc);
    const gst = Number.isFinite(parsedGst) && parsedGst >= 0 ? parsedGst : 18;

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        const batchNum = (item.batchNumber || "").trim();
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

      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
      await tx.purchase.update({
        where: { id },
        data: {
          supplierId: resolvedSupplierId,
          reference: reference.trim(),
          ...(gstNumber !== undefined && { gstNumber: gstNumber?.trim() || null }),
          notes: notes?.trim() || null,
          total: 0,
          ...(date && { date: new Date(date) }),
        },
      });

      let total = 0;
      for (const raw of rawItems) {
        const product = await tx.product.findUnique({
          where: { id: raw.productId },
        });
        const litresPerUnit = product?.litres ?? 0;
        const ratePerLitre = (raw.ratePerLitre != null && raw.ratePerLitre > 0)
          ? raw.ratePerLitre
          : (product?.defaultRatePerLitre ?? 0);
        let lineTotal: number;
        let unitPriceForDb: number;
        if (ratePerLitre > 0) {
          const litres = litresPerUnit > 0 ? raw.quantity * litresPerUnit : raw.quantity;
          const baseTotal = litres * ratePerLitre;
          lineTotal = round2(baseTotal * (1 + gst / 100));
          unitPriceForDb = raw.quantity > 0 ? round2(lineTotal / raw.quantity) : 0;
        } else {
          unitPriceForDb = raw.unitPrice;
          const baseTotal = raw.quantity * unitPriceForDb;
          lineTotal = round2(baseTotal * (1 + gst / 100));
          unitPriceForDb = round2(unitPriceForDb);
        }
        total = round2(total + lineTotal);
        await tx.purchaseItem.create({
          data: {
            purchaseId: id,
            productId: raw.productId,
            quantity: raw.quantity,
            unitPrice: unitPriceForDb,
            total: lineTotal,
            batchNumber: raw.batchNumber,
            ratePerLitre: ratePerLitre > 0 ? ratePerLitre : raw.ratePerLitre,
            unitsReceived: raw.unitsReceived,
            stockType: raw.stockType,
            manufacturingDate: raw.manufacturingDate,
          },
        });
        const litresToAdd = raw.quantity * litresPerUnit;
        const batchNum = raw.batchNumber.trim() || "";
        const inv = await findInventoryByProductAndBatch(tx, raw.productId, batchNum);
        if (inv) {
          await tx.inventory.update({
            where: { id: inv.id },
            data: {
              quantity: inv.quantity + raw.quantity,
              litres: inv.litres + litresToAdd,
            },
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: raw.productId,
              batchNumber: batchNum,
              quantity: raw.quantity,
              litres: litresToAdd,
            },
          });
        }
      }
      await tx.purchase.update({
        where: { id },
        data: { total: round2(total) },
      });

      return tx.purchase.findUnique({
        where: { id },
        include: { supplier: true, items: { include: { product: true } } },
      });
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update purchase" },
      { status: 500 }
    );
  }
}
