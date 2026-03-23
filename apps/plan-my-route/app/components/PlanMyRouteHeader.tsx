"use client";

import { Map } from "lucide-react";
import Link from "next/link";
import HeaderAuth from "./HeaderAuth";

const SIGN_IN_HEADER_CLASS =
	"inline-flex h-8 items-center justify-center rounded-md border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";

export function PlanMyRouteHeader() {
	return (
		<header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
			<div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
				<Link href="/" className="flex items-center gap-2">
					<Map className="h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
					<span className="font-bold tracking-tight text-gray-900 dark:text-zinc-100">
						Plan My Route
					</span>
				</Link>
				<HeaderAuth signInLinkClassName={SIGN_IN_HEADER_CLASS} />
			</div>
		</header>
	);
}
