import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const secret = process.env.ALLOW_PASSWORD_RESET_SECRET;
  if (!secret?.trim()) {
    return NextResponse.json(
      { error: "Password reset not configured" },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const providedSecret = typeof body?.secret === "string" ? body.secret : "";
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (providedSecret !== secret) {
      return NextResponse.json({ error: "Invalid reset key" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: "__PENDING_FIRST_LOGIN__" },
    });
    return NextResponse.json({ ok: true, message: "Password cleared. You can set a new one on next login." });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to clear password" }, { status: 500 });
  }
}
