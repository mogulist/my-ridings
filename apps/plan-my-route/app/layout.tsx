import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SessionProvider from "./components/SessionProvider";
import SonnerToaster from "./components/SonnerToaster";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

function resolveMetadataBase(): URL | undefined {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL;
	if (!appUrl) return undefined;
	try {
		return new URL(appUrl);
	} catch {
		return undefined;
	}
}

export const metadata: Metadata = {
	title: "Plan My Route - 백두대간 울트라 로드 계획",
	description:
		"8일 인듀어런스 라이딩을 위한 경로·숙박 계획 도구. 매일 라이딩 거리와 획득고도를 전략적으로 수립합니다.",
	metadataBase: resolveMetadataBase(),
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ko">
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<SessionProvider>
					{children}
					<SonnerToaster />
				</SessionProvider>
			</body>
		</html>
	);
}
