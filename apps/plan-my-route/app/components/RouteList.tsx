"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Route = {
	id: string;
	name: string;
	rwgps_url: string;
	created_at: string;
};

export default function RouteList() {
	const [routes, setRoutes] = useState<Route[]>([]);
	const [loading, setLoading] = useState(true);
	const [showAddModal, setShowAddModal] = useState(false);
	const [newRouteName, setNewRouteName] = useState("");
	const [newRouteUrl, setNewRouteUrl] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
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

	async function handleAddRoute(e: React.FormEvent) {
		e.preventDefault();
		if (!newRouteName || !newRouteUrl) return;

		setIsSubmitting(true);
		try {
			const res = await fetch("/api/routes", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: newRouteName,
					rwgps_url: newRouteUrl,
					total_distance: 0, // In MVP, you might want to fetch this via RWGPS API, setting 0 for now
				}),
			});

			if (!res.ok) throw new Error("Failed to add route");

			await fetchRoutes(); // refresh list
			setShowAddModal(false);
			setNewRouteName("");
			setNewRouteUrl("");
		} catch (error) {
			console.error(error);
			alert("Error adding route");
		} finally {
			setIsSubmitting(false);
		}
	}

	if (loading) {
		return <div className="p-8 text-center text-zinc-500">불러오는 중...</div>;
	}

	return (
		<div className="mx-auto max-w-4xl p-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
					내 라이딩 경로
				</h1>
				<button
					onClick={() => setShowAddModal(true)}
					className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
				>
					+ 경로 추가
				</button>
			</div>

			{routes.length === 0 ? (
				<div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
					<p className="mb-4 text-zinc-500">저장된 경로가 없습니다.</p>
					<button
						onClick={() => setShowAddModal(true)}
						className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
					>
						첫 경로 생성하기
					</button>
				</div>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2">
					{routes.map((route) => (
						<li key={route.id}>
							<Link
								href={`/routes/${route.id}`}
								className="block rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
							>
								<h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
									{route.name}
								</h2>
								<p className="mt-1 text-sm text-zinc-500 truncate">
									{route.rwgps_url}
								</p>
								<p className="mt-2 text-xs text-zinc-400">
									{new Date(route.created_at).toLocaleDateString()}
								</p>
							</Link>
						</li>
					))}
				</ul>
			)}

			{showAddModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900 border dark:border-zinc-800">
						<h3 className="mb-4 text-lg font-bold">새 경로 추가</h3>
						<form onSubmit={handleAddRoute} className="space-y-4">
							<div>
								<label className="mb-1 block text-sm font-medium">
									경로 이름
								</label>
								<input
									type="text"
									required
									value={newRouteName}
									onChange={(e) => setNewRouteName(e.target.value)}
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
									value={newRouteUrl}
									onChange={(e) => setNewRouteUrl(e.target.value)}
									className="w-full rounded border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
									placeholder="https://ridewithgps.com/routes/..."
								/>
							</div>
							<div className="flex justify-end gap-2 pt-2">
								<button
									type="button"
									onClick={() => setShowAddModal(false)}
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
