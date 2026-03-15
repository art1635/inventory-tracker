"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="main-content-bg flex-1 overflow-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
