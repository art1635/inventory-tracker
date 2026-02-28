import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Returns only batches that have stock in inventory (quantity > 0). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const rows = await prisma.inventory.findMany({
      where: { productId, quantity: { gt: 0 } },
      select: { batchNumber: true },
      orderBy: { batchNumber: "asc" },
    });
    const batches = rows.map((r) => r.batchNumber).filter((b) => b != null && b.trim() !== "");
    return NextResponse.json({ batches });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch batches" },
      { status: 500 }
    );
  }
}
