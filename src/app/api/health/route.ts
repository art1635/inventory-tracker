import { NextResponse } from "next/server";

/**
 * GET /api/health - Check env and DB. Excluded from auth in middleware.
 * Use this to see why the server might be failing (missing env, DB down, etc.).
 */
export async function GET() {
  const checks: Record<string, string> = {};
  let ok = true;

  if (!process.env.NEXTAUTH_SECRET?.trim()) {
    checks.NEXTAUTH_SECRET = "missing";
    ok = false;
  } else {
    checks.NEXTAUTH_SECRET = "set";
  }

  if (!process.env.NEXTAUTH_URL?.trim()) {
    checks.NEXTAUTH_URL = "missing";
    ok = false;
  } else {
    checks.NEXTAUTH_URL = "set";
  }

  if (!process.env.DATABASE_URL?.trim()) {
    checks.DATABASE_URL = "missing";
    ok = false;
  } else {
    checks.DATABASE_URL = "set";
  }

  if (process.env.DATABASE_URL?.trim()) {
    try {
      const { prisma } = await import("@/lib/db");
      await prisma.$queryRaw`SELECT 1`;
      checks.database = "connected";
    } catch (e) {
      checks.database = "error";
      checks.databaseError = e instanceof Error ? e.message : String(e);
      ok = false;
    }
  }

  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 500 });
}
