// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { load } from "../../src/routes/(game)/quiz/play/+page.js";

function playingFetch() {
  return vi.fn(async () =>
    Response.json({
      membership: "active",
      phase: "playing",
      state: "playing",
      route: "/quiz/play",
      miss: null,
    }),
  ) as unknown as typeof fetch;
}

describe("/quiz/play load — state seed", () => {
  it("returns the layout's stateMessages so a deep link paints the live question", async () => {
    const stateMessages = [{ type: "game:question", text: "Q?" }];
    const result = await load({
      fetch: playingFetch(),
      parent: async () => ({ stateMessages }),
    } as never);
    expect(result).toEqual({ stateMessages });
  });

  it("returns an empty seed when the layout carried none", async () => {
    const result = await load({
      fetch: playingFetch(),
      parent: async () => ({ stateMessages: [] }),
    } as never);
    expect(result).toEqual({ stateMessages: [] });
  });

  it("still enforces the journey gate before reading the seed", async () => {
    const fetchFn = playingFetch();
    const parent = vi.fn(async () => ({ stateMessages: [] }));
    await load({ fetch: fetchFn, parent } as never);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(parent).toHaveBeenCalledTimes(1);
  });
});
