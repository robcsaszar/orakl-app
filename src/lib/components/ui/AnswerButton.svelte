<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import type { VariantProps } from "tailwind-variants";
  import { cn } from "tailwind-variants";
  import { answerButtonVariants } from "@/lib/answer-variants.js";

  let {
    state = "idle",
    questionType = "multiple_choice",
    flavor = "none",
    class: className = "",
    children,
    ...props
  }: {
    state?: VariantProps<typeof answerButtonVariants>["state"];
    questionType?: VariantProps<typeof answerButtonVariants>["questionType"];
    flavor?: VariantProps<typeof answerButtonVariants>["flavor"];
    class?: string;
    children?: Snippet;
  } & HTMLButtonAttributes = $props();
</script>

<button class={cn(answerButtonVariants({ state, questionType, flavor, class: className }))} {...props}>
  {@render children?.()}
</button>
