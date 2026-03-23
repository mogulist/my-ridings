"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function HeaderAuth() {
	const { data: session, status } = useSession();

	if (status === "loading") {
		return (
			<span className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
				확인 중...
			</span>
		);
	}

	if (session?.user) {
		return (
			<div className="flex items-center gap-2">
				<span className="text-sm text-zinc-600 dark:text-zinc-400">
					{session.user.email ?? session.user.name ?? "로그인됨"}
				</span>
				<button
					type="button"
					onClick={() => signOut()}
					className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
				>
					로그아웃
				</button>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={() => signIn("google")}
				className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
			>
				Google 로그인
			</button>
			<button
				type="button"
				onClick={() => signIn("github")}
				className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
			>
				GitHub 로그인
			</button>
		</div>
	);
}
