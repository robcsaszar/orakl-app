<script lang="ts">
  import Icon from '@/lib/components/ui/Icon.svelte';
  import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";

  interface Props {
    label: string;
    onConfirm?: () => void;
    confirmAriaLabel?: string;
  }

  let { label, onConfirm, confirmAriaLabel }: Props = $props();
</script>

<ConfirmButton
  {label}
  {onConfirm}
  confirmAriaLabel={confirmAriaLabel ?? `Click again to confirm: ${label.toLowerCase()}`}
>
  {#snippet icon()}
  <Icon name="power" />
  {/snippet}
</ConfirmButton>
