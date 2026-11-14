<!--
  The save page of the whole sky, one for every part: everything as text to
  read and copy, a saved sky pasted in, and each part put back as the code
  has it.
-->
<script lang="ts">
  import Button from "@/lib/components/ui/Button.svelte";
  import ConfirmButton from "@/lib/components/ui/ConfirmButton.svelte";
  import Icon from "@/lib/components/ui/Icon.svelte";
  import Input from "@/lib/components/ui/Input.svelte";
  import SkyJson from "./SkyJson.svelte";
  import { loadSkyText, SKY_PART_ORDER, skyParts, skyText, skyView, ui } from "./sky-panel.svelte";

  let copied = $state(false);
  let text = $state("");
  let error = $state("");

  const parts = $derived(SKY_PART_ORDER.flatMap((key) => (skyParts[key] ? [{ key, part: skyParts[key] }] : [])));
  const saved = $derived(JSON.parse(skyText()) as object);

  async function copy() {
    const all = skyText();
    try {
      await navigator.clipboard.writeText(all);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      console.info(all);
    }
  }

  function bringIn() {
    error = "";
    try {
      loadSkyText(text);
      text = "";
    } catch {
      error = "That text is not a saved sky. Paste what \"Copy everything\" gave you.";
    }
  }
</script>

<div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6 max-sm:px-4 max-sm:py-4 {ui.sections}">
  <section class={ui.group} aria-label="Take it out">
    <div class="flex items-center justify-between gap-2">
      <h3 class={ui.heading}>Take it out</h3>
      <Button variant="outline" intent="compact" radius="rounded" class={ui.compact} onclick={() => (skyView.view = "settings")}>Back to settings</Button>
    </div>
    <p class={ui.hint}>Your work is saved in this browser as you go. To hand it to someone, copy all of it as text. It is one text for the sky, the stars, the clouds and the birds.</p>
    <div class="flex"><Button variant="outline" intent="compact" radius="rounded" class={ui.compact} onclick={copy}>{copied ? "Copied" : "Copy everything"}</Button></div>
    <div class="max-h-80 overflow-auto rounded-xl border border-secondary/20 bg-background/60 p-3 font-mono text-xs leading-relaxed" role="group" aria-label="Everything, as it is saved">
      <SkyJson value={saved} />
    </div>
  </section>
  <section class={ui.group} aria-label="Bring it in">
    <h3 class={ui.heading}>Bring it in</h3>
    <Input
      id="sky-import"
      name="sky-import"
      type="textarea"
      size="sm"
      label="Paste a saved sky"
      description="Paste text that Copy everything made. Each part it holds replaces what you have now; parts it leaves out stay."
      rows={3}
      class="max-h-24"
      error={error || undefined}
      bind:value={text}
    />
    <div class="flex">
      <Button variant={text.trim() ? "outline" : "disabled"} intent="compact" radius="rounded" class={ui.compact} disabled={!text.trim()} onclick={bringIn}>Use this sky</Button>
    </div>
  </section>
  <section class={ui.group} aria-label="Start over">
    <h3 class={ui.heading}>Start over</h3>
    {#each parts as { key, part } (key)}
      <div class="flex flex-col gap-2">
        <div class="flex">
          <ConfirmButton label={part.resetLabel} confirmLabel="{part.resetLabel}?" confirmVariant="danger" variant="outline" revealDelay={0} duration={4000} onConfirm={part.reset} class={ui.confirm}>
            {#snippet icon()}<Icon name="delete" size="xs" />{/snippet}
            {#snippet confirmIcon()}<Icon name="confirm" size="xs" />{/snippet}
          </ConfirmButton>
        </div>
        <p class={ui.hint}>{part.resetNote}</p>
      </div>
    {/each}
  </section>
  {#each parts as { key, part } (key)}
    {#if part.extra}{@render part.extra()}{/if}
  {/each}
</div>
