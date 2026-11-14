import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import { current } from "@/lib/birds/current.svelte";
import { birdLab } from "@/lib/birds/lab.svelte";
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
  localStorage.clear();
  current.runner?.dispose();
  current.runner = null;
});

describe("BirdControls", () => {
  it("says so when no sky is mounted", () => {
    render(BirdControls);
    expect(
      screen.getByText(/There are no birds on this page/),
    ).toBeInTheDocument();
  });

  it("sends the chosen kind into the mounted runner, again, and clears it", async () => {
    const runner = mountRunner();
    render(BirdControls);
    await fireEvent.click(screen.getByRole("radio", { name: /^Hawk/ }));
    await fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(runner.events).toHaveLength(1);
    expect(runner.events[0].kind).toBe("raptor");
    await fireEvent.click(screen.getByRole("button", { name: "Clear sky" }));
    expect(runner.events).toHaveLength(0);
    await fireEvent.click(
      screen.getByRole("button", { name: "Send same again" }),
    );
    expect(runner.events[0]?.kind).toBe("raptor");
  });

  it("turns the schedule off and sets the sky phase attribute", async () => {
    const runner = mountRunner();
    render(BirdControls);
    await fireEvent.click(
      screen.getByRole("switch", { name: "Flocks come by themselves" }),
    );
    expect(runner.engine.auto).toBe(false);
    await fireEvent.click(screen.getByRole("radio", { name: "Sunset" }));
    expect(document.documentElement.dataset.skyPhase).toBe("sunset");
  });

  it("lends the sky its settings while mounted, and a changed one can be undone", async () => {
    mountRunner();
    const { unmount } = render(BirdControls);
    expect(birdLab.active).toBe(true);
    await fireEvent.click(screen.getByRole("tab", { name: "Look" }));
    const size = screen.getByRole("slider", { name: "Size" });
    const was = birdLab.settings.scale;
    await fireEvent.input(size, { target: { value: String(was * 2) } });
    expect(birdLab.settings.scale).toBe(was * 2);
    await fireEvent.click(screen.getByRole("button", { name: /^Undo/ }));
    expect(birdLab.settings.scale).toBe(was);
    unmount();
    expect(birdLab.active).toBe(false);
  });
});
