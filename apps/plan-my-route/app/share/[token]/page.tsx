import type { Metadata } from "next";
import Link from "next/link";
import HeaderAuth from "@/app/components/HeaderAuth";
import { PublicPlanViewer } from "@/app/components/PublicPlanViewer";
import { SharePlanDuplicateCta } from "@/app/components/SharePlanDuplicateCta";
import { supabaseAdmin } from "@/lib/supabase";

type SharePageProps = {
	params: Promise<{ token: string }>;
};

const UUID_V4_LIKE_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ShareMetadataRow = {
	name: string;
	route: {
		name: string;
		cover_image_og_url: string | null;
		cover_image_hero_url: string | null;
	} | null;
};

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
	const { token } = await params;
	if (!UUID_V4_LIKE_REGEX.test(token)) {
		return {};
	}

	const { data } = await supabaseAdmin
		.from("plan")
		.select(
			`
				name,
				route:route (
					name,
					cover_image_og_url,
					cover_image_hero_url
				)
			`,
		)
		.eq("public_share_token", token)
		.maybeSingle<ShareMetadataRow>();
	if (!data?.route) {
		return {};
	}

	const ogImage = data.route.cover_image_og_url || data.route.cover_image_hero_url || undefined;
	const title = `${data.route.name} · ${data.name} 공유 플랜`;
	const description = "라이딩 경로와 일자별 계획을 공유하는 Plan My Route 페이지";

	return {
		title,
		description,
		openGraph: {
			title,
			description,
			images: ogImage ? [{ url: ogImage }] : undefined,
		},
		twitter: {
			card: ogImage ? "summary_large_image" : "summary",
			title,
			description,
			images: ogImage ? [ogImage] : undefined,
		},
	};
}

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
