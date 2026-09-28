<script lang="ts">
  let { class: className = "size-4" }: { class?: string } = $props();
</script>

<svg class="{className} shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" opacity="0.25" />
  <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>
