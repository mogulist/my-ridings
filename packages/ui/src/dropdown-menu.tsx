"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "./utils";

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
				"z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
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
			"relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
			variant === "destructive" &&
				"text-destructive focus:bg-destructive/10 focus:text-destructive",
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
		className={cn("-mx-1 my-1 h-px bg-border", className)}
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
