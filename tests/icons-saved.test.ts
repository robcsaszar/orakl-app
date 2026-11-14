import { describe, expect, it } from "vitest";
import { savedKey, withSaved } from "../src/lib/icons";

describe("withSaved", () => {
  const defaults = {
    dismiss: { svg: "<svg>a</svg>", tier: "control" },
    next: { svg: "<svg>b</svg>", tier: "control" },
  } as const;

  it("a role with a saved file draws that file, others keep their default", () => {
    const roles = withSaved(defaults, {
      [savedKey("dismiss")]: "<svg>saved</svg>",
    });
    expect(roles.dismiss.svg).toBe("<svg>saved</svg>");
    expect(roles.dismiss.tier).toBe("control");
    expect(roles.next.svg).toBe("<svg>b</svg>");
  });

  it("saved files live at src/assets/icons/roles/<role>.svg", () => {
    expect(savedKey("sort-asc")).toBe("/src/assets/icons/roles/sort-asc.svg");
  });
});
