"use client";

type StageEditPreviewToolbarProps = {
	onDiscardPreview?: () => void;
	onCommitPreview?: () => void;
};

export function StageEditPreviewToolbar({
	onDiscardPreview,
	onCommitPreview,
}: StageEditPreviewToolbarProps) {
	return (
		<div className="pointer-events-none absolute inset-0 z-30">
			<div className="pointer-events-auto absolute top-2 right-2 flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-white/95 p-0.5 shadow-sm backdrop-blur-sm dark:border-zinc-600 dark:bg-zinc-900/95">
				<button
					type="button"
					onClick={onDiscardPreview}
					className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-600"
				>
					취소
				</button>
				<button
					type="button"
					onClick={onCommitPreview}
					className="rounded bg-orange-500 px-2 py-1 text-xs font-medium text-white hover:bg-orange-600"
				>
					적용
				</button>
			</div>
		</div>
	);
}
