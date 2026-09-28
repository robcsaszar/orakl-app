<script lang="ts">
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import {
    anchorFor,
    CONTACT,
    LEDGER,
    PROCESSORS,
  } from "@/lib/legal/ledger.js";
  import { basisLabel, CHANGELOG, EFFECTIVE_DATE } from "@/lib/legal/pages.js";

  // Single source: the dashboard URL lives in the analytics ledger row.
  const dashboard =
    LEDGER.find((r) => r.id === "analytics")?.storage.match(
      /https:\/\/\S+[^.\s]/,
    )?.[0] ?? "";
</script>

<Metatags
  title="Privacy policy"
  description="What Orakl collects, how it is used and stored, and your rights."
/>

<article class="prose prose-invert font-sans max-w-none">
  <h1>Privacy policy</h1>
  <p><em>Effective {EFFECTIVE_DATE}.</em></p>

  <p>
    This policy describes exactly what Orakl does with personal data. Every use
    case is listed below with where you meet it, how it is obtained, where it is
    stored, for how long, and on what legal basis. We store no IP address
    anywhere unless you ask us to, by turning on sign-in locations.
  </p>

  <h2 id="who-we-are">Who we are</h2>
  <p>
    Orakl is run by {CONTACT.company}, {CONTACT.address}. {CONTACT.name} is the
    person responsible for data protection and answers as the data protection
    contact for Singapore, the point of contact for Brazil, and the grievance
    officer for India.
  </p>
  <p>
    Reach us about anything in this policy at
    <Link href="mailto:{CONTACT.email}" intent="inline" class="inline"
      >{CONTACT.email}</Link
    >. We reply within {CONTACT.responseDays} days.
  </p>

  <h2 id="your-rights">Your rights and how to use them</h2>
  <p>
    You can see, correct, download or delete your data. If you have an account,
    the fastest routes are built in: <strong>download my data</strong> and
    <strong>delete account</strong> on your profile page, and the sign-in
    locations and analytics controls described below. For anything else, email
    us and we will act within {CONTACT.responseDays} days.
  </p>
  <p>
    Depending on where you live you may have the right to access, correct,
    delete, port, object to or restrict processing, and to withdraw a consent
    you gave. Using a right never costs you the service, and we will not treat
    you differently for exercising one.
  </p>

  <h2 id="what-we-hold">What we hold, and why</h2>
  <p>
    Each entry is a thing we hold, linked from the footer of the page where you
    meet it.
  </p>

  {#each LEDGER as row (row.id)}
    <section id={anchorFor(row.id)}>
      <h3>{row.element}</h3>
      <p>{row.sentence}</p>
      <dl>
        <dt>How it is obtained</dt>
        <dd>{row.parser}</dd>
        <dt>Where it is stored</dt>
        <dd>{row.storage}</dd>
        <dt>How long we keep it</dt>
        <dd>{row.retention}</dd>
        <dt>Legal basis</dt>
        <dd>
          {basisLabel[row.basis]}{#if row.optIn}, given when you turn the feature
            on and withdrawn when you turn it off{/if}.
        </dd>
        {#if row.recipients && row.recipients.length > 0}
          <dt>Shared with</dt>
          <dd>{row.recipients.join(", ")} (see processors below).</dd>
        {/if}
      </dl>
    </section>
  {/each}

  <h2 id="analytics-dashboard">Analytics dashboard</h2>
  <p>
    Our page-view analytics are public. See exactly what is counted at
    <Link href={dashboard} intent="inline" class="inline">{dashboard}</Link>.
    Turn analytics off from your profile page or the footer; a browser that
    sends Global Privacy Control or Do Not Track never receives the script.
  </p>

  <h2 id="processors">Who else processes your data</h2>
  <p>These are the only third parties involved, and on what footing.</p>
  <ul>
    {#each PROCESSORS as p (p.name)}
      <li>
        <strong>{p.name}</strong> — {p.purpose} {p.location} {p.agreement}
      </li>
    {/each}
  </ul>
  <p>
    Umami (page views) and Sentry (error reports) are our own self-hosted tools,
    not third-party services; nothing about you leaves our own infrastructure
    for them.
  </p>

  <h2 id="transfers">International transfers</h2>
  <p>
    Data is processed in the European Union or the United Kingdom. Some
    providers are US companies certified under the EU–US Data Privacy Framework
    (Cloudflare, Fly.io, GitHub); Resend uses standard contractual clauses for
    its US sub-processors. No personal data is transferred to MaxMind or Have I
    Been Pwned. The footing for each is stated in the processors list above.
  </p>

  <h2 id="eea">If you are in the EEA (GDPR)</h2>
  <p>
    {CONTACT.company} is the controller. The legal bases we rely on are named
    for each entry above. You have the rights of access, rectification, erasure,
    restriction, portability and objection, and the right to withdraw consent
    where we rely on it (sign-in locations). You can complain to your local
    supervisory authority; ours is the Romanian ANSPDCP
    (<Link href="https://www.dataprotection.ro" intent="inline" class="inline"
      >dataprotection.ro</Link
    >).
  </p>

  <h2 id="uk">If you are in the United Kingdom</h2>
  <p>
    The same rights apply under the UK GDPR. You can complain to the Information
    Commissioner's Office
    (<Link href="https://ico.org.uk" intent="inline" class="inline">ico.org.uk</Link>).
    {CONTACT.ukRepresentative}
  </p>

  <h2 id="california">If you are in California</h2>
  <p>
    We do not sell or share your personal information, and we show no
    cross-context behavioural advertising. You may request access to or deletion
    of your information and are entitled not to be discriminated against for
    doing so. Email us to exercise these rights. If email and password are ever
    exposed in a breach, we notify affected California residents within 30 days.
  </p>

  <h2 id="brazil">Brazil (LGPD)</h2>
  <p>
    <em>This annex is pending review by Brazilian counsel.</em> If you are in
    Brazil, {CONTACT.company} processes your data under the bases named above,
    and you have the rights of confirmation, access, correction, anonymisation,
    portability, deletion and information about sharing. Contact us at
    {CONTACT.email}; we respond within {CONTACT.responseDays} days.
  </p>

  <h2 id="india">India (DPDP)</h2>
  <p>
    <em>This annex is pending review by Indian counsel.</em> The Indian Digital
    Personal Data Protection Act is not yet fully in force, and its rules treat
    everyone under 18 as a child requiring verifiable parental consent, which we
    do not operate. Until the rules are in force we exclude India in our terms
    and do not offer the service there. {CONTACT.name} is the grievance officer.
  </p>

  <h2 id="singapore">Singapore (PDPA)</h2>
  <p>
    <em>This annex is pending review by Singapore counsel.</em> {CONTACT.name}
    acts as our data protection officer for the PDPA. You may request access to
    or correction of your personal data at {CONTACT.email}. If a notifiable data
    breach occurs, we notify the PDPC and affected individuals as the PDPA
    requires.
  </p>

  <h2 id="children">Children</h2>
  <p>
    Accounts are for people 16 or older. You confirm your age when you create an
    account; we do not ask for or store a birth date. Playing a quiz needs no
    account and no age. If we learn that an account holder is under 16, we delete
    the account and its linked history within {CONTACT.responseDays} days.
  </p>

  <h2 id="changes">Changes to this policy</h2>
  <p>
    When we make a material change we update the effective date and add a line
    to the changelog below. We do not email you; the current version always
    lives on this page.
  </p>
  <ul>
    {#each CHANGELOG as entry (entry.date)}
      <li><strong>{entry.date}</strong> — {entry.note}</li>
    {/each}
  </ul>
</article>
