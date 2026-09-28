/**
 * Centralized, typed localStorage/sessionStorage access.
 * Provides compile-time safety for all storage keys used across the app.
 */

export type StorageKey =
  | "orakl-nickname"
  | "orakl-avatar"
  | "orakl-player-id"
  | "orakl-lobby-code"
  | "orakl-cast-id"
  | "orakl-quiz-config"
  | "orakl-role"
  | "orakl-notice-seen"
  | "orakl-toolbox-rail"
  | "orakl-device-id"
  | "orakl-table-layout"
  | "solo:state";

const PERSISTENT_KEYS: Set<StorageKey> = new Set([
  "orakl-nickname",
  "orakl-avatar",
  "orakl-role",
  // Collection points whose use-case notice has already shone (decision #13).
  "orakl-notice-seen",
  "orakl-device-id",
  // Table-vs-cards choice shared by every DataGrid; absent = follow device.
  "orakl-table-layout",
]);

const SESSION_KEYS: Set<StorageKey> = new Set([
  "orakl-player-id",
  "orakl-lobby-code",
  "orakl-cast-id",
  "orakl-quiz-config",
  "orakl-toolbox-rail",
  "solo:state",
]);

/**
 * Get item from appropriate storage (persistent localStorage or sessionStorage).
 * Returns null if not found.
 */
export function getStorageItem(key: StorageKey): string | null {
  try {
    if (PERSISTENT_KEYS.has(key)) {
      return localStorage.getItem(key);
    }
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Set item in appropriate storage (persistent localStorage or sessionStorage).
 */
export function setStorageItem(key: StorageKey, value: string): void {
  try {
    if (PERSISTENT_KEYS.has(key)) {
      localStorage.setItem(key, value);
    } else {
      sessionStorage.setItem(key, value);
    }
  } catch {
    // Silently fail if storage full or unavailable
  }
}

/**
 * Remove item from appropriate storage.
 */
export function removeStorageItem(key: StorageKey): void {
  try {
    if (PERSISTENT_KEYS.has(key)) {
      localStorage.removeItem(key);
    } else {
      sessionStorage.removeItem(key);
    }
  } catch {
    // Silently fail
  }
}

/**
 * Clear all Orakl-related items from both storages.
 */
export function clearAllStorage(): void {
  try {
    [...PERSISTENT_KEYS, ...SESSION_KEYS].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch {
    // Silently fail
  }
}

/**
 * Typed getters with optional defaults.
 */
export const storage = {
  getNickname: (def?: string) =>
    getStorageItem("orakl-nickname") ?? def ?? null,
  setNickname: (value: string) => setStorageItem("orakl-nickname", value),
  removeNickname: () => removeStorageItem("orakl-nickname"),

  getAvatar: (def?: string) => getStorageItem("orakl-avatar") ?? def ?? null,
  setAvatar: (value: string) => setStorageItem("orakl-avatar", value),
  removeAvatar: () => removeStorageItem("orakl-avatar"),

  getPlayerId: (def?: string) =>
    getStorageItem("orakl-player-id") ?? def ?? null,
  setPlayerId: (value: string) => setStorageItem("orakl-player-id", value),
  removePlayerId: () => removeStorageItem("orakl-player-id"),

  getLobbyCode: (def?: string) =>
    getStorageItem("orakl-lobby-code") ?? def ?? null,
  setLobbyCode: (value: string) => setStorageItem("orakl-lobby-code", value),
  removeLobbyCode: () => removeStorageItem("orakl-lobby-code"),

  getCastId: (def?: string) => getStorageItem("orakl-cast-id") ?? def ?? null,
  setCastId: (value: string) => setStorageItem("orakl-cast-id", value),
  removeCastId: () => removeStorageItem("orakl-cast-id"),

  getQuizConfig: (def?: string) =>
    getStorageItem("orakl-quiz-config") ?? def ?? null,
  setQuizConfig: (value: string) => setStorageItem("orakl-quiz-config", value),
  removeQuizConfig: () => removeStorageItem("orakl-quiz-config"),

  getSoloState: (def?: string) => getStorageItem("solo:state") ?? def ?? null,
  setSoloState: (value: string) => setStorageItem("solo:state", value),
  removeSoloState: () => removeStorageItem("solo:state"),

  getDeviceId: (def?: string) =>
    getStorageItem("orakl-device-id") ?? def ?? null,
  setDeviceId: (value: string) => setStorageItem("orakl-device-id", value),

  /** Reads the stored role, tolerating a pre-rename "hero" value by
   *  normalising it to "player"; any other unrecognised value reads as null. */
  getRole: (): "player" | "observer" | null => {
    const raw = getStorageItem("orakl-role");
    if (raw === "hero") return "player";
    if (raw === "player" || raw === "observer") return raw;
    return null;
  },
  setRole: (value: string) => setStorageItem("orakl-role", value),
};
