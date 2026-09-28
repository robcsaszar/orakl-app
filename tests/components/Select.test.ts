import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import { describe, expect, it, vi } from "vitest";
import Select from "../../src/lib/components/ui/Select.svelte";

const options = createRawSnippet(() => ({
  render: () =>
    `<optgroup label="Roles"><option value="">All roles</option><option value="admin">admin</option><option value="curator">curator</option></optgroup>`,
}));

describe("Select", () => {
  it("renders a combobox named by its label", () => {
    render(Select, {
      props: { id: "role", label: "Role", name: "role", children: options },
    });
    expect(screen.getByRole("combobox", { name: "Role" })).toBeInTheDocument();
  });

  it("renders the options passed as children", () => {
    render(Select, {
      props: { id: "role", label: "Role", name: "role", children: options },
    });
    expect(screen.getByRole("option", { name: "curator" })).toBeInTheDocument();
  });

  it("changes value and fires onchange when an option is chosen", async () => {
    const user = userEvent.setup();
    const onchange = vi.fn();
    render(Select, {
      props: {
        id: "role",
        label: "Role",
        name: "role",
        children: options,
        onchange,
      },
    });
    const select = screen.getByRole("combobox", {
      name: "Role",
    }) as HTMLSelectElement;
    await user.selectOptions(select, "admin");
    expect(select.value).toBe("admin");
    expect(onchange).toHaveBeenCalledOnce();
  });

  it("hideLabel keeps the label for assistive tech only", () => {
    render(Select, {
      props: {
        id: "cat",
        label: "Filter by category",
        name: "cat",
        hideLabel: true,
        children: options,
      },
    });
    expect(
      screen.getByRole("combobox", { name: "Filter by category" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Filter by category").className).toContain(
      "sr-only",
    );
  });

  it("is a squircle on semantic tokens", () => {
    render(Select, {
      props: { id: "role", label: "Role", name: "role", children: options },
    });
    const cls = screen.getByRole("combobox").className;
    expect(cls).toContain("corner-shape-squircle");
    expect(cls).not.toMatch(/\b(bg|text|border)-(gray|violet)-\d/);
  });
});
