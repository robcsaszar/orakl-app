<script lang="ts">
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import { CONTACT } from "@/lib/legal/ledger.js";
  import { CHANGELOG, EFFECTIVE_DATE } from "@/lib/legal/pages.js";
</script>

<Metatags
  title="Terms of service"
  description="The terms governing your use of Orakl."
/>

<article class="prose prose-invert font-sans max-w-none">
  <h1>Terms of service</h1>
  <p><em>Effective {EFFECTIVE_DATE}.</em></p>

  <p>
    Orakl is a casual quiz app run by {CONTACT.company}, {CONTACT.address}. By
    using it you agree to these terms. If you do not agree, do not use the
    service.
  </p>

  <h2 id="who-can-use">Who can use Orakl</h2>
  <p>
    You need an account only to create quizzes. By creating one you confirm you
    are 16 or older. Anyone can join a quiz as a player without an account. We
    do not currently offer the service in India; see the privacy policy for why.
  </p>

  <h2 id="your-account">Your account</h2>
  <p>
    Keep your password to yourself; you are responsible for what happens under
    your account. Tell us at
    <Link href="mailto:{CONTACT.email}" intent="inline" class="inline"
      >{CONTACT.email}</Link
    > if you think it has been used without your permission. You can delete your
    account at any time from your profile page.
  </p>

  <h2 id="hosting-subscription">Hosting subscription</h2>
  <p>
    Creating quizzes needs no payment. Hosting them needs an active subscription
    or a comp grant. A subscription costs €5 a month or €100 once for life, in
    EUR, through Polar's hosted checkout. Polar is the merchant of record: it
    sets and collects the price, carries the applicable tax, and handles
    refunds.
  </p>
  <p>
    A monthly subscription renews automatically until cancelled. If a renewal
    fails, hosting stays open for seven days from the failed charge so you can
    fix your payment method; hosting closes if it is not fixed within that
    window. A lifetime purchase is a one-time charge that never renews and never
    lapses.
  </p>
  <p>
    Cancel or change your payment method at any time through Polar's customer
    portal, linked from your profile page. Cancelling stops the next renewal;
    hosting stays open until the current period ends. Losing hosting, by
    cancellation or a lapsed renewal, never interrupts a game already under way,
    and your quizzes, questions and history stay readable and are restored in
    full if you subscribe again.
  </p>

  <h2 id="acceptable-use">Acceptable use</h2>
  <p>
    Do not use Orakl to break the law, to harass anyone, to upload content you
    have no right to use, or to disrupt the service for others. We may remove
    content or suspend an account that does. Quiz content you create stays
    yours; you grant us only what we need to store and show it within the app.
  </p>

  <h2 id="availability">Availability and changes</h2>
  <p>
    Orakl is provided as is, without warranty, and may change or be unavailable
    at times. We are not liable for indirect or consequential loss arising from
    your use of the service, to the extent the law allows.
  </p>

  <h2 id="privacy">Privacy</h2>
  <p>
    Our <Link href="/legal/privacy" intent="inline" class="inline"
      >privacy policy</Link
    > explains what we collect and your rights over it, and is part of these terms.
  </p>

  <h2 id="governing-law">Governing law</h2>
  <p>
    These terms are governed by the law of Romania, and the courts of Romania
    have jurisdiction, without affecting any mandatory consumer rights you have
    where you live.
  </p>

  <h2 id="changes">Changes to these terms</h2>
  <p>
    When we make a material change we update the effective date and add a line
    to the changelog below; that dated entry on this page is the notice. The
    current version always lives here.
  </p>
  <ul>
    {#each CHANGELOG as entry (entry.date)}
      <li><strong>{entry.date}</strong> — {entry.note}</li>
    {/each}
  </ul>
</article>
