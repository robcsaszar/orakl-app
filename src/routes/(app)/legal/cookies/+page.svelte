<script lang="ts">
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import { anchorFor, LEDGER, type UseCaseId } from "@/lib/legal/ledger.js";
  import { CHANGELOG, EFFECTIVE_DATE } from "@/lib/legal/pages.js";

  // The cookie page is the ledger's cookie and client-storage rows, in order.
  const COOKIE_IDS: UseCaseId[] = [
    "session-cookie",
    "preference-cookies",
    "analytics-cookie",
    "browser-storage",
  ];
  const rows = COOKIE_IDS.map(
    (id) => LEDGER.find((r) => r.id === id),
  ).filter((r): r is NonNullable<typeof r> => r !== undefined);
</script>

<Metatags
  title="Cookie policy"
  description="The cookies and browser storage Orakl uses, and why."
/>

<article class="prose prose-invert font-sans max-w-none">
  <h1>Cookie policy</h1>
  <p><em>Effective {EFFECTIVE_DATE}.</em></p>

  <p>
    Orakl uses a small number of cookies and a little browser storage, all of it
    strictly necessary to run the service or to remember a choice you made. We
    set no advertising or cross-site tracking cookies. Our page-view analytics
    set no cookies at all — see the
    <Link href="/legal/privacy#use-analytics" intent="inline" class="inline"
      >privacy policy</Link
    >.
  </p>

  {#each rows as row (row.id)}
    <section>
      <h2>{row.element}</h2>
      <p>{row.sentence}</p>
      <dl>
        <dt>Set by</dt>
        <dd>{row.parser}</dd>
        <dt>Stored</dt>
        <dd>{row.storage}</dd>
        <dt>Kept for</dt>
        <dd>{row.retention}</dd>
      </dl>
      <p>
        <Link
          href={`/legal/privacy#${anchorFor(row.id)}`}
          intent="inline"
          class="inline">Full entry in the privacy policy</Link
        >.
      </p>
    </section>
  {/each}

  <h2 id="managing">Managing these</h2>
  <p>
    You can clear cookies and browser storage in your browser settings; the
    sign-in cookie is required to stay signed in, so clearing it signs you out.
    Turn analytics off from your profile page or the footer.
  </p>

  <h2 id="changes">Changes to this policy</h2>
  <ul>
    {#each CHANGELOG as entry (entry.date)}
      <li><strong>{entry.date}</strong> — {entry.note}</li>
    {/each}
  </ul>
</article>
