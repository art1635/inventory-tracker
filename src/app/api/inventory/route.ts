import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const inventory = await prisma.inventory.findMany({
      include: { product: true },
      orderBy: { product: { name: "asc" } },
    });
    return NextResponse.json(inventory);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
