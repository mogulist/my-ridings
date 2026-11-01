"use client";

import { useEffect } from "react";

export function AdminSessionRefresh() {
  useEffect(() => {
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(`/admin/auth/refresh?next=${encodeURIComponent(next)}`);
  }, []);
  return <p className="p-6">로그인을 확인하는 중…</p>;
}
