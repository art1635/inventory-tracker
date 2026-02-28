import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.inventory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete inventory error:", e);
    const message = e instanceof Error ? e.message : "Failed to remove inventory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
