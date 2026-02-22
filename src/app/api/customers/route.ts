import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(customers);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, address } = body;
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 }
      );
    }
    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
      },
    });
    return NextResponse.json(customer);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
