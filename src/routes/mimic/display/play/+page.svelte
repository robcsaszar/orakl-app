<script lang="ts">
  import DisplayReceiver from "@/routes/(display)/curator/display/DisplayReceiver.svelte";
</script>

<div class="flex h-dvh flex-col overflow-hidden">
  <div class="flex min-h-0 flex-1 flex-col">
    <DisplayReceiver displayToken="" />
  </div>
  <!-- Placeholder band mimics the real page's footer height. -->
  <div class="h-10 shrink-0"></div>
</div>
