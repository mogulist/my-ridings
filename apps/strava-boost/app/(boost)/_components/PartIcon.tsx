import { Circle, CircleDot, Link2, Settings2 } from "lucide-react";
import type { PartKind } from "@/lib/equipment";

export function PartIcon({ kind, size = 20 }: { kind: PartKind; size?: number }) {
	const Icon =
		kind === "wheelset"
			? Circle
			: kind === "tire"
				? CircleDot
				: kind === "chain"
					? Link2
					: Settings2;
	return <Icon size={size} aria-hidden="true" />;
}
