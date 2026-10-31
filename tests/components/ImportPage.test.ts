import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { strToU8, zipSync } from "fflate";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ImportPage from "../../src/routes/(game)/manage/import/ImportPage.svelte";

const row = (media?: unknown) => ({
  id: "q1",
  category: "General",
  type: "text_choice",
  question: { text: "Which bird?", ...(media ? { media } : {}) },
  correctAnswer: "Owl",
  incorrectAnswers: ["Crow", "Rook", "Jay"],
});

const media = {
  type: "image",
  url: "images/a.png",
  credit: { licence: "cc0" },
};

function zipFile(files: Record<string, Uint8Array>) {
  const bytes = zipSync(files);
  const file = new File([bytes], "pack.zip", { type: "application/zip" });
  // jsdom's File has no arrayBuffer
  file.arrayBuffer = async () => bytes.buffer.slice(0) as ArrayBuffer;
  return file;
}

async function pick(file: File) {
  const input = document.querySelector<HTMLInputElement>("input[type=file]");
  if (!input) throw new Error("no file input");
  await fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:thumb");
  URL.revokeObjectURL = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ existingCount: 0 }))),
  );
});

describe("ImportPage zip", () => {
  it("lists a missing image and keeps Import disabled", async () => {
    render(ImportPage);
    await pick(
      zipFile({ "questions.json": strToU8(JSON.stringify([row(media)])) }),
    );
    await waitFor(() =>
      expect(screen.getByText(/missing image images\/a\.png/)).toBeTruthy(),
    );
    const button = screen.getByRole("button", { name: /^Import/ });
    expect(button).toBeDisabled();
  });

  it("enables Import for a complete pack and shows the credit", async () => {
    render(ImportPage);
    await pick(
      zipFile({
        "questions.json": strToU8(JSON.stringify([row(media)])),
        "images/a.png": new Uint8Array([1, 2, 3]),
      }),
    );
    await waitFor(() => expect(screen.getByText("CC0")).toBeTruthy());
    expect(
      screen.getByRole("button", { name: /^Import 1 questions/ }),
    ).toBeEnabled();
  });

  it("shows the Ready to import badge for a clean pack", async () => {
    render(ImportPage);
    await pick(
      zipFile({
        "questions.json": strToU8(JSON.stringify([row(media)])),
        "images/a.png": new Uint8Array([1, 2, 3]),
      }),
    );
    await waitFor(() =>
      expect(screen.getByText("Ready to import")).toBeTruthy(),
    );
  });

  it("lists every pack problem, not only the first ten", async () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      ...row({ ...media, url: `images/m${i}.png` }),
      id: `q${i}`,
    }));
    render(ImportPage);
    await pick(zipFile({ "questions.json": strToU8(JSON.stringify(rows)) }));
    await waitFor(() =>
      expect(screen.getByText(/missing image images\/m11\.png/)).toBeTruthy(),
    );
    expect(screen.queryByText(/and \d+ more/)).toBeNull();
  });

  it("reserves a tile for a row without a thumbnail", async () => {
    render(ImportPage);
    await pick(
      zipFile({ "questions.json": strToU8(JSON.stringify([row(media)])) }),
    );
    await waitFor(() =>
      expect(screen.getAllByText("Which bird?").length).toBeGreaterThan(0),
    );
    expect(document.querySelectorAll("img").length).toBe(0);
    expect(
      document.querySelectorAll('div[aria-hidden="true"].size-12').length,
    ).toBe(1);
  });

  it("shows image progress and the wait on a 429", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let uploads = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/manage/import-image") {
          uploads++;
          if (uploads === 1)
            return new Response("{}", {
              status: 429,
              headers: { "Retry-After": "7" },
            });
          return new Response(JSON.stringify({ url: "https://cdn/a.png" }));
        }
        return new Response(
          JSON.stringify({
            existingCount: 0,
            inserted: 1,
            skipped: 0,
            duplicates: 0,
          }),
        );
      }),
    );
    render(ImportPage);
    await pick(
      zipFile({
        "questions.json": strToU8(JSON.stringify([row(media)])),
        "images/a.png": new Uint8Array([1, 2, 3]),
      }),
    );
    const button = await screen.findByRole("button", {
      name: /^Import 1 questions/,
    });
    await waitFor(() => expect(button).toBeEnabled());
    await fireEvent.click(button);
    await waitFor(() =>
      expect(
        screen.getByText("Upload limit reached. Waiting 7 s…"),
      ).toBeTruthy(),
    );
    const live = screen.getByText("Uploading images 0 / 1", {
      selector: "span",
    });
    expect(live.parentElement?.getAttribute("aria-live")).toBe("polite");
    await vi.advanceTimersByTimeAsync(7000);
    vi.useRealTimers();
  });
});
