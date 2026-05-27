"use client";

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "./utils";

const toggleGroupItemVariants = cva(
	"inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
	{
		variants: {
			variant: {
				default: "bg-transparent hover:bg-muted hover:text-muted-foreground",
				outline:
					"border border-input bg-transparent hover:bg-accent hover:text-accent-foreground data-[state=on]:border-accent",
			},
			size: {
				default: "h-9 px-3",
				sm: "h-7 px-2 text-xs",
				lg: "h-10 px-5",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

const ToggleGroup = forwardRef<
	React.ElementRef<typeof ToggleGroupPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
	<ToggleGroupPrimitive.Root
		ref={ref}
		className={cn("inline-flex items-center justify-center gap-1", className)}
		{...props}
	/>
));
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

type ToggleGroupItemProps = React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
	VariantProps<typeof toggleGroupItemVariants>;

const ToggleGroupItem = forwardRef<
	React.ElementRef<typeof ToggleGroupPrimitive.Item>,
	ToggleGroupItemProps
>(({ className, variant, size, ...props }, ref) => (
	<ToggleGroupPrimitive.Item
		ref={ref}
		className={cn(toggleGroupItemVariants({ variant, size }), className)}
		{...props}
	/>
));
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem, toggleGroupItemVariants };
