"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityUpdates } from "@/components/ActivityUpdates";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 1000 * 60 * 60, // 1시간
						refetchOnWindowFocus: false,
					},
				},
			}),
	);

	return <QueryClientProvider client={queryClient}><ActivityUpdates />{children}</QueryClientProvider>;
}
