import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PENDING_FIRST_LOGIN = "__PENDING_FIRST_LOGIN__";

function hasPasswordSet(hash: string | null): boolean {
  return hash != null && hash !== PENDING_FIRST_LOGIN;
}

type UserRowRaw = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  passwordHash: string | null;
  isAdmin?: boolean;
  isadmin?: boolean; // Prisma may lowercase column names
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!(await canAccessAdmin(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Use raw query so we always get isAdmin from DB (Prisma client may omit it)
    const users = await prisma.$queryRaw<UserRowRaw[]>`
      SELECT id, email, name, "createdAt", "passwordHash", "isAdmin"
      FROM "User"
      ORDER BY "createdAt" DESC
    `;
    return NextResponse.json(
      users.map((u) => {
        const isAdminFromDb = u.isAdmin ?? (u as UserRowRaw).isadmin ?? false;
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          createdAt: u.createdAt,
          hasPassword: hasPasswordSet(u.passwordHash),
          isAdmin: isAdminFromDb,
        };
      })
    );
  } catch (e) {
    const err = e as Error;
    console.error("[GET /api/users]", err);
    const message =
      process.env.NODE_ENV === "development" && err?.message
        ? err.message
        : "Failed to fetch users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!(await canAccessAdmin(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }
    const user = await prisma.user.create({
      data: { email, name: body.name?.trim() || null, passwordHash: PENDING_FIRST_LOGIN },
    });
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      hasPassword: false,
      isAdmin: user.isAdmin,
    });
  } catch (e) {
    console.error("[POST /api/users]", e);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
