import { describe, expect, it } from "vitest";
import {
  anchorFor,
  CONTACT,
  LEDGER,
  PROCESSORS,
  type UseCaseId,
} from "../src/lib/legal/ledger.js";
import { getPageConfig, PAGE_CONFIG } from "../src/lib/page-config.js";

const FALLBACK = getPageConfig("/definitely/not/a/route");

describe("privacy ledger rows", () => {
  it("every row has a unique anchor of the form use-<id>", () => {
    const anchors = LEDGER.map((row) => anchorFor(row.id));
    expect(new Set(anchors).size).toBe(anchors.length);
    for (const row of LEDGER) expect(anchorFor(row.id)).toBe(`use-${row.id}`);
  });

  it("every row states what, how it is parsed, where it lives, how long, and on what basis", () => {
    for (const row of LEDGER) {
      for (const field of [
        "element",
        "sentence",
        "parser",
        "storage",
        "retention",
        "basis",
      ] as const) {
        expect(row[field], `${row.id}.${field}`).toMatch(/\S/);
      }
    }
  });

  it("every row is met somewhere: on named routes or everywhere", () => {
    for (const row of LEDGER) {
      const named = row.routes?.length ?? 0;
      expect(
        named > 0 || row.everywhere === true,
        `${row.id} has no routes and is not everywhere`,
      ).toBe(true);
    }
  });
});

describe("ledger ↔ page config", () => {
  it("every ledger route resolves to a page-config entry that declares the use case", () => {
    for (const row of LEDGER) {
      for (const route of row.routes ?? []) {
        const entry = getPageConfig(route);
        expect(entry, `${row.id}: ${route} has no page config`).not.toBe(
          FALLBACK,
        );
        expect(
          entry.footer?.useCases,
          `${route} does not declare ${row.id}`,
        ).toContain(row.id);
      }
    }
  });

  it("every page-config use case exists in the ledger and names a route that resolves to that entry", () => {
    const ids = new Set<UseCaseId>(LEDGER.map((row) => row.id));
    for (const [key, entry] of Object.entries(PAGE_CONFIG)) {
      for (const id of entry.footer?.useCases ?? []) {
        expect(ids.has(id), `${key} declares unknown use case ${id}`).toBe(
          true,
        );
        const row = LEDGER.find((r) => r.id === id);
        const hits = (row?.routes ?? []).filter(
          (route) => getPageConfig(route) === entry,
        );
        expect(
          hits.length,
          `${id} lists no route resolving to ${key}`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe("contact and processors", () => {
  it("names a person, a mailbox, an address and a response window", () => {
    expect(CONTACT.name).toMatch(/\S/);
    expect(CONTACT.email).toBe("privacy@orakl.quest");
    expect(CONTACT.address).toMatch(/Romania/);
    expect(CONTACT.responseDays).toBe(15);
  });

  it("lists the six processors and states the database provider's DPA gap", () => {
    const names = PROCESSORS.map((p) => p.name);
    for (const expected of [
      "Turso",
      "Cloudflare",
      "Fly.io",
      "Resend",
      "Have I Been Pwned",
      "GitHub",
    ]) {
      expect(
        names.some((n) => n.includes(expected)),
        expected,
      ).toBe(true);
    }
    const turso = PROCESSORS.find((p) => p.name.includes("Turso"));
    expect(turso?.agreement).toMatch(/no data-processing agreement/i);
  });
});
