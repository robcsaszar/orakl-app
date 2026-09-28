<script lang="ts">
  import type { PageData } from "./$types";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import AdminUsers from "./AdminUsers.svelte";

  let { data }: { data: PageData } = $props();
</script>

<Metatags title="User management" description="Manage users, roles, and powers." />

<AdminUsers
  initial={data.initial}
  roles={data.roles}
  currentUserId={data.currentUserId}
  allPowers={data.allPowers}
  pendingRequests={data.pendingRequests}
  leaderboards={data.uiFlags.SOLO_LEADERBOARDS === true}
/>
