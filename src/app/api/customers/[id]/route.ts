import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(customer);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
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
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name?.trim() }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
      },
    });
    return NextResponse.json(customer);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update customer" },
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
    await prisma.saleItem.deleteMany({
      where: { sale: { customerId: id } },
    });
    await prisma.sale.deleteMany({ where: { customerId: id } });
    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
