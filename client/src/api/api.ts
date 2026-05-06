import type { UpResponse } from "./types";

const API_URL: string = "http://localhost:5250/api";

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
  }

  return ({ up: false } as UpResponse);
}

export const parseErrorMessage = async (response: Response): Promise<string> => {
  const body = await (response.json() as Promise<unknown>).catch(() => null);
  const message = (body as Record<string, unknown>)?.message;
  return typeof message === "string"
    ? message
    : `API error: ${response.status} ${response.statusText}`;
};
