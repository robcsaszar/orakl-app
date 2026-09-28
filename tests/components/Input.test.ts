import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Input from "../../src/lib/components/ui/Input.svelte";

describe("Input", () => {
  describe("text input", () => {
    it("renders a labelled input", () => {
      render(Input, { props: { id: "name", label: "Name", name: "name" } });
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    it("renders description linked via aria-describedby", () => {
      render(Input, {
        props: {
          id: "bio",
          label: "Bio",
          name: "bio",
          description: "Tell us about yourself",
        },
      });
      // getByLabelText may fail if aria-describedby text pollutes label name — query by id
      const input = document.getElementById("bio");
      expect(input).toHaveAttribute(
        "aria-describedby",
        expect.stringContaining("bio-desc"),
      );
      expect(screen.getByText("Tell us about yourself")).toBeInTheDocument();
    });

    it("shows error message with role=alert", () => {
      render(Input, {
        props: {
          id: "email",
          label: "Email",
          name: "email",
          error: "Invalid email",
        },
      });
      const error = screen.getByRole("alert");
      expect(error).toHaveTextContent("Invalid email");
    });

    it("marks input aria-invalid when error is set", () => {
      render(Input, {
        props: {
          id: "email2",
          label: "Email",
          name: "email",
          error: "Required",
        },
      });
      // error <p> inside <label> pollutes accessible name — query by id directly
      const input = document.getElementById("email2");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("size=sm compacts the field and its label", () => {
      render(Input, {
        props: { id: "n", name: "n", label: "Nickname", size: "sm" },
      });
      const input = screen.getByLabelText("Nickname");
      expect(input.className).toContain("text-xs");
      expect(screen.getByText("Nickname").className).toContain("text-xs");
    });

    it("renders textarea variant when type is textarea", () => {
      render(Input, {
        props: { id: "msg", label: "Message", name: "msg", type: "textarea" },
      });
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  describe("password input", () => {
    it("renders with type=password by default", () => {
      render(Input, {
        props: {
          id: "pw",
          label: "Password",
          name: "password",
          type: "password",
        },
      });
      expect(screen.getByLabelText("Password")).toHaveAttribute(
        "type",
        "password",
      );
    });

    it("reveal button toggles input type to text", async () => {
      const user = userEvent.setup();
      render(Input, {
        props: {
          id: "pw",
          label: "Password",
          name: "password",
          type: "password",
        },
      });
      const input = screen.getByLabelText("Password");
      const toggle = screen.getByRole("button", { name: "Show password" });

      expect(input).toHaveAttribute("type", "password");
      await user.click(toggle);
      expect(input).toHaveAttribute("type", "text");
    });

    it("reveal button aria-pressed reflects visibility state", async () => {
      const user = userEvent.setup();
      render(Input, {
        props: {
          id: "pw",
          label: "Password",
          name: "password",
          type: "password",
        },
      });
      const toggle = screen.getByRole("button", { name: "Show password" });

      expect(toggle).toHaveAttribute("aria-pressed", "false");
      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-pressed", "true");
    });

    it("reveal button label updates after toggle", async () => {
      const user = userEvent.setup();
      render(Input, {
        props: {
          id: "pw",
          label: "Password",
          name: "password",
          type: "password",
        },
      });

      await user.click(screen.getByRole("button", { name: "Show password" }));
      expect(
        screen.getByRole("button", { name: "Hide password" }),
      ).toBeInTheDocument();
    });
  });
});
