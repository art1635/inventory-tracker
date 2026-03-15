import type { NextAuthOptions } from "next-auth";
import type { Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";

const ADMIN_FALLBACK_EMAIL = "admin@staridb.com";

/** Check admin from DB so APIs don't rely on JWT. */
export async function isAdminFromDb(session: Session | null): Promise<boolean> {
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return user?.isAdmin ?? false;
}

/** Admin if DB says so, or if session email is the fallback admin email. */
export async function canAccessAdmin(session: Session | null): Promise<boolean> {
  if (!session?.user) return false;
  if (session.user.email?.toLowerCase() === ADMIN_FALLBACK_EMAIL) return true;
  return isAdminFromDb(session);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim()?.toLowerCase();
        const rawPassword = credentials?.password;
        if (!email || !rawPassword || !rawPassword.trim()) {
          if (process.env.NODE_ENV === "development") console.log("[auth] Missing email or password");
          return null;
        }
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user) {
          if (process.env.NODE_ENV === "development") console.log("[auth] No user found for:", email);
          return null;
        }
        const pendingFirstLogin = user.passwordHash === "__PENDING_FIRST_LOGIN__";
        if (user.passwordHash == null || pendingFirstLogin) {
          // First login: set password and log in
          try {
            const password = rawPassword.trim();
            const hash = await bcrypt.hash(password, 10);
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: hash },
            });
            if (process.env.NODE_ENV === "development") console.log("[auth] First login OK for:", email);
            return { id: user.id, email: user.email, name: user.name ?? undefined, isAdmin: user.isAdmin };
          } catch (err) {
            console.error("[auth] First-login update failed:", err);
            return null;
          }
        }
        const ok = await bcrypt.compare(rawPassword.trim(), user.passwordHash);
        if (!ok) {
          if (process.env.NODE_ENV === "development") console.log("[auth] Wrong password for:", email);
          return null;
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.email = token.email ?? "";
        session.user.name = token.name ?? null;
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
      }
      return session;
    },
  },
};
