import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions, canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!(await canAccessAdmin(session)) || !session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const currentUserId = session.user.id;
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "User id is required" }, { status: 400 });
    }
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const isSelf = currentUserId === id;
    if (isSelf) {
      const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::int as count FROM "User" WHERE "isAdmin" = true
      `;
      const adminCount = Number(countResult[0]?.count ?? 0);
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "At least one admin is required. Make another user admin first." },
          { status: 400 }
        );
      }
    }
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as Error & { code?: string };
    if (err.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("[DELETE /api/users/:id]", e);
    return NextResponse.json({ error: "Failed to revoke access" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!(await canAccessAdmin(session)) || !session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const currentUserId = session.user.id;
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "User id is required" }, { status: 400 });
    }
    const body = await request.json();
    const isAdmin = body?.isAdmin === true;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const isSelf = currentUserId === id;
    if (isSelf && !isAdmin) {
      const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::int as count FROM "User" WHERE "isAdmin" = true
      `;
      const adminCount = Number(countResult[0]?.count ?? 0);
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "At least one admin is required. Make another user admin first." },
          { status: 400 }
        );
      }
    }
    // Use raw update (inline boolean to avoid binding issues)
    const sql = isAdmin
      ? Prisma.sql`UPDATE "User" SET "isAdmin" = true WHERE "id" = ${id}`
      : Prisma.sql`UPDATE "User" SET "isAdmin" = false WHERE "id" = ${id}`;
    const updated = await prisma.$executeRaw(sql);
    if (updated === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, isAdmin: !!isAdmin });
  } catch (e) {
    const err = e as Error & { code?: string; meta?: unknown };
    console.error("[PATCH /api/users/:id]", err);
    const message =
      process.env.NODE_ENV === "development" && err?.message
        ? err.message
        : "Failed to update user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
