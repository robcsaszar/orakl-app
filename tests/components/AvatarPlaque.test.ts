import { DEFAULT_AVATAR_DESC } from "@orakl/shared";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";

import AvatarPlaque from "../../src/routes/(game)/quiz/setup/AvatarPlaque.svelte";

describe("AvatarPlaque", () => {
  it("renders title, description and the avatar image", () => {
    render(AvatarPlaque, {
      props: {
        src: "/avatars/fox.png",
        title: "Fox",
        description: "A cunning fox.",
      },
    });
    expect(screen.getByText("Fox")).toBeInTheDocument();
    expect(screen.getByText("A cunning fox.")).toBeInTheDocument();
    const img = screen.getByAltText("") as HTMLImageElement;
    expect(img.src).toContain("/avatars/fox.png");
  });

  it("shows the default description when empty", () => {
    render(AvatarPlaque, {
      props: { src: "/avatars/fox.png", title: "Fox", description: "" },
    });
    expect(screen.getByText(DEFAULT_AVATAR_DESC)).toBeInTheDocument();
  });

  it("renders the fallback icon and neutral title without a src", () => {
    render(AvatarPlaque, { props: {} });
    expect(screen.getByText("No avatar yet")).toBeInTheDocument();
    expect(screen.queryByAltText("")).not.toBeInTheDocument();
  });
});
