"use client";
import { X } from "lucide-react";
import { createContext, useContext, useEffect, useRef } from "react";
export const SaveErrorContext = createContext("");
export function Modal({
	title,
	close,
	children,
	sheet = false,
	busy = false,
	hasChanges,
}: {
	title: string;
	close: () => void;
	children: React.ReactNode;
	sheet?: boolean;
	busy?: boolean;
	hasChanges?: boolean;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	const dirty = useRef(false);
	const error = useContext(SaveErrorContext);
	function requestClose() {
		if (busy) return;
		if ((hasChanges ?? dirty.current) && !window.confirm("작성 중인 내용을 버리고 닫을까요?"))
			return;
		close();
	}
	useEffect(() => {
		const dialog = ref.current;
		dialog?.showModal();
		dialog?.querySelector<HTMLElement>("input,select,textarea")?.focus();
		return () => dialog?.close();
	}, []);
	return (
		<dialog
			ref={ref}
			className={`boost-dialog ${sheet ? "boost-picker" : ""}`}
			aria-label={title}
			onCancel={(e) => {
				e.preventDefault();
				requestClose();
			}}
			onChangeCapture={() => {
				dirty.current = true;
			}}
		>
			<div className="boost-dialog-head">
				<h2>{title}</h2>
				<button
					type="button"
					className="boost-icon"
					aria-label="닫기"
					disabled={busy}
					onClick={requestClose}
				>
					<X size={20} />
				</button>
			</div>
			{error && (
				<p role="alert" className="boost-error">
					{error}
				</p>
			)}
			{children}
		</dialog>
	);
}
