"use client";
import { X } from "lucide-react";
import { createContext, useContext, useEffect, useRef } from "react";
export const SaveErrorContext = createContext("");
export function Modal({
	title,
	close,
	children,
	sheet = false,
}: {
	title: string;
	close: () => void;
	children: React.ReactNode;
	sheet?: boolean;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	const error = useContext(SaveErrorContext);
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
				close();
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) close();
			}}
		>
			<div className="boost-dialog-head">
				<h2>{title}</h2>
				<button type="button" className="boost-icon" aria-label="닫기" onClick={close}>
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
