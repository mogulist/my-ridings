import type React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex h-svh flex-col overflow-hidden">{children}</div>;
}
