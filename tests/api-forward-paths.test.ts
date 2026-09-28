// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  FORWARDED_API_PATHS,
  FORWARDED_API_PREFIXES,
  isForwardedApiPath,
} from "../src/lib/api-forward-paths.js";

describe("isForwardedApiPath", () => {
  it("matches every exact path and nothing beneath it", () => {
    for (const path of FORWARDED_API_PATHS) {
      expect(isForwardedApiPath(path), path).toBe(true);
    }
    expect(isForwardedApiPath("/api/lobby/other")).toBe(false);
    expect(isForwardedApiPath("/api/nothing")).toBe(false);
  });

  it("matches a prefix group at its root and under it, never a lookalike", () => {
    for (const prefix of FORWARDED_API_PREFIXES) {
      expect(prefix.endsWith("/"), prefix).toBe(true);
      expect(isForwardedApiPath(prefix.slice(0, -1))).toBe(true);
      expect(isForwardedApiPath(`${prefix}anything/deeper`)).toBe(true);
      expect(isForwardedApiPath(`${prefix.slice(0, -1)}-lookalike`)).toBe(
        false,
      );
    }
  });
});
