// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getNativeAuthToken,
  isNativePlatform,
  NATIVE_TOKEN_KEY,
} from "../src/lib/native-auth.js";

type Win = {
  Capacitor?: { isNativePlatform?: () => boolean };
  localStorage?: Storage;
};

function setNative(isNative: boolean) {
  (globalThis as unknown as { window: Win }).window.Capacitor = {
    isNativePlatform: () => isNative,
  };
}

describe("native-auth", () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    const localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        store = {};
      },
      key: () => null,
      length: 0,
    } as unknown as Storage;
    (globalThis as unknown as { window: Win }).window = { localStorage };
  });

  afterEach(() => {
    (globalThis as unknown as { window?: Win }).window = undefined;
  });

  describe("isNativePlatform", () => {
    it("true inside a Capacitor native WebView", () => {
      setNative(true);
      expect(isNativePlatform()).toBe(true);
    });

    it("false when Capacitor is absent (web)", () => {
      expect(isNativePlatform()).toBe(false);
    });

    it("false when Capacitor reports web", () => {
      setNative(false);
      expect(isNativePlatform()).toBe(false);
    });
  });

  describe("getNativeAuthToken", () => {
    it("returns the stored token when native", () => {
      setNative(true);
      store[NATIVE_TOKEN_KEY] = "tok-123";
      expect(getNativeAuthToken()).toBe("tok-123");
    });

    it("null when native but no token stored", () => {
      setNative(true);
      expect(getNativeAuthToken()).toBeNull();
    });

    it("null on web even if a token sits in localStorage", () => {
      // Web auth is the HttpOnly cookie; never source a token from JS storage.
      store[NATIVE_TOKEN_KEY] = "should-be-ignored";
      expect(getNativeAuthToken()).toBeNull();
    });
  });
});
