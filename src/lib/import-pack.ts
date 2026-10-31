import { DISTRIBUTABLE_LICENCES, MediaCreditSchema } from "@orakl/shared";
import { Schema } from "effect";

/** Per-image cap, the same 500 KB the upload endpoints enforce. */
const MAX_PACK_IMAGE_BYTES = 500 * 1024;

const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export interface PackProblem {
  /** Row index in `questions.json`; -1 when the problem is the archive's. */
  index: number;
  id?: string;
  message: string;
}

export interface PackImage {
  name: string;
  bytes: Uint8Array;
  type: string;
}

export interface BuiltPack {
  questions: unknown[];
  images: Map<string, PackImage>;
  problems: PackProblem[];
}

const decodeCredit = Schema.decodeUnknownEither(MediaCreditSchema);

/** A path with no traversal, absolute or backslash form. */
function isSafePath(path: string): boolean {
  if (path.includes("\\") || path.startsWith("/")) return false;
  return path.split("/").every((p) => p !== ".." && p !== ".");
}

/**
 * Checks an unzipped pack (`questions.json` plus `images/<file>`) before
 * anything uploads. Rows come back untouched; the caller uploads `images` and
 * rewrites each `question.media.url` to the stored URL.
 */
export function buildPack(entries: Map<string, Uint8Array>): BuiltPack {
  const images = new Map<string, PackImage>();
  const problems: PackProblem[] = [];
  const fail = (message: string): BuiltPack => ({
    questions: [],
    images,
    problems: [...problems, { index: -1, message }],
  });

  const raw = entries.get("questions.json");
  if (!raw) return fail("questions.json is missing");

  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return fail("questions.json is not valid JSON");
  }
  if (!Array.isArray(data)) return fail("questions.json must be a JSON array");

  data.forEach((row, index) => {
    const q = row as { id?: unknown; question?: { media?: unknown } } | null;
    const media = q?.question?.media as
      | { url?: unknown; credit?: unknown }
      | undefined;
    if (!media || typeof media !== "object" || media.url === undefined) return;

    const id = typeof q?.id === "string" ? q.id : undefined;
    const problem = (message: string): void => {
      problems.push({ index, ...(id ? { id } : {}), message });
    };

    const url = media.url;
    if (typeof url !== "string") {
      problem("image must be images/<file>");
      return;
    }
    if (!isSafePath(url)) {
      problem(`invalid image path ${url}`);
      return;
    }
    if (!url.startsWith("images/") || url.endsWith("/")) {
      problem(`image must be images/<file>, got ${url}`);
      return;
    }

    const ext = url.slice(url.lastIndexOf(".") + 1).toLowerCase();
    const type = url.includes(".") ? IMAGE_TYPES[ext] : undefined;
    if (!type) {
      problem(`image ${url} must be jpg, png or webp`);
      return;
    }

    const bytes = entries.get(url);
    if (!bytes) {
      problem(`missing image ${url}`);
      return;
    }
    if (bytes.byteLength > MAX_PACK_IMAGE_BYTES) {
      problem(`image ${url} is over 500 KB`);
      return;
    }

    const credit = decodeCredit(media.credit);
    if (credit._tag === "Left") {
      problem(`invalid credit: ${credit.left.message}`);
      return;
    }
    // Imported rows join the shared bank (map #1570, decision 5).
    if (!DISTRIBUTABLE_LICENCES.includes(credit.right.licence)) {
      problem("image needs a CC0, public domain, CC BY or CC BY-SA credit");
      return;
    }

    if (!images.has(url)) {
      images.set(url, {
        name: url.slice(url.lastIndexOf("/") + 1),
        bytes,
        type,
      });
    }
  });

  return { questions: data, images, problems };
}
