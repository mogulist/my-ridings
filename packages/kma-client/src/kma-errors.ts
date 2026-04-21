export class KmaApiError extends Error {
	public readonly code?: string;
	public readonly raw?: unknown;

	constructor(message: string, options?: { code?: string; raw?: unknown }) {
		super(message);
		this.name = "KmaApiError";
		this.code = options?.code;
		this.raw = options?.raw;
	}
}
