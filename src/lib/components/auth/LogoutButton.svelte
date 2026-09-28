<script lang="ts">
  import Icon from '@/lib/components/ui/Icon.svelte';
  import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";
</script>

<ConfirmButton
  label="Sign out"
  confirmAriaLabel="Click again to confirm sign out"
  formAction="/api/auth/logout"
  class="group"
>
  {#snippet icon()}
    <Icon name="logout" />
  {/snippet}
</ConfirmButton>
