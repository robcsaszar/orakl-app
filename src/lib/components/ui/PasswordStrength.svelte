<script lang="ts">
  import { cn } from 'tailwind-variants';
  import Icon from "./Icon.svelte";
  import Popover from "./Popover.svelte";

  let {
    id,
    anchorEl,
    value,
  }: {
    id: string;
    anchorEl: HTMLElement | null;
    value: string;
  } = $props();

  type Rule = { label: string; test: (v: string) => boolean, required?: boolean };

  const rules: Rule[] = [
    { label: "At least 8 characters", test: (v) => v.length >= 8, required: true },
    { label: "Lowercase letter", test: (v) => /[a-z]/.test(v) },
    { label: "Uppercase letter", test: (v) => /[A-Z]/.test(v) },
    { label: "Number", test: (v) => /[0-9]/.test(v) },
    { label: "Special character", test: (v) => /[^a-zA-Z0-9]/.test(v) },
  ];

  const met = $derived(rules.map((r) => r.test(value)));
  const score = $derived(met.filter(Boolean).length);

  const strengthLabel = $derived(
    (["Empty", "Weak", "Fair", "Good", "Strong", "Excellent"] as const)[score]
  );

  const barColor = $derived(
    (["", "bg-danger", "bg-warning", "bg-warning", "bg-success", "bg-success"] as const)[score]
  );

  const labelColor = $derived(
    ([
      "text-foreground-darker",
      "text-danger-light",
      "text-warning-light",
      "text-warning-light",
      "text-success-light",
      "text-success-light",
    ] as const)[score]
  );
</script>

<Popover {id} {anchorEl}>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2 items-center justify-center flex-1">
      <div
        class="flex gap-2 self-stretch"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-label="Password strength: {strengthLabel}"
      >
        {#each rules as _, i}
          <div
            class="h-2 flex-1 rounded-full transition-colors duration-300 {i < score
              ? barColor
              : 'bg-foreground-darker opacity-50'}"
          ></div>
        {/each}
      </div>
      <p class="text-sm font-sans uppercase font-bold leading-widest transition-colors duration-300 {labelColor}">{strengthLabel}</p>
    </div>
    <div class="flex flex-col gap-2">
      <p class="text-foreground">For a safe password, we recommend:</p>
      <ul class="flex flex-col gap-1 text-sm">
        {#each rules as rule, i}
          <li
            class={cn("rule flex items-center gap-2 transition-colors duration-200 font-sans",
              met[i] ? "text-success-lighter" : "text-foreground-darker",
              rule.required ? "font-semibold" : "",
            )}
            style="--i: {i}"
          >
            <Icon name={met[i] ? "check" : "x"} class="size-4 shrink-0 stroke-3" />
            {rule.label}
            {#if rule.required}
              <span class="text-danger">
                <Icon name="asterisk" class="size-3 stroke-2" />
              </span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  </div>
</Popover>

<style>
  .rule {
    animation: slide-in 200ms ease-out calc(var(--i) * 35ms) both;
  }

  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(-6px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
