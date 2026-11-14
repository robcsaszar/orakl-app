<!--
  The sky controls: the sky colours (`?sky`), the stars (`?stars`), the clouds
  (`?clouds`) and the birds (`?birds`) in one panel with a switch between them. Every part stays
  mounted, so the sky keeps what each one holds while another is open.
-->
<script lang="ts">
  import { replaceState } from "$app/navigation";
  import { page } from "$app/state";
  import BirdControls from "./BirdControls.svelte";
  import CloudControls from "./CloudControls.svelte";
  import SkyColourControls from "./SkyColourControls.svelte";
  import StarControls from "./StarControls.svelte";
  import { keepNow, skyTabs } from "./sky-panel.svelte";

  const MODES = [
    { key: "sky", label: "Sky" },
    { key: "stars", label: "Stars" },
    { key: "clouds", label: "Clouds" },
    ...(__FEATURE_BIRDS__ ? [{ key: "birds", label: "Birds" }] : []),
  ];

  const asked = (key: string) => page.url.searchParams.has(key);
  let mode = $state(asked("clouds") ? "clouds" : __FEATURE_BIRDS__ && asked("birds") ? "birds" : asked("stars") ? "stars" : asked("sky") ? "sky" : "clouds");
  let open = $state(true);
  const onmode = (key: string) => (mode = key);

  // The address names the open part and its open tab, `?birds=flight`: each part opens on the tab it names.
  for (const { key } of MODES) {
    const named = page.url.searchParams.get(key);
    if (named) skyTabs[key] = named;
  }
  // And it follows them, so a refresh comes back to the same place.
  $effect(() => {
    const tab = skyTabs[mode];
    const url = new URL(location.href);
    for (const { key } of MODES) url.searchParams.delete(key);
    url.searchParams.set(mode, tab ?? "");
    const next = `${url.pathname}${url.search.replace(/=(?=&|$)/g, "")}${url.hash}`;
    let again: ReturnType<typeof setTimeout> | undefined;
    const write = () => {
      if (next === `${location.pathname}${location.search}${location.hash}`) return;
      try {
        replaceState(next, page.state);
      } catch {
        // The router is not up yet on a first load: the address is set once it is.
        again = setTimeout(write, 50);
      }
    };
    // After this turn, so a first load has its router up before the address is touched.
    again = setTimeout(write, 0);
    return () => clearTimeout(again);
  });
</script>

<svelte:window onpagehide={keepNow} />

<SkyColourControls shown={mode === "sky"} bind:open modes={MODES} {onmode} />
<StarControls shown={mode === "stars"} bind:open modes={MODES} {onmode} />
<CloudControls shown={mode === "clouds"} bind:open modes={MODES} {onmode} />
{#if __FEATURE_BIRDS__}
  <BirdControls shown={mode === "birds"} bind:open modes={MODES} {onmode} />
{/if}
