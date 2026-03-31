"use client";

import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@my-ridings/ui";
import { InfoIcon, PencilIcon, UserRoundIcon } from "lucide-react";
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
  const [savedNickname, setSavedNickname] = useState("");
  const [nicknameEditDraft, setNicknameEditDraft] = useState("");
  const [isNicknameEditing, setIsNicknameEditing] = useState(false);
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [nicknameMessage, setNicknameMessage] = useState<string | null>(null);

  const query = searchParams.toString();
  const callbackUrl = query ? `${pathname}?${query}` : pathname;
  const signInHref = `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  const loadProfile = useCallback(async () => {
    setNicknameMessage(null);
    setIsNicknameEditing(false);
    setNicknameLoading(true);
    try {
      const res = await fetch("/api/me/profile");
      const json = (await res.json()) as { nickname?: string | null; error?: string };
      if (!res.ok) {
        setNicknameMessage(json.error ?? "불러오지 못했습니다.");
        setSavedNickname("");
        setNicknameEditDraft("");
        return;
      }
      const nick = json.nickname ?? "";
      setSavedNickname(nick);
      setNicknameEditDraft(nick);
    } catch {
      setNicknameMessage("불러오지 못했습니다.");
      setSavedNickname("");
      setNicknameEditDraft("");
    } finally {
      setNicknameLoading(false);
    }
  }, []);

  const startNicknameEdit = useCallback(() => {
    setNicknameEditDraft(savedNickname);
    setIsNicknameEditing(true);
    setNicknameMessage(null);
  }, [savedNickname]);

  const cancelNicknameEdit = useCallback(() => {
    setNicknameEditDraft(savedNickname);
    setIsNicknameEditing(false);
    setNicknameMessage(null);
  }, [savedNickname]);

  const saveNickname = useCallback(async () => {
    setNicknameMessage(null);
    setNicknameLoading(true);
    const nextNickname =
      nicknameEditDraft.trim() === "" ? null : nicknameEditDraft.trim();
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
      const nick = json.nickname ?? "";
      setSavedNickname(nick);
      setNicknameEditDraft(nick);
      setIsNicknameEditing(false);
      setNicknameMessage("저장했습니다.");
    } catch {
      setNicknameMessage("저장하지 못했습니다.");
    } finally {
      setNicknameLoading(false);
    }
  }, [nicknameEditDraft]);

  if (status === "loading") {
    return (
      <span className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
        확인 중...
      </span>
    );
  }

  if (session?.user) {
    const email = session.user.email ?? session.user.name ?? "로그인됨";
    const imageUrl = session.user.image;

    return (
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) void loadProfile();
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-300 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            aria-label="계정 메뉴"
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- OAuth 아바타 도메인 가변
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <UserRoundIcon className="h-5 w-5" aria-hidden />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
          <div className="border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">이메일</p>
            <p className="mt-0.5 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {email}
            </p>
          </div>
          <div className="border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  공유 닉네임
                </p>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="-m-0.5 inline-flex shrink-0 rounded p-0.5 text-zinc-400 outline-none hover:text-zinc-600 focus-visible:ring-2 focus-visible:ring-orange-400 dark:text-zinc-500 dark:hover:text-zinc-300 dark:focus-visible:ring-orange-500"
                        aria-label="공유 닉네임 안내"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <InfoIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="left"
                      align="center"
                      sideOffset={8}
                      className="z-[200] max-w-[17rem] border-zinc-200 bg-white px-2.5 py-2 text-left text-xs leading-relaxed text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      공개 링크로 플랜을 볼 때만 표시됩니다. 비우면 표시하지 않습니다.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {!isNicknameEditing ? (
                <button
                  type="button"
                  disabled={nicknameLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    startNicknameEdit();
                  }}
                  className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="닉네임 편집"
                >
                  <PencilIcon className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
            {isNicknameEditing ? (
              <>
                <input
                  type="text"
                  value={nicknameEditDraft}
                  onChange={(e) => setNicknameEditDraft(e.target.value)}
                  maxLength={40}
                  disabled={nicknameLoading}
                  placeholder="닉네임 (비우면 공개 표시 안 함)"
                  className="mt-2 w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-orange-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-orange-500"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
                {nicknameMessage ? (
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {nicknameMessage}
                  </p>
                ) : null}
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={nicknameLoading}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      cancelNicknameEdit();
                    }}
                    className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={nicknameLoading}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void saveNickname();
                    }}
                    className="rounded bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                  >
                    {nicknameLoading ? "처리 중…" : "저장"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 min-h-[1.25rem] text-sm text-zinc-900 dark:text-zinc-100">
                  {nicknameLoading ? (
                    <span className="text-zinc-400">불러오는 중…</span>
                  ) : savedNickname ? (
                    savedNickname
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-400">
                      설정되지 않음
                    </span>
                  )}
                </p>
                {nicknameMessage && !nicknameLoading ? (
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {nicknameMessage}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <DropdownMenuSeparator className="my-0" />
          <div className="p-1">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => signOut()}
            >
              로그아웃
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
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
