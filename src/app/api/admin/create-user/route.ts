import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const secret = process.env.ALLOW_PASSWORD_RESET_SECRET;
  if (!secret?.trim()) {
    return NextResponse.json(
      { error: "Not configured" },
      { status: 503 }
    );
  }
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const providedSecret = typeof body?.secret === "string" ? body.secret.trim() : "";
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (providedSecret !== secret.trim()) {
      return NextResponse.json({ error: "Invalid reset key" }, { status: 401 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists. Use “Clear password” if you forgot it." },
        { status: 409 }
      );
    }
    await prisma.user.create({
      data: { email, passwordHash: "__PENDING_FIRST_LOGIN__" },
    });
    return NextResponse.json({
      ok: true,
      message: "User created. Go to the login page and sign in with this email and any password to set it.",
    });
  } catch (e) {
    const err = e as Error & { code?: string };
    console.error("[create-user]", err);
    const message = process.env.NODE_ENV === "development" && err?.message
      ? err.message
      : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
