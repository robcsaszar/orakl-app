import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Icon from "$lib/components/ui/Icon.svelte";

describe("Icon", () => {
  it("renders an svg element for a known icon name", () => {
    const { container } = render(Icon, { props: { name: "wreath" } });
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
