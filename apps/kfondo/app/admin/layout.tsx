import type React from "react";
import "@/app/globals.css";
import { Inter } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
const inter = Inter({ subsets: ["latin"] });

// 로그인 화면을 포함한 관리자 HTML은 사전 생성하거나 캐시하지 않는다.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <AppProviders>
          <div className="flex h-svh flex-col overflow-hidden">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}
