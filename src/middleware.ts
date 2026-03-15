import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/((?!login|reset-password|api/auth|api/admin).*)"],
};
