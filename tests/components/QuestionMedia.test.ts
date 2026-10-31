import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import QuestionMedia from "$lib/components/quiz/QuestionMedia.svelte";

const ccBy = {
  licence: "cc-by" as const,
  author: "Ada Lovelace",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Ada.jpg",
  licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
};

describe("QuestionMedia credit", () => {
  it("renders author, licence and source link for a CC BY credit", () => {
    render(QuestionMedia, {
      props: { src: "https://x.test/a.png", credit: ccBy },
    });
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CC BY" })).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by/4.0/",
    );
    const source = screen.getByRole("link", { name: /Source/ });
    expect(source).toHaveAttribute("href", ccBy.sourceUrl);
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", "noopener noreferrer");
  });

  it.each([
    "HTTPS://commons.wikimedia.org/wiki/File:Ada.jpg",
    "https:commons.wikimedia.org/wiki/File:Ada.jpg",
    " https://commons.wikimedia.org/wiki/File:Ada.jpg",
  ])("opens a non-canonical https link %j in a new tab", (sourceUrl) => {
    render(QuestionMedia, {
      props: { src: "https://x.test/a.png", credit: { ...ccBy, sourceUrl } },
    });
    const source = screen.getByRole("link", { name: /Source/ });
    expect(source).toHaveAttribute(
      "href",
      "https://commons.wikimedia.org/wiki/File:Ada.jpg",
    );
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders no caption without a credit", () => {
    const { container } = render(QuestionMedia, {
      props: { src: "https://x.test/a.png" },
    });
    expect(container.querySelector("[data-image-credit]")).toBeNull();
    expect(screen.queryByText(/Source/)).toBeNull();
  });

  it("renders no Source link for a non-https sourceUrl", () => {
    render(QuestionMedia, {
      props: {
        src: "https://x.test/a.png",
        credit: { ...ccBy, sourceUrl: "http://example.com/p" },
      },
    });
    expect(screen.queryByRole("link", { name: /Source/ })).toBeNull();
    expect(screen.queryByText(/Source/)).toBeNull();
  });

  it("renders own licence as Uploader's own, plain text without licenceUrl", () => {
    render(QuestionMedia, {
      props: { src: "https://x.test/a.png", credit: { licence: "own" } },
    });
    expect(screen.getByText("Uploader's own")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("QuestionMedia report link", () => {
  it("links to the report page with the question id", () => {
    render(QuestionMedia, {
      props: { src: "https://x.test/a.png", credit: ccBy, questionId: "q-42" },
    });
    expect(screen.getByRole("link", { name: "Report" })).toHaveAttribute(
      "href",
      "/report-image?question=q-42",
    );
  });

  it("opens the report page in a new tab", () => {
    render(QuestionMedia, {
      props: { src: "https://x.test/a.png", credit: ccBy, questionId: "q-42" },
    });
    const report = screen.getByRole("link", { name: "Report" });
    expect(report).toHaveAttribute("target", "_blank");
    expect(report).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders no Report link without a question id", () => {
    render(QuestionMedia, {
      props: { src: "https://x.test/a.png", credit: ccBy },
    });
    expect(screen.queryByRole("link", { name: "Report" })).toBeNull();
  });
});

describe("QuestionMedia display variant", () => {
  it("compact shows plain text credit with no links", () => {
    const { container } = render(QuestionMedia, {
      props: {
        src: "https://x.test/a.png",
        credit: ccBy,
        questionId: "q-42",
        compact: true,
      },
    });
    expect(screen.getByText(/Ada Lovelace\s*·\s*CC BY/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
    expect(container.querySelector("[data-image-credit]")).toHaveClass(
      "text-xl",
    );
  });

  it("exposes the author through the global tooltip, not title", () => {
    render(QuestionMedia, {
      props: { src: "https://x.test/a.png", credit: ccBy },
    });
    const author = screen.getByText("Ada Lovelace");
    expect(author).toHaveAttribute("data-tooltip", "Ada Lovelace");
    expect(author).not.toHaveAttribute("title");
  });
});
