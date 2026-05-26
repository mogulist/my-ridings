"use client";

import { TrendingUp } from "lucide-react";
import { cn } from "@my-ridings/ui";

type SummitGradientButtonProps = {
	onClick: () => void;
	className?: string;
	/** compact: 리스트 행 끝, comfortable: 패널 */
	size?: "compact" | "comfortable";
};

export function SummitGradientButton({
	onClick,
	className,
	size = "compact",
}: SummitGradientButtonProps) {
	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onClick();
			}}
			className={cn(
				"inline-flex items-center gap-0.5 rounded-md border border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
				size === "comfortable" ? "px-2 py-1 text-xs" : "px-1.5 py-0.5 text-[10px]",
				className,
			)}
			aria-label="경사 프로필 보기"
		>
			<TrendingUp className={size === "comfortable" ? "size-3.5" : "size-3"} aria-hidden />
			<span>경사</span>
		</button>
	);
}
