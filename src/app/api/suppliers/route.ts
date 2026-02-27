import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(suppliers);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, gstNumber } = body;
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Supplier name is required" },
        { status: 400 }
      );
    }
    if (!gstNumber?.trim()) {
      return NextResponse.json(
        { error: "GST Number is required" },
        { status: 400 }
      );
    }
    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        gstNumber: gstNumber.trim(),
      },
    });
    return NextResponse.json(supplier);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
