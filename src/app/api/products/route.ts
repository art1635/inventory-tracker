import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: { inventory: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(products);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, sku, description, unit, stockType, litres, defaultRatePerLitre, gstPerc } = body;
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }
    if (!sku?.trim()) {
      return NextResponse.json(
        { error: "SKU is required" },
        { status: 400 }
      );
    }
    if (!unit?.trim()) {
      return NextResponse.json(
        { error: "Unit is required" },
        { status: 400 }
      );
    }
    if (!stockType?.trim()) {
      return NextResponse.json(
        { error: "Stock type is required" },
        { status: 400 }
      );
    }
    const litresNum =
      litres != null && litres !== "" ? Number(litres) : null;
    if (litresNum == null || Number.isNaN(litresNum) || litresNum < 0) {
      return NextResponse.json(
        { error: "Litres is required (0 or more)" },
        { status: 400 }
      );
    }
    const defaultRateNum =
      defaultRatePerLitre != null && defaultRatePerLitre !== "" ? Number(defaultRatePerLitre) : null;
    const gstPercNum =
      gstPerc != null && gstPerc !== "" ? Number(gstPerc) : null;
    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        sku: sku.trim(),
        description: description?.trim() || null,
        unit: unit.trim(),
        stockType: stockType.trim(),
        litres: litresNum,
        defaultRatePerLitre:
          defaultRateNum != null && !Number.isNaN(defaultRateNum) ? defaultRateNum : null,
        gstPerc:
          gstPercNum != null && !Number.isNaN(gstPercNum) ? gstPercNum : null,
      },
    });
    await prisma.inventory.create({
      data: { productId: product.id, quantity: 0 },
    });
    return NextResponse.json(product);
  } catch (e) {
    console.error(e);
    const message =
      e instanceof Error ? e.message : "Failed to create product";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
