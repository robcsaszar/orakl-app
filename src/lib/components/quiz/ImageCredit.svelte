<script lang="ts">
  import { CREDIT_LICENCE_LABEL, isHttpsUrl, type MediaCredit } from "@orakl/shared";
  import Link from "$lib/components/ui/Link.svelte";

  interface Props {
    credit: MediaCredit;
    /** Question the image belongs to; when set, the caption links to the report page. */
    questionId?: string;
    /** `display` is the cast screen's larger, plain-text caption: no links, no Report. */
    variant?: "default" | "display";
  }

  let { credit, questionId, variant = "default" }: Props = $props();

  const licenceText = $derived(
    credit.licence === "own" ? "Uploader's own" : CREDIT_LICENCE_LABEL[credit.licence],
  );
  // The parsed href is canonical (`https://…`), which `Link` needs to treat
  // the link as external; `HTTPS:` or a stray space would otherwise pass.
  const httpsHref = (url: string | undefined): string | undefined =>
    url && isHttpsUrl(url) ? new URL(url).href : undefined;
  // Keeps each link's hit area at touch size inside the caption row.
  const tapClass = "inline-flex min-h-11 shrink-0 items-center";
  const licenceHref = $derived(httpsHref(credit.licenceUrl));
  const sourceHref = $derived(httpsHref(credit.sourceUrl));
</script>

{#if variant === "display"}
  <p data-image-credit class="text-center text-xl text-foreground-darker lg:text-2xl">
    {#if credit.author}{credit.author} · {/if}{licenceText}
  </p>
{:else}
  <p data-image-credit class="flex min-w-0 flex-wrap items-center justify-center gap-x-1.5 text-xs text-foreground-darker">
    {#if credit.author}
      <span class="min-w-0 break-words" data-tooltip={credit.author}>{credit.author}</span>
      <span aria-hidden="true">·</span>
    {/if}
    {#if licenceHref}
      <Link href={licenceHref} intent="inline" content="inline" class={tapClass}>{licenceText}</Link>
    {:else}
      <span class="shrink-0">{licenceText}</span>
    {/if}
    {#if sourceHref}
      <span aria-hidden="true">·</span>
      <Link href={sourceHref} intent="inline" content="inline" class={tapClass}>Source</Link>
    {/if}
    {#if questionId}
      <span aria-hidden="true">·</span>
      <Link
        href={`/report-image?question=${encodeURIComponent(questionId)}`}
        target="_blank"
        rel="noopener noreferrer"
        class={tapClass}
      >Report</Link>
    {/if}
  </p>
{/if}
