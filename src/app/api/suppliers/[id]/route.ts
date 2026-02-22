import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(supplier);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
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
    const { name, email, phone, address } = body;
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name?.trim() }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
      },
    });
    return NextResponse.json(supplier);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update supplier" },
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
    await prisma.purchaseItem.deleteMany({
      where: { purchase: { supplierId: id } },
    });
    await prisma.purchase.deleteMany({ where: { supplierId: id } });
    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
}
