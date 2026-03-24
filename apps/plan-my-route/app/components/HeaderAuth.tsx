"use client";

import { cn } from "@my-ridings/ui";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useState } from "react";

type Props = {
  signInLinkClassName?: string;
};

export default function HeaderAuth({ signInLinkClassName }: Props) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [nicknamePanelOpen, setNicknamePanelOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [nicknameMessage, setNicknameMessage] = useState<string | null>(null);

  const query = searchParams.toString();
  const callbackUrl = query ? `${pathname}?${query}` : pathname;
  const signInHref = `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  const openNicknamePanel = useCallback(async () => {
    setNicknamePanelOpen(true);
    setNicknameMessage(null);
    setNicknameLoading(true);
    try {
      const res = await fetch("/api/me/profile");
      const json = (await res.json()) as { nickname?: string | null; error?: string };
      if (!res.ok) {
        setNicknameMessage(json.error ?? "불러오지 못했습니다.");
        setNicknameDraft("");
        return;
      }
      setNicknameDraft(json.nickname ?? "");
    } catch {
      setNicknameMessage("불러오지 못했습니다.");
      setNicknameDraft("");
    } finally {
      setNicknameLoading(false);
    }
  }, []);

  const saveNickname = useCallback(async () => {
    setNicknameMessage(null);
    setNicknameLoading(true);
    const nextNickname =
      nicknameDraft.trim() === "" ? null : nicknameDraft.trim();
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nextNickname }),
      });
      const json = (await res.json()) as { nickname?: string | null; error?: string };
      if (!res.ok) {
        setNicknameMessage(json.error ?? "저장하지 못했습니다.");
        return;
      }
      setNicknameDraft(json.nickname ?? "");
      setNicknameMessage("저장했습니다.");
    } catch {
      setNicknameMessage("저장하지 못했습니다.");
    } finally {
      setNicknameLoading(false);
    }
  }, [nicknameDraft]);

  if (status === "loading") {
    return (
      <span className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
        확인 중...
      </span>
    );
  }

  if (session?.user) {
    return (
      <div className="relative flex flex-col items-end gap-1">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="max-w-[12rem] truncate text-sm text-zinc-600 dark:text-zinc-400 sm:max-w-none">
            {session.user.email ?? session.user.name ?? "로그인됨"}
          </span>
          <button
            type="button"
            onClick={() => void openNicknamePanel()}
            className="rounded border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
          >
            공유 닉네임
          </button>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
          >
            로그아웃
          </button>
        </div>
        {nicknamePanelOpen ? (
          <div
            className="absolute right-0 top-full z-50 mt-1 w-72 rounded-md border border-zinc-200 bg-white p-3 text-left shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
            role="dialog"
            aria-label="공유 플랜에 표시할 닉네임"
          >
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              공개 링크로 플랜을 볼 때만 표시됩니다. 비워 두면 표시하지 않습니다.
            </p>
            <input
              type="text"
              value={nicknameDraft}
              onChange={(e) => setNicknameDraft(e.target.value)}
              maxLength={40}
              disabled={nicknameLoading}
              placeholder="닉네임 (최대 40자)"
              className="mt-2 w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
            {nicknameMessage ? (
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {nicknameMessage}
              </p>
            ) : null}
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setNicknamePanelOpen(false);
                  setNicknameMessage(null);
                }}
                className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={nicknameLoading}
                onClick={() => void saveNickname()}
                className="rounded bg-orange-500 px-2 py-1 text-xs text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {nicknameLoading ? "처리 중…" : "저장"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={signInHref}
      className={cn(
        "rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800",
        signInLinkClassName,
      )}
    >
      로그인
    </Link>
  );
}
