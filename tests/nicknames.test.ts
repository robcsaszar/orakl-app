import { describe, expect, it } from "vitest";
import { GAME } from "../data/game.settings.js";
import list from "../data/nicknames.json";
import { randomNickname } from "../src/lib/nicknames.js";

describe("randomNickname", () => {
  it("draws from the list", () => {
    expect(randomNickname(["Noodle", "Chonk"], "", () => 0)).toBe("Noodle");
    expect(randomNickname(["Noodle", "Chonk"], "", () => 0.99)).toBe("Chonk");
  });

  it("never repeats the current nickname when another exists", () => {
    for (const r of [0, 0.3, 0.6, 0.99]) {
      expect(randomNickname(["Noodle", "Chonk"], "Noodle", () => r)).toBe(
        "Chonk",
      );
    }
  });

  it("returns the only entry even if it is the current one", () => {
    expect(randomNickname(["Noodle"], "Noodle", () => 0)).toBe("Noodle");
  });

  it("skips entries over the nickname length limit", () => {
    const long = "x".repeat(GAME.player.maxNicknameLength + 1);
    expect(randomNickname([long, "Chonk"], "", () => 0)).toBe("Chonk");
  });
});

describe("data/nicknames.json", () => {
  it("is a list of unique strings within the length limit", () => {
    expect(list.length).toBeGreaterThan(1);
    expect(new Set(list).size).toBe(list.length);
    for (const n of list) {
      expect(typeof n).toBe("string");
      expect(n.trim().length).toBeGreaterThan(0);
      expect(n.length).toBeLessThanOrEqual(GAME.player.maxNicknameLength);
    }
  });
});
