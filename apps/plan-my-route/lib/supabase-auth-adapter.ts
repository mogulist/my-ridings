import { format } from "@auth/supabase-adapter";
import type { AdapterSession, AdapterUser } from "next-auth/adapters";

const NEXT_AUTH_SCHEMA = "next_auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACCOUNT_COLUMNS = [
	"type",
	"provider",
	"providerAccountId",
	"refresh_token",
	"access_token",
	"expires_at",
	"token_type",
	"scope",
	"id_token",
	"session_state",
	"oauth_token_secret",
	"oauth_token",
	"userId",
] as const;

type AuthUserInput = {
	id?: string;
	name?: string | null;
	email?: string | null;
	image?: string | null;
	emailVerified?: Date | string | null;
};

type AuthAccountInput = Record<string, unknown>;

type QueryResult<T> = {
	data: T;
	error: { message: string } | null;
};

type TableBuilder = {
	select: (sql?: string) => TableBuilder;
	eq: (column: string, value: unknown) => TableBuilder;
	insert: (row: Record<string, unknown>) => TableBuilder;
	maybeSingle: <T = unknown>() => Promise<QueryResult<T | null>>;
	single: <T = unknown>() => Promise<QueryResult<T>>;
};

export type SchemaClient = {
	schema: (name: string) => {
		from: (table: string) => unknown;
	};
};

export const toUserInsertRow = (user: AuthUserInput) => {
	const row: {
		id?: string;
		name: string | null;
		email: string | null;
		image: string | null;
		emailVerified: string | null;
	} = {
		name: user.name ?? null,
		email: user.email ?? null,
		image: user.image ?? null,
		emailVerified:
			user.emailVerified instanceof Date
				? user.emailVerified.toISOString()
				: (user.emailVerified ?? null),
	};

	if (user.id && UUID_PATTERN.test(user.id)) row.id = user.id;
	return row;
};

export const toAccountInsertRow = (account: AuthAccountInput) => {
	const row: Record<string, unknown> = {};
	for (const column of ACCOUNT_COLUMNS) {
		if (account[column] !== undefined) row[column] = account[column];
	}
	return row;
};

const throwIfError = <T>(result: QueryResult<T>) => {
	if (result.error) throw result.error;
	return result.data;
};

const toAdapterUser = (user: Record<string, unknown>) => format({ ...user }) as AdapterUser;

export const createSupabaseAuthAdapter = (client: SchemaClient) => {
	const table = (name: string) => client.schema(NEXT_AUTH_SCHEMA).from(name) as TableBuilder;

	return {
		async createUser(user: AuthUserInput) {
			const data = throwIfError(
				await table("users")
					.insert(toUserInsertRow(user))
					.select()
					.single<Record<string, unknown>>(),
			);
			return toAdapterUser(data);
		},

		async getUserByAccount({
			provider,
			providerAccountId,
		}: {
			provider: string;
			providerAccountId: string;
		}) {
			const account = throwIfError(
				await table("accounts")
					.select('"userId"')
					.eq("provider", provider)
					.eq("providerAccountId", providerAccountId)
					.maybeSingle<{ userId?: string }>(),
			);
			if (!account?.userId) return null;

			const user = throwIfError(
				await table("users")
					.select("*")
					.eq("id", account.userId)
					.maybeSingle<Record<string, unknown>>(),
			);
			if (!user) return null;
			return toAdapterUser(user);
		},

		async linkAccount(account: AuthAccountInput) {
			throwIfError(
				await table("accounts").insert(toAccountInsertRow(account)).select().maybeSingle(),
			);
		},

		async getSessionAndUser(sessionToken: string) {
			const session = throwIfError(
				await table("sessions")
					.select("*")
					.eq("sessionToken", sessionToken)
					.maybeSingle<Record<string, unknown> & { userId?: string }>(),
			);
			if (!session?.userId) return null;

			const user = throwIfError(
				await table("users")
					.select("*")
					.eq("id", session.userId)
					.maybeSingle<Record<string, unknown>>(),
			);
			if (!user) return null;

			return {
				user: toAdapterUser(user),
				session: format({ ...session }) as AdapterSession,
			};
		},
	};
};
