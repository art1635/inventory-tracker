import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findInventoryByProductAndBatch } from "@/lib/inventory";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }
    return NextResponse.json(sale);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch sale" },
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
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const batch = (bn: string | null) => (bn || "").trim();
      for (const item of sale.items) {
        const batchNum = batch(item.batchNumber);
        const inv = await findInventoryByProductAndBatch(tx, item.productId, batchNum);
        const litresPerUnit = item.product?.litres ?? 0;
        const litresToAdd = item.quantity * litresPerUnit;
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
      await tx.saleItem.deleteMany({ where: { saleId: id } });
      await tx.sale.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete sale" },
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
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const body = await request.json();
    const { customerId, newCustomer, reference, notes, date, gstPerc, items } = body;
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
          { error: "Batch is required for every line item" },
          { status: 400 }
        );
      }
      if (!item.stockType?.trim()) {
        return NextResponse.json(
          { error: "Stock type is required for every line item" },
          { status: 400 }
        );
      }
      const up = Number(item.unitPrice);
      if (Number.isNaN(up) || up < 0) {
        return NextResponse.json(
          { error: "Sale price per litre is required for every line item (0 or more)" },
          { status: 400 }
        );
      }
    }

    const NEW_CUSTOMER = "__new__";
    let resolvedCustomerId: string;
    if (newCustomer?.name?.trim()) {
      const name = newCustomer.name.trim();
      const existing = await prisma.customer.findFirst({ where: { name } });
      if (existing) {
        resolvedCustomerId = existing.id;
      } else {
        const created = await prisma.customer.create({
          data: {
            name,
            gstNumber: newCustomer.gstNumber?.trim() || null,
          },
        });
        resolvedCustomerId = created.id;
      }
    } else if (customerId?.trim() && customerId !== NEW_CUSTOMER) {
      resolvedCustomerId = customerId.trim();
    } else {
      return NextResponse.json(
        { error: "Select a customer or enter a new customer name" },
        { status: 400 }
      );
    }

    const lineItems: {
      productId: string;
      quantity: number;
      unitPrice: number;
      total: number;
      batchNumber: string;
      stockType: string | null;
    }[] = [];
    let subtotal = 0;
    for (const item of items) {
      const qty = Math.max(0, Number(item.quantity) || 0);
      const price = Number(item.unitPrice) || 0;
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { litres: true },
      });
      const litresPerUnit = product?.litres ?? 0;
      const lineTotal =
        litresPerUnit > 0 ? (qty * litresPerUnit) * price : qty * price;
      subtotal += lineTotal;
      lineItems.push({
        productId: item.productId,
        quantity: qty,
        unitPrice: price,
        total: lineTotal,
        batchNumber: item.batchNumber.trim(),
        stockType: item.stockType.trim(),
      });
    }
    const gst = Number(gstPerc) || 0;
    const total = subtotal * (1 + gst / 100);

    const updated = await prisma.$transaction(async (tx) => {
      // Restore inventory from the existing sale first (per product+batch)
      const batch = (bn: string | null) => (bn || "").trim();
      for (const item of sale.items) {
        const batchNum = batch(item.batchNumber);
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

      for (const line of lineItems) {
        const batchNum = batch(line.batchNumber);
        const product = await tx.product.findUnique({
          where: { id: line.productId },
        });
        const inv = await findInventoryByProductAndBatch(tx, line.productId, batchNum);
        const currentQty = inv?.quantity ?? 0;
        const currentLitres = inv?.litres ?? 0;
        const litresPerUnit = product?.litres ?? 0;
        const litresToDeduct = line.quantity * litresPerUnit;
        if (currentQty < line.quantity) {
          throw new Error(
            `Insufficient stock for "${product?.name ?? line.productId}" (batch ${batchNum || "—"}). Available: ${currentQty} units, requested: ${line.quantity}`
          );
        }
        if (litresPerUnit > 0 && currentLitres < litresToDeduct) {
          throw new Error(
            `Insufficient litres for "${product?.name ?? line.productId}" (batch ${batchNum || "—"}). Available: ${currentLitres.toFixed(2)} L, requested: ${litresToDeduct.toFixed(2)} L`
          );
        }
      }

      await tx.saleItem.deleteMany({ where: { saleId: id } });
      await tx.sale.update({
        where: { id },
        data: {
          customerId: resolvedCustomerId,
          reference: reference.trim(),
          notes: notes?.trim() || null,
          total,
          gstPerc: gst > 0 ? gst : null,
          ...(date && { date: new Date(date) }),
        },
      });

      for (const line of lineItems) {
        await tx.saleItem.create({
          data: {
            saleId: id,
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            total: line.total,
            batchNumber: line.batchNumber,
            stockType: line.stockType,
          },
        });
        const batchNum = batch(line.batchNumber);
        const product = await tx.product.findUnique({
          where: { id: line.productId },
        });
        const litresPerUnit = product?.litres ?? 0;
        const litresToDeduct = line.quantity * litresPerUnit;
        const inv = await findInventoryByProductAndBatch(tx, line.productId, batchNum);
        if (inv) {
          const newQty = inv.quantity - line.quantity;
          const newLitres = Math.max(0, inv.litres - litresToDeduct);
          if (newQty <= 0) {
            await tx.inventory.delete({ where: { id: inv.id } });
          } else {
            await tx.inventory.update({
              where: { id: inv.id },
              data: { quantity: newQty, litres: newLitres },
            });
          }
        }
      }

      return tx.sale.findUnique({
        where: { id },
        include: { customer: true, items: { include: { product: true } } },
      });
    });

    return NextResponse.json(updated);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update sale";
    const isStock =
      message.includes("Insufficient stock") ||
      message.includes("Insufficient litres");
    return NextResponse.json(
      { error: message },
      { status: isStock ? 400 : 500 }
    );
  }
}
