<script lang="ts">
  interface Props {
    /** Values in chronological order (oldest → newest). */
    values: number[];
    min?: number;
    max?: number;
    class?: string;
  }

  let { values, min = 0, max = 100, class: className = "" }: Props = $props();

  const W = 240;
  const H = 48;
  const PAD = 4;

  function y(v: number): number {
    const range = max - min || 1;
    return H - PAD - ((v - min) / range) * (H - PAD * 2);
  }

  const step = $derived(values.length > 1 ? (W - PAD * 2) / (values.length - 1) : 0);

  const line = $derived(
    values.map((v, i) => `${(PAD + i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" "),
  );

  // Closed area under the line for a subtle fill.
  const area = $derived(
    values.length > 1
      ? `${PAD},${H - PAD} ${line} ${(W - PAD).toFixed(1)},${H - PAD}`
      : "",
  );

  const lastX = $derived(PAD + (values.length - 1) * step);
  const lastY = $derived(values.length ? y(values[values.length - 1]) : 0);
</script>

{#if values.length >= 2}
  <svg
    viewBox="0 0 {W} {H}"
    class="w-full {className}"
    preserveAspectRatio="none"
    role="img"
    aria-label="Trend over time"
  >
    <polygon points={area} fill="currentColor" opacity="0.12" />
    <polyline
      points={line}
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle cx={lastX} cy={lastY} r="3" fill="currentColor" />
  </svg>
{/if}
