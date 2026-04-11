"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

export default function SignInPageClient() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { status } = useSession();

	const callbackUrl = normalizeCallbackUrl(searchParams.get("callbackUrl"));

	useEffect(() => {
		if (status === "authenticated") router.replace(callbackUrl);
	}, [status, router, callbackUrl]);

	const oauthButtonClass =
		"flex w-full min-h-12 items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-[15px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-[#3E3E3E] dark:bg-black dark:text-white dark:hover:bg-white/5";

	return (
		<div className="flex h-screen flex-col bg-zinc-50 dark:bg-black">
			<header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-black">
				<div className="flex items-center gap-3">
					<div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-200 dark:bg-zinc-800">
						<span className="text-sm">🚴</span>
					</div>
					<span className="font-semibold text-zinc-900 dark:text-zinc-100">
						Plan My Route
					</span>
				</div>
				<Link
					href={callbackUrl}
					className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 hover:bg-zinc-100 dark:border-[#3E3E3E] dark:text-white dark:hover:bg-white/5"
				>
					뒤로
				</Link>
			</header>

			<main className="flex flex-1 items-center justify-center p-6">
				<div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black dark:shadow-none">
					<h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
						로그인
					</h1>
					<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
						원하는 계정을 선택해 로그인하세요.
					</p>

					<div className="mt-4 space-y-3">
						<button
							type="button"
							onClick={() => signIn("google", { callbackUrl })}
							className={oauthButtonClass}
						>
							<img
								src="https://www.google.com/favicon.ico"
								alt=""
								width={18}
								height={18}
								className="shrink-0"
							/>
							Google로 로그인
						</button>
						<button
							type="button"
							onClick={() => signIn("github", { callbackUrl })}
							className={oauthButtonClass}
						>
							<img
								src="https://github.githubassets.com/favicons/favicon.png"
								alt=""
								width={18}
								height={18}
								className="shrink-0 dark:hidden"
							/>
							<img
								src="https://cdn.simpleicons.org/github/ffffff"
								alt=""
								width={18}
								height={18}
								className="hidden shrink-0 dark:block"
							/>
							GitHub로 로그인
						</button>
					</div>
				</div>
			</main>
		</div>
	);
}

function normalizeCallbackUrl(raw: string | null): string {
	if (!raw) return "/";
	if (!raw.startsWith("/")) return "/";
	if (raw.startsWith("//")) return "/";
	return raw;
}
