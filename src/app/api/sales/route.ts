import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(sales);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

const NEW_CUSTOMER = "__new__";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, newCustomer, reference, notes, date, items } = body;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    let resolvedCustomerId: string;
    if (newCustomer?.name?.trim()) {
      const name = newCustomer.name.trim();
      const existing = await prisma.customer.findFirst({
        where: { name },
      });
      if (existing) {
        resolvedCustomerId = existing.id;
      } else {
        const created = await prisma.customer.create({
          data: {
            name,
            email: newCustomer.email?.trim() || null,
            phone: newCustomer.phone?.trim() || null,
            address: newCustomer.address?.trim() || null,
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
      batchNumber: string | null;
      stockType: string | null;
    }[] = [];
    let total = 0;
    for (const item of items) {
      const qty = Math.max(0, Number(item.quantity) || 0);
      const price = Number(item.unitPrice) || 0;
      const lineTotal = qty * price;
      total += lineTotal;
      lineItems.push({
        productId: item.productId,
        quantity: qty,
        unitPrice: price,
        total: lineTotal,
        batchNumber: item.batchNumber?.trim() || null,
        stockType: item.stockType?.trim() || null,
      });
    }

    const sale = await prisma.$transaction(async (tx) => {
      for (const line of lineItems) {
        const inv = await tx.inventory.findUnique({
          where: { productId: line.productId },
        });
        const product = await tx.product.findUnique({
          where: { id: line.productId },
        });
        const currentQty = inv?.quantity ?? 0;
        const currentLitres = inv?.litres ?? 0;
        const litresPerUnit = product?.litres ?? 0;
        const litresToDeduct = line.quantity * litresPerUnit;
        if (currentQty < line.quantity) {
          throw new Error(
            `Insufficient stock for "${product?.name ?? line.productId}". Available: ${currentQty} units, requested: ${line.quantity}`
          );
        }
        if (litresPerUnit > 0 && currentLitres < litresToDeduct) {
          throw new Error(
            `Insufficient litres for "${product?.name ?? line.productId}". Available: ${currentLitres.toFixed(2)} L, requested: ${litresToDeduct.toFixed(2)} L (${line.quantity} × ${litresPerUnit} L)`
          );
        }
      }

      const s = await tx.sale.create({
        data: {
          customerId: resolvedCustomerId,
          reference: reference?.trim() || null,
          notes: notes?.trim() || null,
          total,
          ...(date && { date: new Date(date) }),
        },
      });
      for (const line of lineItems) {
        await tx.saleItem.create({
          data: {
            saleId: s.id,
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            total: line.total,
            batchNumber: line.batchNumber,
            stockType: line.stockType,
          },
        });
        const product = await tx.product.findUnique({
          where: { id: line.productId },
        });
        const litresPerUnit = product?.litres ?? 0;
        const litresToDeduct = line.quantity * litresPerUnit;
        const inv = await tx.inventory.findUnique({
          where: { productId: line.productId },
        });
        if (inv) {
          await tx.inventory.update({
            where: { productId: line.productId },
            data: {
              quantity: inv.quantity - line.quantity,
              litres: Math.max(0, inv.litres - litresToDeduct),
            },
          });
        }
      }
      return tx.sale.findUnique({
        where: { id: s.id },
        include: { customer: true, items: { include: { product: true } } },
      });
    });

    return NextResponse.json(sale);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create sale";
    const isStock =
      message.includes("Insufficient stock") ||
      message.includes("Insufficient litres");
    return NextResponse.json(
      { error: message },
      { status: isStock ? 400 : 500 }
    );
  }
}
