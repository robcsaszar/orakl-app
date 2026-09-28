import { describe, expect, it } from "vitest";
import { createCountdown, dispatchGameFrame, WsClient } from "../src/index.js";

describe("index exports", () => {
  it("exports dispatchGameFrame, createCountdown, WsClient as functions", () => {
    expect(typeof dispatchGameFrame).toBe("function");
    expect(typeof createCountdown).toBe("function");
    expect(typeof WsClient).toBe("function");
  });
});
