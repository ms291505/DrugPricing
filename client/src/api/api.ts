import { ApiError } from "../library/apiErrors";
import type { UpResponse } from "./types";

const API_URL = import.meta.env.VITE_API_URL;

export const createApiPath = (segment: string = "") => {
  if (segment == "") return `${API_URL}/`;
  let clean = segment;
  if (clean.charAt(0) === "/") {
    clean = clean.slice(1);
  }

  const apiPath = `${API_URL}/${segment}`;

  console.log(apiPath);

  return apiPath;
}

export const isApiUp = async (): Promise<UpResponse> => {
  const response = await fetch(createApiPath("up"), {
    method: "GET",
  });

  if (response.ok) {
    const upResponse = await response.json() as unknown as UpResponse;
    return upResponse;
  } else { return ({ up: false } as UpResponse); }
}

/** The failed response as an `ApiError`: the server's `message` and `code`, when it sent them. */
export const toApiError = async (response: Response): Promise<ApiError> => {
  const body = await (response.json() as Promise<unknown>).catch(() => null);
  const { message, code } = (body ?? {}) as Record<string, unknown>;
  return new ApiError(
    typeof message === "string" ? message : `API error: ${response.status} ${response.statusText}`,
    response.status,
    typeof code === "string" ? code : undefined,
  );
};
