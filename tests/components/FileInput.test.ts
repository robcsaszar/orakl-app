import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import FileInput from "../../src/lib/components/ui/FileInput.svelte";

function fileList(...files: File[]): FileList {
  const list = {
    length: files.length,
    item: (i: number) => files[i] ?? null,
  } as FileList;
  files.forEach((f, i) => {
    Object.defineProperty(list, i, { value: f });
  });
  return list;
}

describe("FileInput", () => {
  it("renders a file input named by its label, with accept", () => {
    render(FileInput, {
      props: { id: "f", label: "Choose an image", accept: "image/*" },
    });
    const input = screen.getByLabelText("Choose an image") as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input).toHaveAttribute("accept", "image/*");
  });

  it("reports picked files through onfiles", async () => {
    const onfiles = vi.fn();
    render(FileInput, { props: { id: "f", label: "Pick", onfiles } });
    const input = screen.getByLabelText("Pick") as HTMLInputElement;
    const file = new File(["{}"], "questions.json", {
      type: "application/json",
    });
    Object.defineProperty(input, "files", { value: fileList(file) });
    await fireEvent.change(input);
    expect(onfiles).toHaveBeenCalledOnce();
    expect(onfiles.mock.calls[0][0][0]).toBe(file);
  });

  it("reports dropped files through onfiles", async () => {
    const onfiles = vi.fn();
    render(FileInput, {
      props: { id: "f", label: "Drop here", dropzone: true, onfiles },
    });
    const label = screen
      .getByText("Drop here")
      .closest("label") as HTMLLabelElement;
    const file = new File(["{}"], "questions.json", {
      type: "application/json",
    });
    await fireEvent.drop(label, { dataTransfer: { files: fileList(file) } });
    expect(onfiles).toHaveBeenCalledOnce();
  });

  it("styles on semantic tokens only", () => {
    render(FileInput, { props: { id: "f", label: "Pick" } });
    const label = screen.getByText("Pick").closest("label") as HTMLLabelElement;
    expect(label.className).toContain("corner-shape-squircle");
    expect(label.className).not.toMatch(/\b(bg|text|border)-(gray|violet)-\d/);
  });
});
