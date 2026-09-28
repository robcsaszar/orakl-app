import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StorageKey } from "../src/lib/storage";
import {
  clearAllStorage,
  getStorageItem,
  removeStorageItem,
  setStorageItem,
  storage,
} from "../src/lib/storage";

describe("storage module", () => {
  beforeEach(() => {
    // Clear both storages before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("getStorageItem / setStorageItem / removeStorageItem", () => {
    it("stores persistent keys in localStorage", () => {
      setStorageItem("orakl-nickname", "Alice");
      expect(localStorage.getItem("orakl-nickname")).toBe("Alice");
      expect(sessionStorage.getItem("orakl-nickname")).toBeNull();
    });

    it("stores orakl-table-layout in localStorage, not sessionStorage", () => {
      setStorageItem("orakl-table-layout", "cards");
      expect(localStorage.getItem("orakl-table-layout")).toBe("cards");
      expect(sessionStorage.getItem("orakl-table-layout")).toBeNull();
    });

    it("stores session keys in sessionStorage", () => {
      setStorageItem("orakl-player-id", "player-123");
      expect(sessionStorage.getItem("orakl-player-id")).toBe("player-123");
      expect(localStorage.getItem("orakl-player-id")).toBeNull();
    });

    it("retrieves persistent keys from localStorage", () => {
      localStorage.setItem("orakl-avatar", "avatar-1");
      expect(getStorageItem("orakl-avatar")).toBe("avatar-1");
    });

    it("retrieves session keys from sessionStorage", () => {
      sessionStorage.setItem("orakl-player-id", "player-123");
      expect(getStorageItem("orakl-player-id")).toBe("player-123");
    });

    it("returns null when key not found", () => {
      expect(getStorageItem("orakl-nickname")).toBeNull();
      expect(getStorageItem("orakl-player-id")).toBeNull();
    });

    it("removes persistent keys from localStorage", () => {
      setStorageItem("orakl-nickname", "Alice");
      removeStorageItem("orakl-nickname");
      expect(localStorage.getItem("orakl-nickname")).toBeNull();
    });

    it("removes session keys from sessionStorage", () => {
      setStorageItem("orakl-quiz-config", '{"key":"value"}');
      removeStorageItem("orakl-quiz-config");
      expect(sessionStorage.getItem("orakl-quiz-config")).toBeNull();
    });
  });

  describe("clearAllStorage", () => {
    it("clears all Orakl-related storage items", () => {
      setStorageItem("orakl-nickname", "Alice");
      setStorageItem("orakl-avatar", "avatar-1");
      setStorageItem("orakl-player-id", "player-123");
      setStorageItem("orakl-quiz-config", "{}");

      clearAllStorage();

      expect(getStorageItem("orakl-nickname")).toBeNull();
      expect(getStorageItem("orakl-avatar")).toBeNull();
      expect(getStorageItem("orakl-player-id")).toBeNull();
      expect(getStorageItem("orakl-quiz-config")).toBeNull();
    });
  });

  describe("typed storage object", () => {
    it("gets/sets nickname", () => {
      expect(storage.getNickname()).toBeNull();
      storage.setNickname("Bob");
      expect(storage.getNickname()).toBe("Bob");
      storage.removeNickname();
      expect(storage.getNickname()).toBeNull();
    });

    it("gets/sets avatar", () => {
      expect(storage.getAvatar()).toBeNull();
      storage.setAvatar("avatar-2");
      expect(storage.getAvatar()).toBe("avatar-2");
      storage.removeAvatar();
      expect(storage.getAvatar()).toBeNull();
    });

    it("gets/sets playerId", () => {
      expect(storage.getPlayerId()).toBeNull();
      storage.setPlayerId("player-456");
      expect(storage.getPlayerId()).toBe("player-456");
      storage.removePlayerId();
      expect(storage.getPlayerId()).toBeNull();
    });

    it("gets/sets castId", () => {
      expect(storage.getCastId()).toBeNull();
      storage.setCastId("cast-123");
      expect(storage.getCastId()).toBe("cast-123");
      storage.removeCastId();
      expect(storage.getCastId()).toBeNull();
    });

    it("gets/sets quizConfig", () => {
      const config = '{"quizId":"123"}';
      expect(storage.getQuizConfig()).toBeNull();
      storage.setQuizConfig(config);
      expect(storage.getQuizConfig()).toBe(config);
      storage.removeQuizConfig();
      expect(storage.getQuizConfig()).toBeNull();
    });

    it("gets/sets soloState in sessionStorage", () => {
      const state = '{"score":100}';
      expect(storage.getSoloState()).toBeNull();
      storage.setSoloState(state);
      expect(storage.getSoloState()).toBe(state);
      expect(sessionStorage.getItem("solo:state")).toBe(state);
      storage.removeSoloState();
      expect(storage.getSoloState()).toBeNull();
    });

    it("gets/sets deviceId in localStorage", () => {
      expect(storage.getDeviceId()).toBeNull();
      storage.setDeviceId("device-123");
      expect(storage.getDeviceId()).toBe("device-123");
      expect(localStorage.getItem("orakl-device-id")).toBe("device-123");
    });

    it("rejects the dead solo-mode-state key at the type level", () => {
      // @ts-expect-error "solo-mode-state" is not a StorageKey
      const key: StorageKey = "solo-mode-state";
      expect(key).toBe("solo-mode-state");
    });

    it("supports default values", () => {
      expect(storage.getNickname("default")).toBe("default");
      storage.setNickname("Alice");
      expect(storage.getNickname("default")).toBe("Alice");
    });

    it("normalises a stored legacy hero role to player", () => {
      storage.setRole("hero");
      expect(storage.getRole()).toBe("player");
    });

    it("reads a stored observer role as observer", () => {
      storage.setRole("observer");
      expect(storage.getRole()).toBe("observer");
    });

    it("reads unrecognised stored role values as null", () => {
      storage.setRole("garbage");
      expect(storage.getRole()).toBeNull();
    });
  });

  describe("error handling", () => {
    it("silently handles storage errors", () => {
      const mockLS = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("Storage full");
        });

      // Should not throw
      expect(() => {
        setStorageItem("orakl-nickname", "test");
      }).not.toThrow();

      mockLS.mockRestore();
    });

    it("silently handles retrieval errors", () => {
      const mockLS = vi
        .spyOn(Storage.prototype, "getItem")
        .mockImplementation(() => {
          throw new Error("Storage error");
        });

      expect(getStorageItem("orakl-nickname")).toBeNull();

      mockLS.mockRestore();
    });
  });
});
