"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeCallbackPath } from "@/lib/auth-utils";
import { createClient } from "@/lib/supabase/client";

export default function SignInPageClient() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const callbackPath = normalizeCallbackPath(searchParams.get("callbackUrl"));
	const oauthError = searchParams.get("error");

	useEffect(() => {
		const supabase = createClient();
		void supabase.auth.getUser().then(({ data }) => {
			if (data.user) router.replace(callbackPath);
		});
	}, [router, callbackPath]);

	useEffect(() => {
		if (oauthError === "oauth") {
			setErrorMessage("GitHub 로그인에 실패했습니다. 다시 시도해 주세요.");
		}
	}, [oauthError]);

	const handleGithubLogin = async () => {
		setIsLoading(true);
		setErrorMessage(null);

		const supabase = createClient();
		const baseUrl =
			typeof window !== "undefined"
				? process.env.NEXT_PUBLIC_APP_URL || window.location.origin
				: process.env.NEXT_PUBLIC_APP_URL || "";
		const redirectTo = `${baseUrl.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(callbackPath)}`;
		const { error } = await supabase.auth.signInWithOAuth({
			provider: "github",
			options: { redirectTo },
		});

		if (error) {
			setErrorMessage("GitHub 로그인을 시작하지 못했습니다.");
			setIsLoading(false);
		}
	};

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
					href={callbackPath}
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
						GitHub 계정으로 로그인하세요.
					</p>

					<div className="mt-4 space-y-3">
						<button
							type="button"
							onClick={() => void handleGithubLogin()}
							disabled={isLoading}
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
							{isLoading ? "연결 중..." : "GitHub로 로그인"}
						</button>
					</div>

					{errorMessage ? (
						<p className="mt-3 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
					) : null}
				</div>
			</main>
		</div>
	);
}
