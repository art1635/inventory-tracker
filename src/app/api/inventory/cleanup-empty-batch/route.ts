import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Delete inventory rows that have no batch number (empty or whitespace-only).
 */
export async function POST() {
  try {
    const rows = await prisma.inventory.findMany({
      select: { id: true, batchNumber: true },
    });
    const idsToDelete = rows
      .filter((r) => !(r.batchNumber ?? "").trim())
      .map((r) => r.id);
    if (idsToDelete.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }
    await prisma.inventory.deleteMany({
      where: { id: { in: idsToDelete } },
    });
    return NextResponse.json({ success: true, deleted: idsToDelete.length });
  } catch (e) {
    console.error("Cleanup empty batch inventory error:", e);
    const message = e instanceof Error ? e.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
