"use client";
import Link from "next/link";
export function SiteNavigation({
	active,
	onNavigate,
}: {
	active: "statistics" | "equipment";
	onNavigate?: () => boolean;
}) {
	return (
		<nav className="trace-primary-nav" aria-label="Trace 페이지 이동">
			{(
				[
					{ id: "statistics", href: "/", label: "라이딩 통계" },
					{ id: "equipment", href: "/equipment", label: "내 장비·정비" },
				] as const
			).map((item) => (
				<Link
					key={item.id}
					href={item.href}
					aria-current={active === item.id ? "page" : undefined}
					onClick={(event) => {
						if (onNavigate && !onNavigate()) event.preventDefault();
					}}
				>
					{item.label}
				</Link>
			))}
		</nav>
	);
}
