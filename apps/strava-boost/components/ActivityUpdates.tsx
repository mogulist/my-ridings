"use client";

import axios from "axios";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteStoredActivity } from "@/lib/activity-storage";
import { dbUtils } from "@/lib/indexeddb";
import { stravaApi } from "@/lib/strava-api";
import { ACTIVITY_CHANGED, getStoredActivities, syncActivity } from "@/lib/sync";

type Reader = { athleteId: number; expiresAt: number; ticket: string };
type Change = { activity_id: number; version: string };

export function ActivityUpdates() {
	const pathname = usePathname();
	const [message, setMessage] = useState<string | null>(null);
	useEffect(() => {
		if (pathname === "/demo") return;
		let stopped = false;
		let timer: ReturnType<typeof setTimeout>;
		let reader: Reader | null = null;
		let running = false;
		let retryDelay = 5000;

		async function check() {
			if (running || stopped) return;
			clearTimeout(timer);
			running = true;
			try {
				if (document.visibilityState === "hidden") return;
				const tokens = await dbUtils.getTokens();
				if (!tokens) { reader = null; setMessage(null); return; }
				if (!reader || reader.athleteId !== tokens.athleteId || reader.expiresAt < Date.now() / 1000 + 30) {
					const response = await fetch("/api/strava/changes", {
						method: "POST", signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${await stravaApi.getAccessToken()}` },
					});
					if (!response.ok) throw new Error("변경 알림에 연결하지 못했습니다. 잠시 후 다시 시도합니다.");
					const data = await response.json();
					if (!data.enabled) { setMessage("자동 업데이트 설정이 필요합니다. 개별 재동기화는 사용할 수 있습니다."); retryDelay = 60000; return; }
					// Hydrate imported cloud activities before deciding which invalidations to apply.
					// A fresh browser cache must not mark existing cloud activities as unimported.
					await getStoredActivities();
					reader = data;
				}
				if (!reader || stopped) return;
				const key = `strava-change-versions:${reader.athleteId}`;
				const seen: Record<string, string> = JSON.parse(localStorage.getItem(key) || "{}");
				let after = 0;
				let hasMore = true;
				while (hasMore && !stopped) {
					if (!reader) return;
					const response = await fetch(`/api/strava/changes?after=${after}`, {
						headers: { Authorization: `Bearer ${reader.ticket}` }, cache: "no-store", signal: AbortSignal.timeout(15000),
					});
					if (response.status === 401) reader = null;
					if (!response.ok) throw new Error("자동 업데이트를 재시도하고 있습니다.");
					const data: { changes: Change[]; hasMore: boolean } = await response.json();
					for (const change of data.changes) {
						if (stopped) return;
						const currentTokens = await dbUtils.getTokens();
						if (currentTokens?.athleteId !== tokens.athleteId) { reader = null; return; }
						if (seen[change.activity_id] === change.version) continue;
						// Only refresh activities already imported into this browser.
						if (await dbUtils.getActivityById(change.activity_id)) {
							try { await syncActivity(change.activity_id); }
							catch (error) {
								if (!axios.isAxiosError(error) || error.response?.status !== 404) throw error;
								await deleteStoredActivity(change.activity_id);
								window.dispatchEvent(new CustomEvent(ACTIVITY_CHANGED, { detail: change.activity_id }));
							}
						}
						seen[change.activity_id] = change.version;
						localStorage.setItem(key, JSON.stringify(seen));
					}
					hasMore = data.hasMore;
					after = data.changes.at(-1)?.activity_id ?? after;
				}
				retryDelay = 5000;
				setMessage(null);
			} catch (error) {
				retryDelay = Math.min(retryDelay * 2, 60000);
				setMessage(error instanceof Error ? error.message : "자동 업데이트를 재시도하고 있습니다.");
			} finally {
				running = false;
				if (!stopped) timer = setTimeout(check, retryDelay);
			}
		}
		void check();
		document.addEventListener("visibilitychange", check);
		window.addEventListener("focus", check);
		return () => { stopped = true; clearTimeout(timer); document.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); };
	}, [pathname]);
	return pathname !== "/demo" && message ? <p role="status" className="bg-amber-50 px-4 py-2 text-xs text-amber-900">{message}</p> : null;
}
