<script lang="ts">
import { formatEur, hasPower, hasRole } from "@orakl/shared";
  import type { PageData } from "./$types";
  import { replaceState } from "$app/navigation";
  import { page } from "$app/state";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import Tabs from "$lib/components/ui/Tabs.svelte";
  import ProfileAvatar from "./ProfileAvatar.svelte";
  import FontPicker from "./FontPicker.svelte";
  import ExportDataButton from "./ExportDataButton.svelte";
  import ChangePassword from "./ChangePassword.svelte";
  import DeleteAccount from "./DeleteAccount.svelte";
  import AnalyticsControl from "$lib/components/layout/AnalyticsControl.svelte";
  
  import Card from "@/lib/components/ui/Card.svelte";
  import PastDueBanner from "$lib/components/billing/PastDueBanner.svelte";
  import { toast } from "@/lib/toast.js";
  import { formatDateShort } from "@/lib/format.js";

  let { data }: { data: PageData } = $props();

  const tabs = $derived([
    { key: "account", label: "Account" },
    { key: "appearance", label: "Appearance" },
    { key: "privacy", label: "Privacy & data" },
    ...(data.tools ? [{ key: "tools", label: "Tools" }] : []),
  ]);

  let selectedTab: string = $derived(data.tab);

  // Shallow: the URL carries the tab for reload and deep links, but no load
  // reruns — a rerun would replay the one-shot ?claimed / ?verified toasts and
  // hit the server on every click. Scroll and focus stay where they are.
  function selectTab(key: string) {
    selectedTab = key;
    const url = new URL(page.url);
    url.searchParams.set("tab", key);
    replaceState(url, page.state);
  }

  // The card names only what the viewer can actually reach, heading included.
  // With neither feature on it has nothing left to say, so it does not render
  // — a trial starts from the home page.
  const ledger = $derived.by(() => {
    const history = data.uiFlags.PLAYER_HISTORY === true;
    const boards = data.uiFlags.SOLO_LEADERBOARDS === true;
    if (history && boards)
      return {
        heading: "Your ledger",
        blurb:
          "Your Trial of the Sphinx history, personal bests, and quiz rankings.",
      };
    if (history)
      return {
        heading: "Your ledger",
        blurb: "Your Trial of the Sphinx history and personal bests.",
      };
    if (boards)
      return {
        heading: "Quiz rankings",
        blurb: "Where your completed trials stand.",
      };
    return null;
  });

  // Build-level SKY flag (map #859, decision 5): ThemePicker is this feature's
  // only consumer, so it rides the same dynamic boundary out of the bundle.
  const themePicker = __FEATURE_SKY__ ? import("./ThemePicker.svelte") : null;

  const isAdmin = $derived(hasRole(data.user.role, "admin"));
  // Gated on the power, not the role: the page itself requires
  // `can-manage-features`, so a link shown on the role alone would send an
  // admin without it to a 403 (#860).
  const canManageFlags = $derived(hasPower(data.user, "can-manage-features"));
  // Both Mimic entry points below ask exactly what `/mimic/+layout.server.ts`
  // asks, so neither renders a link that 404s.
  const canAccessMimic = $derived(hasPower(data.user, "can-access-mimic"));
  const canManageCategories = $derived(
    hasPower(data.user, "can-manage-categories"),
  );
  const canManageAvatars = $derived(
    hasPower(data.user, "can-manage-avatars"),
  );
  const canModerateQuestions = $derived(
    hasPower(data.user, "can-moderate-questions"),
  );
  const canPublishQuestions = $derived(
    hasPower(data.user, "can-publish-questions"),
  );
  const canApplyForCuration = $derived(
    hasPower(data.user, "can-apply-for-curation"),
  );
  // Most of this section is not admin-only — the delegated pages live under
  // `/manage` and answer to a power, so a holder who is not an admin still has
  // somewhere to go. Each button below gates on exactly what its page gates on.
  const hasManagementArea = $derived(
    isAdmin ||
      canManageCategories ||
      canManageAvatars ||
      canModerateQuestions ||
      canPublishQuestions ||
      canManageFlags ||
      canAccessMimic,
  );

  // Writable derived: optimistic set on submit; resets to server truth on
  // invalidation.
  let isPending = $derived(!!data.pendingRequest);
  let requesting = $state(false);
  let requestError = $state("");

  let checkingOut = $state<"monthly" | "lifetime" | null>(null);

  function breakdownLine(split: { vat: number; fee: number; net: number }) {
    return `My VAT (21%) ${formatEur(split.vat)} · Polar fee ${formatEur(split.fee)} · Orakl ${formatEur(split.net)}`;
  }

  /** The subscribed card's split: the last order when Polar returned one,
   *  else the estimate for that product, each said so. */
  function paidLine(product: "monthly" | "lifetime") {
    const exact = data.breakdown.exact;
    return exact
      ? `Last payment: ${breakdownLine(exact)}`
      : `Estimate: ${breakdownLine(data.breakdown.estimate[product])}`;
  }

  async function subscribeToHost(product: "monthly" | "lifetime") {
    checkingOut = product;
    try {
      const res = await fetch("/api/profile/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      if (res.ok) {
        const d = (await res.json()) as { url: string };
        window.location.href = d.url;
        return;
      }
      const d = await res.json().catch(() => ({}));
      toast.error((d as { error?: string }).error ?? "Failed to start checkout");
    } catch {
      toast.error("Network error");
    } finally {
      checkingOut = null;
    }
  }

  let openingPortal = $state(false);

  async function openPortal() {
    openingPortal = true;
    try {
      const res = await fetch("/api/profile/billing/portal", {
        method: "POST",
      });
      if (res.ok) {
        const d = (await res.json()) as { url: string };
        window.location.href = d.url;
        return;
      }
      const d = await res.json().catch(() => ({}));
      toast.error((d as { error?: string }).error ?? "Failed to open portal");
    } catch {
      toast.error("Network error");
    } finally {
      openingPortal = false;
    }
  }

  $effect(() => {
    if (data.claimed)
      toast.success("Your game results have been saved to your account.");
    if (data.verified) toast.success("Your email is verified.");
  });

  async function requestCuration() {
    requesting = true;
    requestError = "";
    try {
      const res = await fetch("/api/profile/curation-request", {
        method: "POST",
      });
      if (res.ok || res.status === 409) {
        isPending = true;
        toast.info("Request submitted. An admin will review it.");
      } else {
        const d = await res.json().catch(() => ({}));
        requestError =
          (d as { error?: string }).error ?? "Failed to submit request";
        toast.error(requestError);
      }
    } catch {
      requestError = "Network error";
      toast.error(requestError);
    } finally {
      requesting = false;
    }
  }

</script>

<Metatags
  title="Profile"
  description="View and manage your profile information."
/>

{#if !data.user.emailVerified}
  <Card variant="info">
    <div class="flex flex-col gap-2 items-start" role="status">
      <p class="text-base font-medium">Verify your email</p>
      <p class="text-sm text-foreground-darker">
        Confirm your email to secure your account and unlock curation.
      </p>
      <Link href="/verify-email" intent="inline">Verify email</Link>
    </div>
  </Card>
{/if}

<Tabs
  {tabs}
  selected={selectedTab}
  onSelect={selectTab}
  label="Profile sections"
  panelClass="flex flex-col gap-8"
  bleed="-mx-8 px-8 scroll-px-8 md:-mx-1 md:px-1 md:scroll-px-1"
>
  {#snippet panel(key)}
    {#if key === "account"}
      {#if data.welcome}
        <Card variant="success">
          <div class="flex flex-col gap-2 items-start" role="status">
            {#if data.welcome === "lifetime"}
              <h2 class="text-lg font-semibold">Welcome, curator. For life.</h2>
              <p class="text-sm font-sans">
                Hosting is open and never renews. Nothing more to pay.
              </p>
            {:else}
              <h2 class="text-lg font-semibold">Welcome, curator</h2>
              <p class="text-sm font-sans">
                Hosting is open. Your subscription renews on {formatDateShort(
                  data.subscription?.current_period_end ?? "",
                )}.
              </p>
            {/if}
            <Link href="/curator/create" intent="inline">Host a quiz</Link>
          </div>
        </Card>
      {/if}

      {#if data.subscription?.status === "past_due"}
        <PastDueBanner />
      {/if}

      {#if data.allowance && !data.allowance.entitled && !data.allowance.unverified && data.subscription?.status !== "past_due"}
        <Card variant="info">
          <div class="flex flex-col gap-2 items-start" role="status">
            <p class="text-sm font-sans">
              {data.allowance.left} of {data.allowance.limit} free games left.
            </p>
            <Link href="#host" intent="inline">Subscribe to host without limits</Link>
          </div>
        </Card>
      {/if}

      <Card>
        <div class="flex flex-col gap-4 items-start">
          <div class="flex flex-col gap-2">
            <h2 class="text-lg font-semibold">Your details</h2>
            <p class="text-foreground-darker font-sans">
              View or manage your profile information, including your nickname and
              role.
            </p>
          </div>
          <div class="grid grid-cols-2 gap-4 items-baseline">
            <span class="text-foreground-darker justify-self-end">Nickname</span>
            <div class="flex gap-2 items-center">
              <span class="text-lg font-semibold">{data.user.nickname ?? "—"}</span
              ><Badge>{data.user.role}</Badge>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-4 items-start">
          <div class="flex flex-col gap-2">
            <h2 class="text-lg font-semibold">Avatar</h2>
            <p class="text-foreground-darker font-sans">
              Your default avatar for solo play and quiz sessions.
            </p>
          </div>
          <ProfileAvatar profileAvatarId={data.user.avatar} />
        </div>
      </Card>

      {#if ledger}
        <Card variant="ground">
          <h2 class="text-lg font-semibold">{ledger.heading}</h2>
          <p class="text-foreground-darker font-sans">{ledger.blurb}</p>
          <div class="flex flex-col gap-4 items-start">
            <div class="flex flex-wrap gap-4">
              {#if data.uiFlags.PLAYER_HISTORY}
                <Button href="/history" variant="primary">Your history</Button>
              {/if}
              {#if data.uiFlags.SOLO_LEADERBOARDS}
                <Button href="/solo/leaderboard" variant="secondary">Leaderboard</Button>
              {/if}
            </div>
          </div>
        </Card>
      {/if}

      <ChangePassword />

      <Card variant="ground">
        <h2 class="text-lg font-semibold">Active sessions</h2>
        <p class="text-foreground-darker font-sans">
          See every device signed in to your account and sign out any you don't
          recognise.
        </p>
        <Button href="/profile/sessions" variant="secondary">Manage devices</Button>
      </Card>

      {#if data.user.role === "member" || data.user.role === "curator"}
        <Card id="host" variant="ground" class="scroll-mt-[calc(var(--ui-header-height)+1rem)]">
          <div class="flex flex-col gap-4 items-start">
            <h2 class="text-lg font-semibold">Host quizzes</h2>
            {#if data.subscription?.status === "active"}
              <p class="text-sm text-foreground-darker font-sans">
                Hosting is open until {formatDateShort(
                  data.subscription.current_period_end ?? "",
                )}.
              </p>
              <p class="text-xs text-foreground-darker font-sans">
                {paidLine("monthly")}
              </p>
              <Button
                variant="secondary"
                onclick={openPortal}
                disabled={openingPortal}
              >
                {openingPortal ? "Redirecting…" : "Manage subscription"}
              </Button>
            {:else if data.subscription?.status === "lifetime"}
              <p class="text-sm text-foreground-darker font-sans">
                Hosting is open. Lifetime.
              </p>
              <p class="text-xs text-foreground-darker font-sans">
                {paidLine("lifetime")}
              </p>
              <Button
                variant="secondary"
                onclick={openPortal}
                disabled={openingPortal}
              >
                {openingPortal ? "Redirecting…" : "Manage subscription"}
              </Button>
            {:else if data.subscription?.status === "past_due"}
              <p class="text-sm text-foreground-darker font-sans">
                {data.graceOver
                  ? "Hosting is closed until the payment is fixed."
                  : "Hosting stays open for seven days after a failed payment."}
              </p>
              <p class="text-xs text-foreground-darker font-sans">
                {paidLine("monthly")}
              </p>
              <Button
                variant="secondary"
                onclick={openPortal}
                disabled={openingPortal}
              >
                {openingPortal ? "Redirecting…" : "Manage subscription"}
              </Button>
            {:else if !data.user.emailVerified}
              <p class="text-foreground-darker font-sans">
                Verify your email to subscribe.
              </p>
              <Link href="/verify-email" intent="inline">Verify email</Link>
            {:else}
              <p class="text-foreground-darker font-sans">
                Subscribe to host quizzes: €5 a month, or €100 once for life.
                {#if canApplyForCuration && !isPending}
                  Or apply for curator access instead.
                {/if}
              </p>
              <div class="flex flex-col gap-1">
                <p class="text-xs text-foreground-darker font-sans">
                  Monthly estimate: {breakdownLine(data.breakdown.estimate.monthly)}
                </p>
                <p class="text-xs text-foreground-darker font-sans">
                  Lifetime estimate: {breakdownLine(data.breakdown.estimate.lifetime)}
                </p>
              </div>
              <div class="flex flex-wrap gap-2 items-center">
                <Button
                  onclick={() => subscribeToHost("monthly")}
                  disabled={checkingOut !== null}
                >
                  {checkingOut === "monthly"
                    ? "Redirecting…"
                    : "Subscribe to host — €5/mo"}
                </Button>
                <Button
                  variant="secondary"
                  onclick={() => subscribeToHost("lifetime")}
                  disabled={checkingOut !== null}
                >
                  {checkingOut === "lifetime"
                    ? "Redirecting…"
                    : "Subscribe to host — €100 once"}
                </Button>
                {#if canApplyForCuration && !isPending}
                  <Button
                    variant="outline"
                    onclick={requestCuration}
                    disabled={requesting}
                  >
                    {#if requesting}<span class="is-loading"
                        >Submitting request<span>.</span><span>.</span><span
                          >.</span
                        ></span
                      >{:else}Apply for curator{/if}
                  </Button>
                {/if}
              </div>
              {#if canApplyForCuration && isPending}
                <p class="text-sm text-foreground-darker font-sans">
                  Request submitted. An admin will review it.
                </p>
              {/if}
            {/if}
          </div>
        </Card>
      {/if}
    {:else if key === "tools"}
      {#if hasManagementArea}
        <Card>
          <div class="flex flex-col gap-4 items-start">
            <h2 class="text-lg font-semibold">Management</h2>
            <p class="text-foreground-darker font-sans">
              The areas you administer.
            </p>
            <div class="flex flex-wrap gap-2 items-center">
              {#if isAdmin}
                <Button href="/admin/users">User management</Button>
              {/if}
              {#if canManageCategories}
                <Button href="/manage/categories" variant="secondary"
                  >Category management</Button
                >
              {/if}
              {#if canManageAvatars}
                <Button href="/manage/avatars" variant="secondary"
                  >Avatar management</Button
                >
              {/if}
              {#if canModerateQuestions}
                <Button href="/manage/flagged-questions" variant="secondary"
                  >Flagged questions</Button
                >
              {/if}
              {#if canPublishQuestions}
                <Button href="/manage/questions" variant="secondary"
                  >Authored questions</Button
                >
              {/if}
              {#if canManageFlags}
                <Button href="/admin/feature-flags" variant="secondary"
                  >Feature flags</Button
                >
              {/if}
              {#if data.user.role === "admin"}
                <Button href="/admin/settings" variant="secondary">Settings</Button>
              {/if}
              {#if canAccessMimic}
                <Button href="/mimic/quiz/play" variant="outline">Mimic mode</Button>
              {/if}
            </div>
          </div>
        </Card>
      {/if}

      {#if import.meta.env.DEV || canAccessMimic}
        <Card variant="warning">
          <div class="flex flex-col gap-4 items-start">
            <h2 class="text-lg font-semibold">Mimic mode</h2>
            <p class="text-foreground-darker font-sans">
              Fixture routes for UI development. HMR-safe — state is driven by URL
              params.
            </p>
            <div class="flex flex-col gap-1">
              <p
                class="font-medium"
              >
                Quiz
              </p>
              <div class="flex flex-wrap gap-2">
                <Link href="/mimic/quiz/play" class="text-sm text-foreground-darker"
                  >Play</Link
                >
                <Link href="/mimic/quiz/lobby" class="text-sm text-foreground-darker"
                  >Lobby</Link
                >
                <Link
                  href="/mimic/quiz/results"
                  class="text-sm text-foreground-darker">Results</Link
                >
                <Link href="/mimic/quiz/roles" class="text-sm text-foreground-darker"
                  >Roles</Link
                >
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <p
                class="font-medium"
              >
                Solo
              </p>
              <div class="flex flex-wrap gap-2">
                <Link href="/mimic/solo/setup" class="text-sm text-foreground-darker"
                  >Setup</Link
                >
                <Link href="/mimic/solo/play" class="text-sm text-foreground-darker"
                  >Play</Link
                >
                <Link
                  href="/mimic/solo/results"
                  class="text-sm text-foreground-darker">Results</Link
                >
                <Link
                  href="/mimic/solo/leaderboard"
                  class="text-sm text-foreground-darker">Leaderboard</Link
                >
                <Link
                  href="/mimic/history"
                  class="text-sm text-foreground-darker">History</Link
                >
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <p
                class="font-medium"
              >
                Curator
              </p>
              <div class="flex flex-wrap gap-2">
                <Link
                  href="/mimic/curator/play"
                  class="text-sm text-foreground-darker">Play</Link
                >
                <Link
                  href="/mimic/curator/lobby"
                  class="text-sm text-foreground-darker">Lobby</Link
                >
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <p
                class="font-medium"
              >
                Display
              </p>
              <div class="flex flex-wrap gap-2">
                <Link
                  href="/mimic/display/play"
                  class="text-sm text-foreground-darker">Play</Link
                >
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <p
                class="font-medium"
              >
                Errors
              </p>
              <div class="flex flex-wrap gap-2">
                <Link href="/mimic/error/404" class="text-sm text-foreground-darker"
                  >404</Link
                >
                <Link href="/mimic/error/500" class="text-sm text-foreground-darker"
                  >500</Link
                >
              </div>
            </div>
          </div>
        </Card>
      {/if}
    {:else if key === "appearance"}
      {#if themePicker}
        {#await themePicker then { default: ThemePicker }}
          <Card variant="ground">
            <h2 class="text-lg font-semibold">Appearance</h2>
            <p class="text-foreground-darker font-sans">
              Choose background themes, toggle the dynamic sky, and customize your
              experience. Your preferences will be saved for future visits.
            </p>
            <ThemePicker currentMode={data.theme.mode} />
          </Card>
        {:catch}
          <!-- Chunk failed: no Appearance card rather than an uncaught rejection. -->
        {/await}
      {/if}

      <Card variant="ground">
        <h2 class="text-lg font-semibold">Reading font</h2>
        <p class="text-foreground-darker font-sans">
          Switch to a dyslexia-friendly typeface across the app. Your choice is
          saved for future visits.
        </p>
        <FontPicker currentFont={data.font} />
      </Card>
    {:else if key === "privacy"}
      <Card variant="ground">
        <h2 class="text-lg font-semibold">Analytics</h2>
        <p class="text-foreground-darker font-sans">
          We count page views with our own Umami instance. It sets no cookies and
          keeps no persistent identifier; the
          <Link href="https://visitors.nhg.app/share/q2DHFPuApVOJjWhX" intent="inline" class="inline"
            >public dashboard</Link
          > shows everything it records. Turn it off and no measurement script is
          sent to your browser.
        </p>
        <AnalyticsControl analytics={data.analytics} />
      </Card>

      <Card variant="ground">
        <h2 class="text-lg font-semibold">Your data</h2>
        <p class="text-foreground-darker font-sans">
          Download everything we hold about your account as one JSON file: account
          details, signed-in devices, game results, solo runs, flags, custom
          questions and presets.
        </p>
        <ExportDataButton />
      </Card>

      <DeleteAccount />
    {/if}
  {/snippet}
</Tabs>
