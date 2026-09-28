<script lang="ts">
  /**
   * Sub-breakpoint surface for the curator toolbox: a bottom sheet opened by
   * CuratorToolboxFab. Above the breakpoint the same panel lives in the rail
   * and the FAB is hidden, so this never opens there.
   */
  import Drawer from "$lib/components/ui/Drawer.svelte";
  import CuratorToolboxPanel from "./CuratorToolboxPanel.svelte";
  import { CURATOR_TOOLBOX_DRAWER_ID } from "./CuratorToolboxFab.svelte";
  import type { PlayerSessionView } from "@/lib/svelte/player-session-view.js";

  let { session }: { session: PlayerSessionView } = $props();
</script>

<Drawer id={CURATOR_TOOLBOX_DRAWER_ID} title="Curator toolbox">
  <CuratorToolboxPanel {session} />
</Drawer>
