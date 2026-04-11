"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	MoreHorizontalIcon,
	PencilIcon,
	TrashIcon,
	CopyIcon,
	ImageIcon,
	Loader2Icon,
} from "lucide-react";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@my-ridings/ui";

type Route = {
	id: string;
	name: string;
	rwgps_url: string;
	created_at: string;
	start_date?: string | null;
	cover_image_thumb_url?: string | null;
};

type DialogMode = "create" | "edit";

function formatDateForDisplay(isoDate: string): string {
	if (!isoDate) return "";
	const [y, m, d] = isoDate.split("-").map(Number);
	if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return isoDate;
	return `${y}. ${m}. ${d}.`;
}

export default function RouteList() {
	const [routes, setRoutes] = useState<Route[]>([]);
	const [loading, setLoading] = useState(true);
	const [showRouteDialog, setShowRouteDialog] = useState(false);
	const [routeDialogMode, setRouteDialogMode] = useState<DialogMode>("create");
	const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
	const [routeNameInput, setRouteNameInput] = useState("");
	const [routeUrlInput, setRouteUrlInput] = useState("");
	const [routeStartDateInput, setRouteStartDateInput] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [openMenuRouteId, setOpenMenuRouteId] = useState<string | null>(null);
	const [regeneratingRouteId, setRegeneratingRouteId] = useState<string | null>(null);
	const router = useRouter();

	useEffect(() => {
		fetchRoutes();
	}, []);

	async function fetchRoutes() {
		try {
			const res = await fetch("/api/routes");
			if (!res.ok) throw new Error("Failed to fetch routes");
			const data = await res.json();
			setRoutes(data);
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	}

	function openCreateRouteDialog() {
		setRouteDialogMode("create");
		setEditingRouteId(null);
		setRouteNameInput("");
		setRouteUrlInput("");
		setRouteStartDateInput("");
		setShowRouteDialog(true);
	}

	function openEditRouteDialog(route: Route) {
		setRouteDialogMode("edit");
		setEditingRouteId(route.id);
		setRouteNameInput(route.name);
		setRouteUrlInput(route.rwgps_url);
		setRouteStartDateInput(route.start_date ?? "");
		setOpenMenuRouteId(null);
		setShowRouteDialog(true);
	}

	function closeRouteDialog() {
		setShowRouteDialog(false);
		setEditingRouteId(null);
		setRouteNameInput("");
		setRouteUrlInput("");
		setRouteStartDateInput("");
	}

	async function handleSubmitRoute(e: React.FormEvent) {
		e.preventDefault();
		if (!routeNameInput || !routeUrlInput) return;

		setIsSubmitting(true);
		try {
			const isEditMode = routeDialogMode === "edit" && editingRouteId;
			const endpoint = isEditMode ? `/api/routes/${editingRouteId}` : "/api/routes";
			const method = isEditMode ? "PUT" : "POST";
			const res = await fetch(endpoint, {
				method,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: routeNameInput,
					rwgps_url: routeUrlInput,
					start_date: routeStartDateInput || null,
					total_distance: 0, // In MVP, you might want to fetch this via RWGPS API, setting 0 for now
				}),
			});

			if (!res.ok) throw new Error("Failed to save route");

			await fetchRoutes(); // refresh list
			closeRouteDialog();
		} catch (error) {
			console.error(error);
			alert("경로 저장에 실패했습니다.");
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleDuplicateRoute(routeId: string) {
		try {
			const res = await fetch(`/api/routes/${routeId}/duplicate`, { method: "POST" });
			if (!res.ok) throw new Error("Failed to duplicate route");
			setOpenMenuRouteId(null);
			await fetchRoutes();
		} catch (error) {
			console.error(error);
			alert("경로 복제에 실패했습니다.");
		}
	}

	async function handleDeleteRoute(routeId: string) {
		const confirmed = window.confirm("이 경로를 삭제하시겠습니까?");
		if (!confirmed) return;

		try {
			const res = await fetch(`/api/routes/${routeId}`, { method: "DELETE" });
			if (!res.ok) throw new Error("Failed to delete route");
			setOpenMenuRouteId(null);
			await fetchRoutes();
		} catch (error) {
			console.error(error);
			alert("경로 삭제에 실패했습니다.");
		}
	}

	async function handleRegenerateCover(routeId: string) {
		if (regeneratingRouteId === routeId) return;
		setRegeneratingRouteId(routeId);
		setOpenMenuRouteId(null);
		try {
			const res = await fetch(`/api/routes/${routeId}/regenerate-cover`, { method: "POST" });
			if (!res.ok) throw new Error("Failed to regenerate cover");
			await fetchRoutes();
			toast.success("대표 이미지 생성을 완료했습니다.");
		} catch (error) {
			console.error(error);
			toast.error("대표 이미지 재생성에 실패했습니다.");
		} finally {
			setRegeneratingRouteId(null);
		}
	}

	if (loading) {
		return <div className="p-8 text-center text-zinc-500">불러오는 중...</div>;
	}

	return (
		<div className="mx-auto max-w-4xl p-6">
			{regeneratingRouteId ? (
				<div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
					<div className="flex items-center gap-3 rounded-lg bg-white px-5 py-4 shadow-xl dark:bg-zinc-900">
						<Loader2Icon className="h-5 w-5 animate-spin text-blue-600" />
						<p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
							대표이미지를 생성하는 중입니다...
						</p>
					</div>
				</div>
			) : null}
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
					내 라이딩 경로
				</h1>
				<button
					onClick={openCreateRouteDialog}
					className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
				>
					+ 경로 추가
				</button>
			</div>

			{routes.length === 0 ? (
				<div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
					<p className="mb-4 text-zinc-500">저장된 경로가 없습니다.</p>
					<button
						onClick={openCreateRouteDialog}
						className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
					>
						첫 경로 생성하기
					</button>
				</div>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2">
					{routes.map((route) => (
						<li key={route.id} className="relative">
							<Link
								href={`/routes/${route.id}`}
								className="block overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
							>
								{route.cover_image_thumb_url ? (
									<div
										className="aspect-video w-full bg-zinc-200 bg-cover bg-center dark:bg-zinc-800"
										style={{ backgroundImage: `url(${route.cover_image_thumb_url})` }}
									/>
								) : (
									<div className="aspect-video w-full bg-zinc-100 dark:bg-zinc-800" />
								)}
								<div className="p-4 pr-12">
									<h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
										{route.name}
									</h2>
									<p className="mt-1 truncate text-sm text-zinc-500">{route.rwgps_url}</p>
									<p className="mt-2 text-xs text-zinc-400">
										{route.start_date
											? formatDateForDisplay(route.start_date)
											: new Date(route.created_at).toLocaleDateString()}
									</p>
								</div>
							</Link>
							<div className="absolute right-2 top-2 z-10">
								<DropdownMenu
									open={openMenuRouteId === route.id}
									onOpenChange={(open) => setOpenMenuRouteId(open ? route.id : null)}
								>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 rounded"
											aria-label="경로 메뉴"
										>
											<MoreHorizontalIcon className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onSelect={() => openEditRouteDialog(route)}>
											<PencilIcon className="h-4 w-4" />
											수정
										</DropdownMenuItem>
										<DropdownMenuItem onSelect={() => handleDuplicateRoute(route.id)}>
											<CopyIcon className="h-4 w-4" />
											복제
										</DropdownMenuItem>
										<DropdownMenuItem
											disabled={regeneratingRouteId === route.id}
											onSelect={(event) => {
												event.preventDefault();
												void handleRegenerateCover(route.id);
											}}
										>
											{regeneratingRouteId === route.id ? (
												<Loader2Icon className="h-4 w-4 animate-spin" />
											) : (
												<ImageIcon className="h-4 w-4" />
											)}
											대표이미지 재생성
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											variant="destructive"
											onSelect={() => handleDeleteRoute(route.id)}
										>
											<TrashIcon className="h-4 w-4" />
											삭제
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</li>
					))}
				</ul>
			)}

			{showRouteDialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900 border dark:border-zinc-800">
						<h3 className="mb-4 text-lg font-bold">
							{routeDialogMode === "edit" ? "경로 수정" : "새 경로 추가"}
						</h3>
						<form onSubmit={handleSubmitRoute} className="space-y-4">
							<div>
								<label className="mb-1 block text-sm font-medium">
									경로 이름
								</label>
								<input
									type="text"
									required
									value={routeNameInput}
									onChange={(e) => setRouteNameInput(e.target.value)}
									className="w-full rounded border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
									placeholder="예: 서울-부산"
								/>
							</div>
							<div>
								<label className="mb-1 block text-sm font-medium">
									RideWithGPS URL
								</label>
								<input
									type="url"
									required
									value={routeUrlInput}
									onChange={(e) => setRouteUrlInput(e.target.value)}
									className="w-full rounded border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
									placeholder="https://ridewithgps.com/routes/..."
								/>
							</div>
							{routeDialogMode === "edit" && (
								<div>
									<label className="mb-1 block text-sm font-medium">
										라이딩 시작일
									</label>
									<input
										type="date"
										value={routeStartDateInput}
										onChange={(e) => setRouteStartDateInput(e.target.value)}
										className="w-full rounded border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
									/>
								</div>
							)}
							<div className="flex justify-end gap-2 pt-2">
								<button
									type="button"
									onClick={closeRouteDialog}
									className="rounded px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
								>
									취소
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
								>
									{isSubmitting ? "저장 중..." : "저장"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
