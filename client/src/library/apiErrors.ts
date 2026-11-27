/** The `code` the server sends when a search matches more rows than it will return. */
export const TOO_MANY_ROWS = "too-many-rows";

/** React Query's default number of retries, kept for errors a retry might fix. */
const MAX_RETRIES = 3;

/** A failed API response: its HTTP status, and the server's error `code` when it sent one. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** The server refused the search as too large: the page shows its message instead of results. */
export function isTooManyRows(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === TOO_MANY_ROWS;
}

/**
 * React Query's `retry`: never for a 4xx, which the same request gets again, else up to 3 times
 * as by default (a network failure or a 5xx might pass the next time).
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}
