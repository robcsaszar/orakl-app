<script lang="ts">
  import { onMount } from "svelte";
  import { dev } from "$app/environment";
  import { page } from "$app/state";
  import Footer from "$lib/components/layout/Footer.svelte";
  import DisplayReceiver from "./DisplayReceiver.svelte";

  let { data } = $props();

  onMount(() => {
    if (navigator.presentation?.receiver) {
      navigator.presentation.receiver.connectionList
        .then((list) => {
          if (dev) {
            list.connections.forEach((conn) => {
              console.log("[Display] Existing connection:", conn.id, conn.state);
            });
            list.addEventListener("connectionavailable", (ev) => {
              console.log(
                "[Display] New connection:",
                (ev as PresentationConnectionAvailableEvent).connection.id,
              );
            });
          }
        })
        .catch(console.error);
    }
  });
</script>

<svelte:head>
  <title>Display — Orakl</title>
</svelte:head>

<div class="flex h-dvh flex-col overflow-hidden">
  <div class="flex min-h-0 flex-1 flex-col">
    <DisplayReceiver displayToken={data.displayToken} />
  </div>
  <!-- Every route carries the policy link (decision #13); the display has
       no layout, so the compact footer sits here. -->
  <Footer
    showNav={false}
    pathname="/curator/display"
    analytics={page.data.analytics}
  />
</div>
