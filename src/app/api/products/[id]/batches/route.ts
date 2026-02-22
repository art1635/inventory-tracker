import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const items = await prisma.purchaseItem.findMany({
      where: { productId, batchNumber: { not: null } },
      select: { batchNumber: true },
      distinct: ["batchNumber"],
      orderBy: { batchNumber: "asc" },
    });
    const batches = items
      .map((i) => i.batchNumber)
      .filter((b): b is string => b != null && b.trim() !== "");
    return NextResponse.json({ batches });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch batches" },
      { status: 500 }
    );
  }
}
