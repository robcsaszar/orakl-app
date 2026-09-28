import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { serializeCast } from "../../src/lib/mock/cast.js";
import DevToolbar from "../../src/routes/mimic/DevToolbar.svelte";

const CAST_20 = serializeCast(
  Array.from({ length: 20 }, (_, i) => ({
    nickname: `P${i}`,
    role: "player" as const,
  })),
);

let url = new URL("http://localhost/mimic/quiz/play");

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));
vi.mock("$app/state", () => ({
  page: {
    get url() {
      return url;
    },
    data: {},
  },
}));

import { goto } from "$app/navigation";

// jsdom has no setPointerCapture — the FAB's drag handling calls it on tap.
Element.prototype.setPointerCapture = vi.fn();

function setUrl(search: string) {
  url = new URL(`http://localhost/mimic/quiz/play${search}`);
}

async function openPanel() {
  render(DevToolbar);
  const fab = screen.getByRole("button", { name: "Open dev toolbar" });
  await fireEvent.pointerDown(fab, { pointerId: 1, clientX: 0, clientY: 0 });
  await fireEvent.pointerUp(fab, { pointerId: 1, clientX: 0, clientY: 0 });
}

describe("DevToolbar — players (cast)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUrl("");
  });

  it("renders one row per cast entry", async () => {
    setUrl(`?cast=${encodeURIComponent("Athena:player,Hermes:observer")}`);
    await openPanel();

    expect(screen.getByDisplayValue("Athena")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hermes")).toBeInTheDocument();
  });

  it("clicking Add player calls goto with one more row in cast", async () => {
    setUrl(`?cast=${encodeURIComponent("Athena:player,Hermes:observer")}`);
    await openPanel();

    await fireEvent.click(screen.getByRole("button", { name: "Add player" }));

    expect(goto).toHaveBeenCalled();
    const [calledUrl] = vi.mocked(goto).mock.calls.at(-1) as [string];
    const cast = new URL(calledUrl).searchParams.get("cast") ?? "";
    expect(cast.split(",")).toHaveLength(3);
  });

  it("disables Add player at the 20-row cap", async () => {
    setUrl(`?cast=${encodeURIComponent(CAST_20)}`);
    await openPanel();

    expect(screen.getByRole("button", { name: "Add player" })).toBeDisabled();
  });

  it("clicking Remove <nick> calls goto with that row gone", async () => {
    setUrl(`?cast=${encodeURIComponent("Athena:player,Hermes:observer")}`);
    await openPanel();

    await fireEvent.click(
      screen.getByRole("button", { name: "Remove Hermes" }),
    );

    expect(goto).toHaveBeenCalled();
    const [calledUrl] = vi.mocked(goto).mock.calls.at(-1) as [string];
    const cast = new URL(calledUrl).searchParams.get("cast") ?? "";
    expect(decodeURIComponent(cast)).toBe("Athena:player");
  });

  it("editing a nickname input writes the new name into cast", async () => {
    setUrl(`?cast=${encodeURIComponent("Athena:player,Hermes:observer")}`);
    await openPanel();

    const input = screen.getByDisplayValue("Athena");
    await fireEvent.change(input, { target: { value: "Renamed" } });

    expect(goto).toHaveBeenCalled();
    const [calledUrl] = vi.mocked(goto).mock.calls.at(-1) as [string];
    const cast = new URL(calledUrl).searchParams.get("cast") ?? "";
    expect(decodeURIComponent(cast)).toBe("Renamed:player,Hermes:observer");
  });
});
