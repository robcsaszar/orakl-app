<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLInputAttributes } from "svelte/elements";
  import { cn } from "tailwind-variants";

  let {
    id,
    label,
    name,
    accept,
    onfiles,
    dropzone = false,
    class: className = "",
    children,
    ...props
  }: {
    id: string;
    /** Visible prompt — becomes the control's accessible name */
    label: string;
    name?: string;
    accept?: string;
    /** Fired on both a picked file and a dropped file */
    onfiles?: (files: FileList) => void;
    /** Full drop-target panel instead of a compact button-like row */
    dropzone?: boolean;
    class?: string;
    /** Hint text under the label */
    children?: Snippet;
  } & Omit<HTMLInputAttributes, "id" | "name" | "type" | "accept" | "class" | "files" | "onchange"> = $props();

  let dragging = $state(false);

  function onChange(e: Event) {
    const list = (e.currentTarget as HTMLInputElement).files;
    if (list?.length) onfiles?.(list);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const list = e.dataTransfer?.files;
    if (list?.length) onfiles?.(list);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<label
  for={id}
  class={cn(
    "group flex cursor-pointer items-center gap-2 rounded-2xl corner-shape-squircle border-2 border-dashed border-secondary/30 bg-background-lighter/10 text-foreground transition-colors duration-200 ease-ease-in-out-quart",
    "hover:border-secondary focus-within:border-secondary focus-within:outline-hidden focus-within:ring-2 focus-within:ring-secondary/25 focus-within:ring-offset-2 focus-within:ring-offset-background",
    dropzone ? "flex-col px-6 py-8 text-center" : "px-4 py-3",
    dragging && "border-secondary bg-secondary/10",
    className,
  )}
  ondragover={(e) => {
    e.preventDefault();
    dragging = true;
  }}
  ondragleave={(e) => {
    e.preventDefault();
    dragging = false;
  }}
  ondrop={onDrop}
>
  <input {id} {name} type="file" {accept} class="sr-only" onchange={onChange} {...props} />
  <span class="text-sm">{label}</span>
  {@render children?.()}
</label>
