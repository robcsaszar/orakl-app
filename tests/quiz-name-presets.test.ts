import { describe, expect, it } from "vitest";
import { generateRandomPreset } from "../src/lib/quiz-name-presets.js";

describe("quiz-name-presets", () => {
  it("returns a non-empty title and description", () => {
    const preset = generateRandomPreset();
    expect(preset.title).toBeTruthy();
    expect(preset.description).toBeTruthy();
  });

  it("title is under 60 characters", () => {
    for (let i = 0; i < 200; i++) {
      const { title } = generateRandomPreset();
      expect(title.length).toBeLessThanOrEqual(60);
    }
  });

  it("description is under 200 characters", () => {
    for (let i = 0; i < 200; i++) {
      const { description } = generateRandomPreset();
      expect(description.length).toBeLessThanOrEqual(200);
    }
  });
});
