<script lang="ts">
  // Nested error boundary so the mimic layout (header + DevToolbar) keeps
  // wrapping the preview — without this, SvelteKit falls back to the root
  // `+error.svelte`'s boundary, which skips every layout below root (the
  // fidelity we deliberately want for the real app, see docs/adr/0010).
  import RealError from "@/routes/+error.svelte";
</script>

<RealError />
