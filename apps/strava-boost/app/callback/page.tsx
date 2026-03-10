"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { exchangeCodeForToken, saveTokens } from "@/lib/strava-auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

function CallbackContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const handleCallback = async () => {
			const code = searchParams.get("code");
			const oauthError = searchParams.get("error");

			if (oauthError) {
				setError(`인증 오류: ${oauthError}`);
				setStatus("error");
				return;
			}

			if (!code) {
				setError("인증 코드가 없습니다.");
				setStatus("error");
				return;
			}

			try {
				// 토큰 교환
				const tokenResponse = await exchangeCodeForToken(code);

				// IndexedDB에 토큰 저장
				await saveTokens(tokenResponse);

				// Supabase에 사용자 정보 저장 (설정된 경우에만)
				if (isSupabaseConfigured()) {
					const { error: supabaseError } = await supabase.from("users").upsert(
						{
							strava_id: tokenResponse.athlete.id,
							last_sync_at: null,
							updated_at: new Date().toISOString(),
						},
						{
							onConflict: "strava_id",
						},
					);

					if (supabaseError) {
						console.error("Supabase 저장 오류:", supabaseError);
						// Supabase 오류는 치명적이지 않으므로 계속 진행
					}
				} else {
					console.log("Supabase가 설정되지 않아 사용자 정보를 저장하지 않습니다.");
				}

				setStatus("success");
				setTimeout(() => {
					router.push("/");
				}, 2000);
			} catch (err) {
				console.error("인증 처리 오류:", err);
				setError(err instanceof Error ? err.message : "인증 처리 중 오류가 발생했습니다.");
				setStatus("error");
			}
		};

		handleCallback();
	}, [searchParams, router]);

	if (status === "loading") {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
					<p className="text-gray-600">인증 처리 중...</p>
				</div>
			</div>
		);
	}

	if (status === "error") {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center max-w-md">
					<div className="text-red-500 text-6xl mb-4">✕</div>
					<h1 className="text-2xl font-bold mb-2">인증 실패</h1>
					<p className="text-gray-600 mb-4">{error}</p>
					<button
						onClick={() => router.push("/")}
						className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
					>
						홈으로 돌아가기
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="text-center">
				<div className="text-green-500 text-6xl mb-4">✓</div>
				<h1 className="text-2xl font-bold mb-2">인증 완료!</h1>
				<p className="text-gray-600">잠시 후 메인 페이지로 이동합니다...</p>
			</div>
		</div>
	);
}

export default function Callback() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center min-h-screen">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
						<p className="text-gray-600">로딩 중...</p>
					</div>
				</div>
			}
		>
			<CallbackContent />
		</Suspense>
	);
}
