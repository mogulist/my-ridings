import type React from "react";
import "@/app/globals.css";
import { Inter } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
const inter = Inter({ subsets: ["latin"] });
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
