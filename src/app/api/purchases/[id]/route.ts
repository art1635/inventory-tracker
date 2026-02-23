import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
        const inv = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });
        const litresPerUnit = item.product?.litres ?? 0;
        const litresToSubtract = item.quantity * litresPerUnit;
        if (inv) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: {
              quantity: Math.max(0, inv.quantity - item.quantity),
              litres: Math.max(0, inv.litres - litresToSubtract),
            },
          });
        }
      }
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
      await tx.purchase.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete purchase" },
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
    const { supplierId, newSupplier, reference, notes, date, gstNumber, manufacturingDate, items } = body;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
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
    }

    const NEW_SUPPLIER = "__new__";
    let resolvedSupplierId: string;
    if (newSupplier?.name?.trim()) {
      const name = newSupplier.name.trim();
      const existing = await prisma.supplier.findFirst({ where: { name } });
      if (existing) {
        resolvedSupplierId = existing.id;
      } else {
        const created = await prisma.supplier.create({
          data: {
            name,
            email: newSupplier.email?.trim() || null,
            phone: newSupplier.phone?.trim() || null,
            address: newSupplier.address?.trim() || null,
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
        };
      }
    );

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        const inv = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });
        const litresPerUnit = item.product?.litres ?? 0;
        const litresToSubtract = item.quantity * litresPerUnit;
        if (inv) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: {
              quantity: Math.max(0, inv.quantity - item.quantity),
              litres: Math.max(0, inv.litres - litresToSubtract),
            },
          });
        }
      }

      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
      await tx.purchase.update({
        where: { id },
        data: {
          supplierId: resolvedSupplierId,
          reference: reference?.trim() || null,
          ...(gstNumber !== undefined && { gstNumber: gstNumber?.trim() || null }),
          ...(manufacturingDate !== undefined && { manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null }),
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
          lineTotal = litres * ratePerLitre;
          unitPriceForDb = raw.quantity > 0 ? lineTotal / raw.quantity : 0;
        } else {
          unitPriceForDb = raw.unitPrice;
          lineTotal = raw.quantity * unitPriceForDb;
        }
        total += lineTotal;
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
          },
        });
        const litresToAdd = raw.quantity * litresPerUnit;
        const inv = await tx.inventory.findUnique({
          where: { productId: raw.productId },
        });
        if (inv) {
          await tx.inventory.update({
            where: { productId: raw.productId },
            data: {
              quantity: inv.quantity + raw.quantity,
              litres: inv.litres + litresToAdd,
            },
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: raw.productId,
              quantity: raw.quantity,
              litres: litresToAdd,
            },
          });
        }
      }
      await tx.purchase.update({
        where: { id },
        data: { total },
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
