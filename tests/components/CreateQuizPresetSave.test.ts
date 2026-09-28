import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { goto } from "$app/navigation";
import { storage } from "../../src/lib/storage.js";
import { toast } from "../../src/lib/toast.js";
import CreateQuiz from "../../src/routes/(game)/curator/create/CreateQuiz.svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const categories = [{ id: "general", name: "General", count: 40 }];

type Reply = { status: number; body?: unknown };

function stubFetch(lobby: Reply, preset: Reply) {
  const fetchMock = vi.fn(async (url: string) => {
    const reply = url === "/api/lobby" ? lobby : preset;
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const presetCalls = (fetchMock: ReturnType<typeof stubFetch>) =>
  fetchMock.mock.calls.filter(([url]) => url === "/api/curator/presets");

async function hostWithPresetBox(checked: boolean) {
  render(CreateQuiz, {
    props: {
      categories,
      categoryColors: {},
      presets: [],
      presetLimit: 10,
      quizPresets: true,
    } as never,
  });
  const box = screen.getByLabelText(/^Save as preset/) as HTMLInputElement;
  if (box.checked !== checked) await fireEvent.click(box);
  await fireEvent.submit(document.getElementById("create-quiz-form")!);
}

describe("Host quiz saves the preset", () => {
  beforeEach(() => {
    storage.setQuizConfig(
      JSON.stringify({ name: "Pub night", categoryIds: ["general"] }),
    );
  });

  afterEach(() => {
    storage.removeQuizConfig();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("saves when the lobby is new", async () => {
    const fetchMock = stubFetch(
      { status: 201, body: { code: "ABCD" } },
      { status: 201, body: { id: "p1" } },
    );
    await hostWithPresetBox(true);
    await waitFor(() => expect(goto).toHaveBeenCalled());
    expect(presetCalls(fetchMock)).toHaveLength(1);
  });

  it("saves when hosting over an existing lobby", async () => {
    const fetchMock = stubFetch(
      { status: 200, body: { code: "ABCD" } },
      { status: 201, body: { id: "p1" } },
    );
    await hostWithPresetBox(true);
    await waitFor(() => expect(goto).toHaveBeenCalled());
    expect(presetCalls(fetchMock)).toHaveLength(1);
    const body = JSON.parse(presetCalls(fetchMock)[0][1]?.body as string);
    expect(body.name).toBe("Pub night");
  });

  it("finishes the save before leaving the page", async () => {
    let settle: (r: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url === "/api/lobby"
          ? Promise.resolve(
              new Response(JSON.stringify({ code: "ABCD" }), { status: 201 }),
            )
          : new Promise<Response>((resolve) => {
              settle = resolve;
            }),
      ),
    );
    await hostWithPresetBox(true);
    await new Promise((r) => setTimeout(r, 20));
    expect(goto).not.toHaveBeenCalled();
    settle(new Response(JSON.stringify({ id: "p1" }), { status: 201 }));
    await waitFor(() => expect(goto).toHaveBeenCalled());
  });

  it("says so when the save fails, and still opens the lobby", async () => {
    stubFetch(
      { status: 201, body: { code: "ABCD" } },
      { status: 422, body: { error: "Preset limit reached" } },
    );
    await hostWithPresetBox(true);
    await waitFor(() => expect(goto).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith(
      "Quiz hosted, but the preset was not saved",
    );
  });

  it("does not save with the box unticked", async () => {
    const fetchMock = stubFetch(
      { status: 201, body: { code: "ABCD" } },
      { status: 201, body: { id: "p1" } },
    );
    await hostWithPresetBox(false);
    await waitFor(() => expect(goto).toHaveBeenCalled());
    expect(presetCalls(fetchMock)).toHaveLength(0);
  });
});
