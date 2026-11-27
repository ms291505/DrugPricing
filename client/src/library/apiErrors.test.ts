import { describe, expect, it } from "vitest";
import { ApiError, isTooManyRows, shouldRetry, TOO_MANY_ROWS } from "./apiErrors";

describe("isTooManyRows", () => {
  it("is true only for an ApiError with the too-many-rows code", () => {
    expect(isTooManyRows(new ApiError("Too many", 422, TOO_MANY_ROWS))).toBe(true);
    expect(isTooManyRows(new ApiError("Bad NDC", 400))).toBe(false);
    expect(isTooManyRows(new ApiError("Other", 422, "something-else"))).toBe(false);
    expect(isTooManyRows(new Error("Too many"))).toBe(false);
    expect(isTooManyRows(null)).toBe(false);
  });
});

describe("shouldRetry", () => {
  it("never retries a 4xx", () => {
    expect(shouldRetry(0, new ApiError("Bad", 400))).toBe(false);
    expect(shouldRetry(0, new ApiError("Too many", 422, TOO_MANY_ROWS))).toBe(false);
    expect(shouldRetry(0, new ApiError("Missing", 404))).toBe(false);
  });

  it("retries other failures up to 3 times", () => {
    for (const error of [new ApiError("Down", 500), new ApiError("Gateway", 502), new TypeError("Failed to fetch")]) {
      expect(shouldRetry(0, error)).toBe(true);
      expect(shouldRetry(2, error)).toBe(true);
      expect(shouldRetry(3, error)).toBe(false);
    }
  });
});
