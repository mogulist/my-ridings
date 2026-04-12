"use client";

import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@my-ridings/ui";
import { MoreHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";

export type DotsMenuEntry =
	| {
			type: "item";
			key: string;
			label: string;
			icon?: ReactNode;
			variant?: "default" | "destructive";
			onSelect: () => void;
	  }
	| { type: "separator"; key: string };

type DotsMenuProps = {
	entries: DotsMenuEntry[];
	triggerLabel?: string;
	align?: "start" | "end";
	contentClassName?: string;
};

export function DotsMenu({
	entries,
	triggerLabel = "더보기",
	align = "end",
	contentClassName,
}: DotsMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 shrink-0"
					aria-label={triggerLabel}
					onClick={(e) => e.stopPropagation()}
				>
					<MoreHorizontalIcon className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align={align}
				className={contentClassName}
				onClick={(e) => e.stopPropagation()}
			>
				{entries.map((entry) => {
					if (entry.type === "separator") {
						return <DropdownMenuSeparator key={entry.key} />;
					}
					return (
						<DropdownMenuItem
							key={entry.key}
							variant={entry.variant === "destructive" ? "destructive" : "default"}
							onSelect={(e) => {
								e.preventDefault();
								entry.onSelect();
							}}
						>
							{entry.icon ? (
								<span className="flex items-center gap-2">
									{entry.icon}
									{entry.label}
								</span>
							) : (
								entry.label
							)}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
