"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuContent = ({
	className,
	sideOffset = 4,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) => (
	<DropdownMenuPrimitive.Portal>
		<DropdownMenuPrimitive.Content
			sideOffset={sideOffset}
			className={cn(
				"z-50 min-w-[8rem] overflow-hidden rounded-md border border-zinc-200 bg-white p-1 text-zinc-950 shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
				className,
			)}
			{...props}
		/>
	</DropdownMenuPrimitive.Portal>
);
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = ({
	className,
	variant,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
	variant?: "default" | "destructive";
}) => (
	<DropdownMenuPrimitive.Item
		className={cn(
			"relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-zinc-100 focus:text-zinc-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-zinc-800 dark:focus:text-zinc-50",
			variant === "destructive" &&
				"text-red-600 focus:bg-red-50 focus:text-red-600 dark:text-red-400 dark:focus:bg-red-950/30 dark:focus:text-red-400",
			className,
		)}
		{...props}
	/>
);
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuSeparator = ({
	className,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) => (
	<DropdownMenuPrimitive.Separator
		className={cn("-mx-1 my-1 h-px bg-zinc-200 dark:bg-zinc-800", className)}
		{...props}
	/>
);
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuGroup,
	DropdownMenuPortal,
};
