<script lang="ts">
  import { getContext } from "svelte";
  import { cn } from "tailwind-variants";
  import { page } from "$app/state";
  import {
    ICON_SCALE,
    ICON_SCALE_CONTEXT,
    type IconScale,
    type IconStep,
    ROLES,
    type RoleName,
    USAGE_SVGS,
  } from "$lib/icons";
  import { type IconUsage, usageKey } from "$lib/icon-usages";

  let {
    name,
    usage,
    size = "md",
    class: className = "",
  }: {
    name: RoleName;
    /** Where this icon renders; a usage can carry its own drawing of the role. */
    usage: IconUsage;
    size?: IconStep | "fill";
    class?: string;
  } = $props();

  // The owner's drafts ride in layout data; outside a SvelteKit page (tests,
  // isolated renders) there is no page state to read.
  function draftFor(n: string): string | undefined {
    try {
      return page.data?.iconDrafts?.[n];
    } catch {
      return undefined;
    }
  }

  // A page can supply the scale it is editing (the icon admin does); otherwise
  // the owner's drafted scale, then the code scale.
  const scaleOverride = getContext<(() => IconScale) | undefined>(
    ICON_SCALE_CONTEXT,
  );
  function scaleNow(): IconScale {
    if (scaleOverride) return scaleOverride();
    try {
      return page.data?.iconScaleDraft ?? ICON_SCALE;
    } catch {
      return ICON_SCALE;
    }
  }

  function getSvg(n: RoleName, step: IconStep | "fill"): string {
    const role = ROLES[n];
    const key = usageKey(n, usage);
    const raw = draftFor(key) || USAGE_SVGS[key] || draftFor(n) || role.svg;
    const entry = step === "fill" ? undefined : scaleNow()[role.tier][step];
    const stroke = entry && "stroke" in entry ? entry.stroke : undefined;
    const cls = cn([
      "shrink-0",
      step === "fill" && "size-full",
      stroke !== undefined && "[&_*]:[stroke-width:var(--icon-stroke)]",
      className,
    ]);
    const style = entry
      ? `width:${entry.px}px;height:${entry.px}px;${stroke !== undefined ? `--icon-stroke:${stroke};` : ""}`
      : "";
    // Target first <svg token (handles leading whitespace/XML prologs/comments).
    // Merge with existing class attribute if present; otherwise insert a new one.
    return raw.replace(/<svg([^>]*)>/, (_, rawAttrs: string) => {
      // Merge with an existing style attribute; the size comes last so it wins.
      let attrs = rawAttrs;
      let styleAttr = "";
      if (style) {
        const styleMatch = attrs.match(/style="([^"]*)"/);
        if (styleMatch) {
          const prior = styleMatch[1].replace(/;?\s*$/, ";");
          attrs = attrs.replace(/\s*style="[^"]*"/, "");
          styleAttr = ` style="${prior}${style}"`;
        } else {
          styleAttr = ` style="${style}"`;
        }
      }
      const classMatch = attrs.match(/class="([^"]*)"/);
      if (classMatch) {
        const merged = cn([classMatch[1], cls]);
        return `<svg${attrs.replace(/class="[^"]*"/, `class="${merged}"`)}${styleAttr} aria-hidden="true">`;
      }
      return `<svg class="${cls}"${attrs}${styleAttr} aria-hidden="true">`;
    });
  }
</script>

{@html getSvg(name, size)}
