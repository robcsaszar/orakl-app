<script lang="ts">
  import { cn } from "tailwind-variants";

  const icons = import.meta.glob("@/assets/icons/**/*.svg", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  const iconMap: Record<string, string> = {};
  for (const [key, value] of Object.entries(icons)) {
    const match = key.match(/\/icons\/(.+)\.svg$/);
    if (match) iconMap[match[1]] = value;
  }

  let {
    name,
    class: className = "",
  }: { name: string; class?: string } = $props();

  function getSvg(n: string): string {
    const raw = iconMap[n] ?? "";
    if (!raw) return "";
    const cls = cn(["shrink-0 size-5", className]);
    // Target first <svg token (handles leading whitespace/XML prologs/comments).
    // Merge with existing class attribute if present; otherwise insert a new one.
    return raw.replace(/<svg([^>]*)>/, (_, attrs: string) => {
      const classMatch = attrs.match(/class="([^"]*)"/);
      if (classMatch) {
        const merged = cn([classMatch[1], cls]);
        return `<svg${attrs.replace(/class="[^"]*"/, `class="${merged}"`)}>`;
      }
      return `<svg class="${cls}"${attrs} aria-hidden="true">`;
    });
  }
</script>

{@html getSvg(name)}
