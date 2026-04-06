import Link from "next/link";
import HeaderAuth from "@/app/components/HeaderAuth";
import { PublicPlanViewer } from "@/app/components/PublicPlanViewer";
import { SharePlanDuplicateCta } from "@/app/components/SharePlanDuplicateCta";

type SharePageProps = {
	params: Promise<{ token: string }>;
};

export default async function SharePage({ params }: SharePageProps) {
	const { token } = await params;

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
				<div className="flex items-center gap-4">
					<Link
						href="/"
						className="flex h-8 w-8 items-center justify-center rounded bg-zinc-200 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
					>
						<span className="text-sm">←</span>
					</Link>
					<span className="font-semibold text-zinc-900 dark:text-zinc-100">
						공유 플랜 보기
					</span>
				</div>
				<div className="flex items-center gap-2">
					<SharePlanDuplicateCta token={token} variant="header" />
					<HeaderAuth />
				</div>
			</header>
			<PublicPlanViewer token={token} />
		</div>
	);
}
