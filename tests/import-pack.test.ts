import { describe, expect, it } from "vitest";
import { buildPack } from "../src/lib/import-pack";

const enc = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));
const bytes = (n: number) => new Uint8Array(n);

const row = (id: string, media?: unknown) => ({
  id,
  category: "General",
  type: "text_choice",
  question: { text: `Question ${id}`, ...(media ? { media } : {}) },
  correctAnswer: "A",
  incorrectAnswers: ["B", "C", "D"],
});

const media = (url: string, credit: unknown = { licence: "cc0" }) => ({
  type: "image",
  url,
  credit,
});

const pack = (rows: unknown, files: Record<string, Uint8Array> = {}) =>
  new Map<string, Uint8Array>([
    ["questions.json", enc(rows)],
    ...Object.entries(files),
  ]);

describe("buildPack", () => {
  it("flags a row whose image is absent from the archive", () => {
    const r = buildPack(pack([row("q1", media("images/a.png"))]));
    expect(r.problems).toEqual([
      { index: 0, id: "q1", message: "missing image images/a.png" },
    ]);
  });

  it("returns the rows and one image per distinct file when the pack is good", () => {
    const r = buildPack(
      pack(
        [
          row("q1", media("images/a.png")),
          row("q2", media("images/a.png")),
          row("q3", media("images/b.webp")),
          row("q4"),
        ],
        { "images/a.png": bytes(10), "images/b.webp": bytes(20) },
      ),
    );
    expect(r.problems).toEqual([]);
    expect(r.questions).toHaveLength(4);
    expect([...r.images.keys()].sort()).toEqual([
      "images/a.png",
      "images/b.webp",
    ]);
    expect(r.images.get("images/a.png")).toMatchObject({
      name: "a.png",
      type: "image/png",
    });
    expect(r.images.get("images/b.webp")?.type).toBe("image/webp");
  });

  it("names a missing questions.json", () => {
    const r = buildPack(new Map());
    expect(r.problems).toEqual([
      { index: -1, message: "questions.json is missing" },
    ]);
  });

  it("names a questions.json that is not an array", () => {
    const r = buildPack(pack({ id: "q1" }));
    expect(r.problems[0].message).toBe("questions.json must be a JSON array");
  });

  it("refuses traversal, absolute and backslash paths", () => {
    for (const url of ["images/../x.png", "/images/a.png", "images\\a.png"]) {
      const r = buildPack(pack([row("q1", media(url))]));
      expect(r.problems).toEqual([
        { index: 0, id: "q1", message: `invalid image path ${url}` },
      ]);
    }
  });

  it("refuses an external image URL", () => {
    const r = buildPack(pack([row("q1", media("https://example.com/a.png"))]));
    expect(r.problems).toEqual([
      {
        index: 0,
        id: "q1",
        message: "image must be images/<file>, got https://example.com/a.png",
      },
    ]);
  });

  it("names an invalid credit", () => {
    const r = buildPack(
      pack([row("q1", media("images/a.png", { licence: "cc-by" }))], {
        "images/a.png": bytes(5),
      }),
    );
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0]).toMatchObject({ index: 0, id: "q1" });
    expect(r.problems[0].message).toMatch(/^invalid credit: /);
  });

  it("names an own licence, which the shared bank cannot carry", () => {
    const r = buildPack(
      pack([row("q1", media("images/a.png", { licence: "own" }))], {
        "images/a.png": bytes(5),
      }),
    );
    expect(r.problems).toEqual([
      {
        index: 0,
        id: "q1",
        message: "image needs a CC0, public domain, CC BY or CC BY-SA credit",
      },
    ]);
  });

  it("names a missing credit", () => {
    const r = buildPack(
      pack(
        [
          row("q1", {
            type: "image",
            url: "images/a.png",
          }),
        ],
        { "images/a.png": bytes(5) },
      ),
    );
    expect(r.problems[0].message).toMatch(/^invalid credit: /);
  });

  it("names an oversize image", () => {
    const r = buildPack(
      pack([row("q1", media("images/a.png"))], {
        "images/a.png": bytes(500 * 1024 + 1),
      }),
    );
    expect(r.problems).toEqual([
      {
        index: 0,
        id: "q1",
        message: "image images/a.png is over 500 KB",
      },
    ]);
  });

  it("names an unsupported extension", () => {
    const r = buildPack(
      pack([row("q1", media("images/a.gif"))], { "images/a.gif": bytes(5) }),
    );
    expect(r.problems).toEqual([
      {
        index: 0,
        id: "q1",
        message: "image images/a.gif must be jpg, png or webp",
      },
    ]);
  });
});
