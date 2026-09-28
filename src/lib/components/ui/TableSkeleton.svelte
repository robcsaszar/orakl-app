<script lang="ts">
  let {
    rows = 10,
    columns = 6,
    height = "520px",
  }: {
    rows?: number;
    columns?: number;
    height?: string;
  } = $props();

  const colWidths = [
    "w-1/4",
    "w-1/6",
    "w-1/12",
    "w-1/12",
    "w-1/12",
    "w-1/3",
    "w-1/5",
  ];
</script>

<div
  class="overflow-hidden rounded-2xl border border-border bg-background-lighter"
  style="height: {height};"
  aria-label="Loading table"
  aria-busy="true"
  role="status"
>
  <!-- Header -->
  <div
    class="flex items-center gap-4 border-b border-border bg-surface px-4"
    style="height: 40px;"
  >
    {#each Array(columns) as _, i}
      <div
        class="h-2.5 animate-pulse rounded-full bg-foreground/10 {colWidths[i % colWidths.length]}"
      ></div>
    {/each}
  </div>

  <!-- Rows -->
  {#each Array(rows) as _, r}
    <div
      class="flex items-center gap-4 border-b border-border/50 px-4 last:border-0"
      style="height: 40px;"
    >
      {#each Array(columns) as _, i}
        <div
          class="h-2 animate-pulse rounded-full {colWidths[i % colWidths.length]}"
          class:bg-foreground-darker={r % 2 === 0}
          class:bg-foreground={r % 2 !== 0}
          style="opacity: {0.06 + (i % 3) * 0.02}; animation-delay: {(r * columns + i) * 30}ms;"
        ></div>
      {/each}
    </div>
  {/each}
</div>
