import { type Configuration, type Garage, type Slot, slots } from "@/lib/equipment";

type ConfigurationSummaryProps = {
	garage: Garage;
	parts: Configuration;
};

export function ConfigurationSummary({ garage, parts }: ConfigurationSummaryProps) {
	return (
		<dl className="boost-configuration-summary">
			{(Object.keys(slots) as Slot[])
				.filter((slot) => parts[slot])
				.map((slot) => (
					<div key={slot}>
						<dt>{slots[slot].label}</dt>
						<dd>{garage.parts.find((part) => part.id === parts[slot])?.name ?? "삭제된 부품"}</dd>
					</div>
				))}
			{!Object.keys(parts).length && (
				<div>
					<dt>부품</dt>
					<dd>지정된 부품 없음</dd>
				</div>
			)}
		</dl>
	);
}
