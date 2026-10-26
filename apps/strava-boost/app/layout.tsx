import type { Metadata } from "next";
import { Providers } from "./providers";
import "@/styles/globals.css";

export const metadata: Metadata = {
	title: "Trace · 라이딩과 장비 기록",
	description: "자전거 부품의 사용 거리와 정비 이력을 라이딩과 함께 기록합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ko">
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
