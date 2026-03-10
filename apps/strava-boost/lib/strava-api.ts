"use client";

import axios, { type AxiosInstance } from "axios";
import type { StravaActivity, StravaTokenResponse } from "@/src/types";
import { dbUtils } from "./indexeddb";
import { saveTokens } from "./strava-auth";

class StravaApiClient {
	private client: AxiosInstance | null = null;
	private accessToken: string | null = null;

	private async getAccessToken(): Promise<string> {
		// IndexedDB에서 토큰 가져오기
		const tokens = await dbUtils.getTokens();

		if (!tokens) {
			throw new Error("인증이 필요합니다. 로그인해주세요.");
		}

		// 토큰 만료 확인 (30초 여유)
		const now = Math.floor(Date.now() / 1000);
		const expiresAt = tokens.expiresAt;
		const buffer = 30;

		if (expiresAt - now < buffer) {
			// 토큰 만료 또는 곧 만료 예정 - refresh
			try {
				const response = await axios.post<StravaTokenResponse>("/api/auth/refresh", {
					refreshToken: tokens.refreshToken,
				});

				const tokenResponse = response.data;
				await saveTokens(tokenResponse);

				return tokenResponse.access_token;
			} catch (error) {
				console.error("토큰 refresh 실패:", error);
				throw new Error("토큰 갱신에 실패했습니다. 다시 로그인해주세요.");
			}
		}

		return tokens.accessToken;
	}

	private async getClient(): Promise<AxiosInstance> {
		if (this.client && this.accessToken) {
			return this.client;
		}

		const token = await this.getAccessToken();
		this.accessToken = token;

		this.client = axios.create({
			baseURL: "https://www.strava.com/api/v3",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		return this.client;
	}

	async getActivities(params?: {
		after?: number;
		page?: number;
		perPage?: number;
	}): Promise<StravaActivity[]> {
		const client = await this.getClient();
		const activities: StravaActivity[] = [];
		let page = params?.page || 1;
		const perPage = params?.perPage || 200;

		while (true) {
			try {
				const requestParams: Record<string, string | number> = {
					page,
					per_page: perPage,
				};

				if (params?.after) {
					requestParams.after = params.after;
				}

				const response = await client.get<StravaActivity[]>("/athlete/activities", {
					params: requestParams,
				});

				const pageActivities = response.data;

				if (pageActivities.length === 0) {
					break;
				}

				activities.push(...pageActivities);

				if (pageActivities.length < perPage) {
					break;
				}

				page++;

				// Rate limiting 방지
				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (error) {
				if (axios.isAxiosError(error)) {
					if (error.response?.status === 401) {
						// 토큰 만료 - 재시도
						this.client = null;
						this.accessToken = null;
						const newClient = await this.getClient();
						const retryResponse = await newClient.get<StravaActivity[]>("/athlete/activities", {
							params: {
								page,
								per_page: perPage,
								...(params?.after && { after: params.after }),
							},
						});
						activities.push(...retryResponse.data);
						if (retryResponse.data.length < perPage) {
							break;
						}
						page++;
						continue;
					}

					if (error.response?.status === 429) {
						// Rate limit - 대기 후 재시도
						const retryAfter = error.response.headers["retry-after"];
						const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000;
						console.warn(`Rate limit 도달. ${waitTime / 1000}초 대기...`);
						await new Promise((resolve) => setTimeout(resolve, waitTime));
						continue;
					}

					console.error("API 호출 실패:", error.response?.data || error.message);
					throw error;
				}
				throw error;
			}
		}

		return activities;
	}

	async getGear(gearId: string): Promise<{ id: string; name: string } | null> {
		try {
			const client = await this.getClient();
			const response = await client.get<{ id: string; name: string }>(`/gear/${gearId}`);
			return response.data;
		} catch (error) {
			if (axios.isAxiosError(error)) {
				if (error.response?.status === 404) {
					// 자전거 정보를 찾을 수 없음
					return null;
				}
				console.error("자전거 정보 조회 실패:", error.response?.data || error.message);
			}
			return null;
		}
	}
}

export const stravaApi = new StravaApiClient();
