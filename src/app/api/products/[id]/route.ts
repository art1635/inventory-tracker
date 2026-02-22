import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { inventory: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch product" },
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
    const body = await request.json();
    const { name, sku, description, unit, stockType, litres, defaultRatePerLitre, gstPerc } = body;
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name?.trim() }),
        ...(sku !== undefined && { sku: sku?.trim() || null }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(unit !== undefined && { unit: unit?.trim() || "pcs" }),
        ...(stockType !== undefined && { stockType: stockType?.trim() || null }),
        ...(litres !== undefined && { litres: litres != null ? Number(litres) : null }),
        ...(defaultRatePerLitre !== undefined && { defaultRatePerLitre: defaultRatePerLitre != null && defaultRatePerLitre !== "" ? Number(defaultRatePerLitre) : null }),
        ...(gstPerc !== undefined && { gstPerc: gstPerc != null ? Number(gstPerc) : null }),
      },
    });
    return NextResponse.json(product);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update product" },
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
    await prisma.inventory.deleteMany({ where: { productId: id } });
    await prisma.purchaseItem.deleteMany({ where: { productId: id } });
    await prisma.saleItem.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
