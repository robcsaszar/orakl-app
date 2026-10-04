import { LayoutPageSchema } from "@orakl/protocol";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { UI_FLAGS } from "../src/lib/page-config.js";

// The root layout decodes `/api/layout` through LayoutPageSchema, and decoding
// drops keys the schema does not name — a flag missing from its `uiFlags`
// reaches every template as off, whatever the server resolved.
describe("LayoutPageSchema uiFlags", () => {
  it("keeps every flag the client asks the layout to resolve", () => {
    const sent = Object.fromEntries(UI_FLAGS.map((f) => [f, true]));
    const decoded = Schema.decodeUnknownSync(LayoutPageSchema.fields.uiFlags)(
      sent,
    );
    expect(Object.keys(decoded).sort()).toEqual([...UI_FLAGS].sort());
  });
});
