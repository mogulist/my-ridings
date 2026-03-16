import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2",
	{
		variants: {
			variant: {
				default:
					"border-transparent bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900",
				secondary:
					"border-transparent bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50",
				destructive:
					"border-transparent bg-red-600 text-white dark:bg-red-900 dark:text-red-50",
				outline: "text-zinc-950 dark:text-zinc-50",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
	VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
export type { BadgeProps };
