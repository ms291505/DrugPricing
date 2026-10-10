import { createApiPath, parseErrorMessage } from "./api";
import { mapAppInitResponse, type AppInit, type AppInitResponse } from "./types";

export const getAppInit = async (): Promise<AppInit> => {
  const response = await fetch(createApiPath("app-init"), { method: "GET" });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return mapAppInitResponse(await response.json() as AppInitResponse);
};
