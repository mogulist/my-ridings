"use client";

import { usePathname } from "next/navigation";

type RootLayoutContentProps = {
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function RootLayoutContent({
  children,
  footer,
}: RootLayoutContentProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
      {footer}
    </div>
  );
}
