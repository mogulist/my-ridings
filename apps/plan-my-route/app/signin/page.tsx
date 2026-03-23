"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

export default function SignInPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { status } = useSession();

	const callbackUrl = normalizeCallbackUrl(searchParams.get("callbackUrl"));

	useEffect(() => {
		if (status === "authenticated") router.replace(callbackUrl);
	}, [status, router, callbackUrl]);

	return (
		<div className="flex h-screen flex-col bg-zinc-50 dark:bg-black/95">
			<header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
				<div className="flex items-center gap-3">
					<div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-200 dark:bg-zinc-700">
						<span className="text-sm">🚴</span>
					</div>
					<span className="font-semibold text-zinc-900 dark:text-zinc-100">
						Plan My Route
					</span>
				</div>
				<Link
					href={callbackUrl}
					className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
				>
					뒤로
				</Link>
			</header>

			<main className="flex flex-1 items-center justify-center p-6">
				<div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
					<h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
						로그인
					</h1>
					<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
						원하는 계정을 선택해 로그인하세요.
					</p>

					<div className="mt-4 space-y-2">
						<button
							type="button"
							onClick={() => signIn("google", { callbackUrl })}
							className="flex w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
						>
							Google로 로그인
						</button>
						<button
							type="button"
							onClick={() => signIn("github", { callbackUrl })}
							className="flex w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
						>
							GitHub으로 로그인
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
