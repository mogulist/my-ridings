"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

type SessionProviderProps = {
	children: ReactNode;
};

export default function SessionProvider({ children }: SessionProviderProps) {
	return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
