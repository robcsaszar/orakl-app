import { render, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NPCS } from "$lib/npcs";
import SoloOpponentCard from "../../src/routes/(game)/quiz/lobby/SoloOpponentCard.svelte";

let data: Record<string, unknown> = {};
vi.mock("$app/state", () => ({
  page: {
    get data() {
      return data;
    },
  },
}));

const DRAFT = '<svg viewBox="0 0 24 24"><path id="draft-mark" d="M0 0"/></svg>';

beforeEach(() => {
  data = {};
});

describe("SoloOpponentCard", () => {
  it.each(NPCS)("loads a portrait for $id", async (npc) => {
    const { container } = render(SoloOpponentCard, { props: { npc } });
    await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
  });

  it("draws the draft for a portrait the page data drafts", async () => {
    data = { iconDrafts: { "npc-zeus": DRAFT } };
    const zeus = NPCS.find((n) => n.id === "zeus") ?? NPCS[0];
    const { container } = render(SoloOpponentCard, { props: { npc: zeus } });
    await waitFor(() =>
      expect(container.querySelector("#draft-mark")).not.toBeNull(),
    );
  });

  it("draws the portrait of another npc when only zeus is drafted", async () => {
    data = { iconDrafts: { "npc-zeus": DRAFT } };
    const hera = NPCS.find((n) => n.id === "hera") ?? NPCS[1];
    const { container } = render(SoloOpponentCard, { props: { npc: hera } });
    await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
    expect(container.querySelector("#draft-mark")).toBeNull();
  });
});
