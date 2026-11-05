import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import { current } from "@/lib/birds/current.svelte";
import { BirdRunner } from "@/lib/birds/runner";
import BirdControls from "../../src/routes/BirdControls.svelte";

// jsdom has no 2D context; a context that accepts every call is enough for
// the renderer, which only draws.
function fakeContext(): CanvasRenderingContext2D {
  return new Proxy({} as CanvasRenderingContext2D, {
    get: () => () => {},
    set: () => true,
  });
}

function mountRunner(): BirdRunner {
  const canvas = document.createElement("canvas");
  const runner = new BirdRunner(canvas, fakeContext(), {
    width: 1280,
    height: 800,
    phase: "night",
    seed: 1,
  });
  current.runner = runner;
  return runner;
}

afterEach(() => {
  current.runner?.dispose();
  current.runner = null;
});

describe("BirdControls", () => {
  it("says so when no sky is mounted", () => {
    render(BirdControls);
    expect(screen.getByText(/No sky mounted/)).toBeInTheDocument();
  });

  it("spawns the chosen kind into the mounted runner", async () => {
    const runner = mountRunner();
    render(BirdControls);
    await fireEvent.click(screen.getByRole("button", { name: "raptor" }));
    expect(runner.events).toHaveLength(1);
    expect(runner.events[0].kind).toBe("raptor");
    await fireEvent.click(screen.getByRole("button", { name: "Clear sky" }));
    expect(runner.events).toHaveLength(0);
  });

  it("toggles the phase schedule and sets the sky phase attribute", async () => {
    const runner = mountRunner();
    render(BirdControls);
    await fireEvent.click(
      screen.getByLabelText("Phase schedule spawns events"),
    );
    expect(runner.engine.auto).toBe(false);
    await fireEvent.click(screen.getByRole("radio", { name: "sunset" }));
    expect(document.documentElement.dataset.skyPhase).toBe("sunset");
  });
});
