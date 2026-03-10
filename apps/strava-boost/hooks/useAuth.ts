"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuth, getAuthUrl, getStoredTokens } from "@/lib/strava-auth";

type AuthState = {
	isAuthenticated: boolean;
	isLoading: boolean;
	athleteId: number | null;
};

export const useAuth = () => {
	const [authState, setAuthState] = useState<AuthState>({
		isAuthenticated: false,
		isLoading: true,
		athleteId: null,
	});
	const router = useRouter();

	useEffect(() => {
		const checkAuth = async () => {
			try {
				const tokens = await getStoredTokens();

				if (tokens) {
					// 토큰 만료 확인
					const now = Math.floor(Date.now() / 1000);
					if (tokens.expiresAt > now) {
						setAuthState({
							isAuthenticated: true,
							isLoading: false,
							athleteId: tokens.athleteId,
						});
					} else {
						// 토큰 만료 - 로그아웃 처리
						await clearAuth();
						setAuthState({
							isAuthenticated: false,
							isLoading: false,
							athleteId: null,
						});
					}
				} else {
					setAuthState({
						isAuthenticated: false,
						isLoading: false,
						athleteId: null,
					});
				}
			} catch (error) {
				console.error("인증 확인 오류:", error);
				setAuthState({
					isAuthenticated: false,
					isLoading: false,
					athleteId: null,
				});
			}
		};

		checkAuth();
	}, []);

	const login = () => {
		const authUrl = getAuthUrl();
		window.location.href = authUrl;
	};

	const logout = async () => {
		await clearAuth();
		setAuthState({
			isAuthenticated: false,
			isLoading: false,
			athleteId: null,
		});
		router.push("/");
		router.refresh();
	};

	return {
		...authState,
		login,
		logout,
	};
};
