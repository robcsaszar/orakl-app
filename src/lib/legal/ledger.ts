/**
 * Privacy ledger — the single source of truth for every personal-data use
 * case in Orakl (map #840, decisions #12, #13). The legal pages render it,
 * the page-config footer popovers quote its `sentence`, and
 * `tests/legal-ledger.test.ts` keeps it in step with `PAGE_CONFIG` both ways.
 *
 * Each row says what is collected, where the user meets it, how it is
 * parsed, where it is stored, for how long, on what lawful basis, and who
 * else receives it. Anchors on `/legal/privacy` are `use-<id>`.
 *
 * Rows describe the behaviour the privacy-compliance cut-over ships
 * (one branch, one PR — decision #18); until that PR merges the pages that
 * read this file are not served.
 */

export type UseCaseId =
  | "ip"
  | "audit"
  | "location"
  | "device-label"
  | "account"
  | "password"
  | "tokens"
  | "player"
  | "answers"
  | "solo"
  | "flags"
  | "uploads"
  | "questions"
  | "session-cookie"
  | "preference-cookies"
  | "analytics-cookie"
  | "browser-storage"
  | "analytics"
  | "errors"
  | "feedback"
  | "billing"
  | "server-logs";

export type LawfulBasis =
  | "contract"
  | "legitimate-interest"
  | "consent"
  | "strictly-necessary";

export type LedgerRow = {
  id: UseCaseId;
  /** What is collected, as a short noun phrase. */
  element: string;
  /** One sentence for the footer popover: what this page collects and why. */
  sentence: string;
  /** Pages where the user meets this use case. Concrete paths; each must
   *  resolve to a `PAGE_CONFIG` entry that declares the id under
   *  `footer.useCases`. Omit for rows that apply to every page. */
  routes?: string[];
  /** True for rows that apply to every page (no per-route notice). */
  everywhere?: true;
  /** How the value is obtained or parsed — own code, a named library, a raw
   *  header, a browser API. */
  parser: string;
  /** Where it is stored, or "not stored". */
  storage: string;
  /** How long it is kept and what removes it. */
  retention: string;
  basis: LawfulBasis;
  /** Third parties that receive it, by processor name. */
  recipients?: string[];
  /** True when the row exists only after an explicit opt-in. */
  optIn?: true;
};

export const anchorFor = (id: UseCaseId): string => `use-${id}`;

export const LEDGER: readonly LedgerRow[] = [
  {
    id: "ip",
    element: "Your IP address, in memory only",
    sentence:
      "Every request carries your IP address; we use it in memory to slow down abuse and do not store it.",
    everywhere: true,
    parser:
      "The Fly-Client-IP header our hosting proxy sets on each request; no library.",
    storage:
      "Not stored. Held in an in-memory rate limiter on the server; it is never written to the database unless you opt in to sign-in locations (see the security log).",
    retention: "About an hour after your last request, then dropped.",
    basis: "legitimate-interest",
  },
  {
    id: "audit",
    element: "Security log of sign-in events",
    sentence:
      "Sign-ins, sign-outs and password changes are logged with the time and your account; your IP address is included only if you opted in to sign-in locations (that part rests on your consent).",
    routes: ["/login", "/signup", "/profile"],
    parser:
      "Written by our own server code when an account event happens; the IP comes from the Fly-Client-IP header. Failed sign-ins and failed sign-ups record no IP and no email address.",
    storage: "The audit_log table in our database.",
    retention:
      "90 days, then pruned. Removed when you delete your account. IP addresses are erased at once when you turn sign-in locations off.",
    basis: "legitimate-interest",
  },
  {
    id: "location",
    element: "Sign-in location (city)",
    sentence:
      "If you opt in, each sign-in is labelled with its city so you can recognise your devices; the label is fixed at sign-in and the IP address is discarded.",
    routes: ["/login", "/profile/sessions"],
    parser:
      'Your IP address is looked up, on our server, in an offline copy of MaxMind\'s GeoLite2 City and Country databases and reduced to "City, Country"; the IP itself is not kept. This product includes GeoLite2 data created by MaxMind.',
    storage: "The location column of your session row.",
    retention:
      "As long as the session lives (at most 30 days). Erased at once when you turn sign-in locations off or delete your account.",
    basis: "consent",
    optIn: true,
  },
  {
    id: "device-label",
    element: "Device label for each session",
    sentence:
      'Each sign-in is labelled "Browser on OS" so you can tell your devices apart on the sessions page.',
    routes: ["/login", "/signup", "/profile/sessions"],
    parser:
      "Our own pattern match on the browser's User-Agent header; only the browser and operating system names are kept, never the header itself.",
    storage: "The label column of your session row.",
    retention:
      "Until you sign that device out, revoke it, or the session expires after 30 days.",
    basis: "contract",
  },
  {
    id: "account",
    element: "Email address, nickname and avatar",
    sentence:
      "Creating an account stores your email address, a nickname and an avatar choice; the email is used to verify the account and reset the password.",
    routes: ["/signup", "/profile"],
    parser:
      "Typed into the sign-up and profile forms; the email is lower-cased and checked with our own pattern, the nickname passes our own sanitiser.",
    storage: "The users table in our database.",
    retention: "Until you delete your account.",
    basis: "contract",
    recipients: ["Resend"],
  },
  {
    id: "billing",
    element: "Subscription status and payment provider customer id",
    sentence:
      "Subscribing to host sends your email address and account id to Polar, our payment provider and merchant of record, and stores the subscription status and the customer id Polar gives back.",
    routes: ["/profile", "/billing/return"],
    parser:
      "Read from Polar's Customer State and its signed webhook events; the account id travels as the external customer id so the record can be read back.",
    storage: "The subscriptions table in our database.",
    retention:
      "Until you delete your account, which also deletes the Polar customer with anonymisation.",
    basis: "contract",
    recipients: ["Polar"],
  },
  {
    id: "password",
    element: "Password",
    sentence:
      "Your password is stored only as a hash, and a fragment of it is checked against a public breach list before it is accepted.",
    routes: ["/signup", "/reset-password", "/profile"],
    parser:
      "Hashed on our server with argon2id (the @node-rs/argon2 library). Before a new password is accepted, the first five characters of its SHA-1 hash are sent to Have I Been Pwned's range service (k-anonymity); the password itself never leaves our server.",
    storage:
      "The password hash in the users table; the plain password is never stored.",
    retention: "Until you change it or delete your account.",
    basis: "contract",
    recipients: ["Have I Been Pwned"],
  },
  {
    id: "tokens",
    element: "Email verification codes and password-reset links",
    sentence:
      "Verifying your email or resetting your password creates a short-lived code that is emailed to you and stored only as a hash.",
    routes: ["/signup", "/forgot-password", "/reset-password", "/verify-email"],
    parser:
      "Random values generated on our server and hashed before storage; the plain code or link goes only into the email we send you.",
    storage: "Hashed rows in our database; the email passes through Resend.",
    retention:
      "Verification codes expire after 15 minutes, reset links after an hour; a daily sweep deletes expired rows, and all are removed when you delete your account.",
    basis: "contract",
    recipients: ["Resend"],
  },
  {
    id: "player",
    element: "Player nickname and avatar",
    sentence:
      "Joining a quiz needs only a nickname and an avatar; they appear to the other players, in the curator's chronicle of the game, and in each co-player's own history as that night's standings.",
    routes: ["/join"],
    parser:
      "Typed into the join form and passed through our own nickname sanitiser; no account is needed.",
    storage:
      "In memory while the lobby lives, then in the game results of finished games.",
    retention:
      'Game results are kept indefinitely as history. If you later link an account and delete it, your nickname on those results is replaced with "Deleted player" and your avatar is removed; scores and answers stay as anonymised history.',
    basis: "contract",
  },
  {
    id: "answers",
    element: "Answers and scores per game",
    sentence:
      "Each answer you give, your score and your rank are recorded so the game can be replayed as history.",
    routes: [
      "/quiz/play",
      "/quiz/results",
      "/history",
      "/history/game/1",
      "/curator/history",
      "/curator/history/1",
    ],
    parser: "Recorded by our own game server as you answer.",
    storage: "The game results in our database.",
    retention:
      'Indefinitely. When you delete your account the link to it is removed and your nickname on each result is replaced with "Deleted player"; scores and answers stay as anonymised history. You can download them first from your profile page.',
    basis: "contract",
  },
  {
    id: "solo",
    element: "Solo runs and attention signals",
    sentence:
      "A solo run records your answers, timings and whether you left the tab, so scores are fair and the leaderboard is honest.",
    routes: [
      "/solo/play",
      "/solo/results",
      "/solo/leaderboard",
      "/history",
      "/history/solo/1",
    ],
    parser:
      "Sent by the page from the browser's visibility and focus events and its own timers; the device class (phone, tablet, desktop) comes from the viewport width, not from any identifier.",
    storage: "The solo sessions and attempts tables in our database.",
    retention:
      "Indefinitely; flagged runs are kept for review. When you delete your account the link to it is removed and the runs leave the leaderboard; scores and timings stay as anonymised history. You can download them first from your profile page.",
    basis: "legitimate-interest",
  },
  {
    id: "flags",
    element: "Question flags",
    sentence:
      "Flagging a question stores the flag, your reason and the answer you chose so an admin can review it.",
    routes: ["/quiz/results", "/solo/results", "/history/game/1"],
    parser: "Submitted from the results page through our own form.",
    storage: "The question flags table in our database.",
    retention: "Until you delete your account.",
    basis: "legitimate-interest",
  },
  {
    id: "uploads",
    element: "Quiz images",
    sentence:
      "Images you upload for a quiz are re-encoded with their hidden metadata removed and stored in a private bucket.",
    routes: ["/curator/create"],
    parser:
      "Decoded and re-encoded on our server with the sharp library, which drops EXIF (including GPS), ICC and XMP metadata before storage; animated files and files whose contents do not match their type are refused.",
    storage:
      "A private Cloudflare R2 bucket that nobody can browse; pages show an image through a signed link on our own domain that expires after four hours.",
    retention:
      "The file stays in the private bucket after its question is deleted; nothing links to it any more and it cannot be reached without a signed link. Ask us to remove a file outright.",
    basis: "contract",
    recipients: ["Cloudflare"],
  },
  {
    id: "questions",
    element: "Custom questions and quiz presets",
    sentence:
      "Questions and presets you create are stored under your account; an operator granted the publish power can read every curator's questions. An operator can promote a question into the shared bank, where every curator's games draw it, or withdraw it again; the author stays recorded.",
    routes: ["/curator/create", "/curator/questions", "/manage/questions"],
    parser: "Submitted through our own forms and sanitised.",
    storage:
      "The questions and presets tables in our database. Prior versions of an edited question are kept alongside it.",
    retention:
      "Until you delete them or your account. A question an operator promoted into the shared bank stays after your account is deleted, with your name removed from it and from its history.",
    basis: "contract",
  },
  {
    id: "session-cookie",
    element: "Sign-in cookie",
    sentence:
      "A signed cookie keeps you signed in, or keeps you in the quiz you joined.",
    everywhere: true,
    parser:
      "A token signed on our server; it carries your role and a session id, no personal details.",
    storage: "A cookie in your browser (HttpOnly).",
    retention:
      "30 days for accounts, 4 hours for players, 8 hours for display screens.",
    basis: "strictly-necessary",
  },
  {
    id: "preference-cookies",
    element: "Theme, font and system-preference cookies",
    sentence:
      "Your theme and font choices are kept in cookies so pages render your way before any script runs.",
    routes: ["/profile"],
    parser:
      "Set by our server when you pick a theme or font, and by a small inline script that records your system's light-or-dark preference.",
    storage: "Cookies in your browser.",
    retention: "One year.",
    basis: "strictly-necessary",
  },
  {
    id: "analytics-cookie",
    element: "Analytics opt-out cookie",
    sentence:
      "Turning analytics off sets one cookie (orakl-analytics) that tells our server not to send the measurement script; turning it back on removes the cookie.",
    everywhere: true,
    parser: "Set by our server when you use the analytics control.",
    storage: "A cookie in your browser.",
    retention: "One year.",
    basis: "strictly-necessary",
  },
  {
    id: "browser-storage",
    element: "Browser storage for your quiz state",
    sentence:
      "Your nickname, avatar, a random device id and the state of the quiz you are in are kept in your browser so a refresh does not lose them.",
    routes: ["/join"],
    parser:
      "Written by the page with the browser's localStorage and sessionStorage APIs; the device id is a random value with no link to you.",
    storage:
      "Your browser only; the device id is never written to our database.",
    retention:
      "Session storage clears when the tab closes; local storage stays until you clear it.",
    basis: "strictly-necessary",
  },
  {
    id: "analytics",
    element: "Page views (Umami)",
    sentence:
      "We count page views with a self-hosted Umami instance that sets no cookies; you can turn it off from your profile page, and a browser that sends Global Privacy Control or Do Not Track never receives the script.",
    everywhere: true,
    parser:
      "The Umami script sends the page path, referrer, browser, operating system, device type and country; visitors are counted by a salted hash of IP and browser that rotates, so no persistent identifier exists. Browsers that send Global Privacy Control or Do Not Track never receive the script.",
    storage:
      "Our own Umami instance; the public dashboard is at https://visitors.nhg.app/share/q2DHFPuApVOJjWhX.",
    retention: "Aggregate statistics only.",
    basis: "legitimate-interest",
  },
  {
    id: "errors",
    element: "Error reports (Sentry)",
    sentence:
      "When something breaks, the error message, stack trace and route are sent to our own Sentry instance so we can fix it.",
    everywhere: true,
    parser:
      "The Sentry SDK in the page and on the server; no user identifier is attached and default personal data collection is off.",
    storage: "Our self-hosted Sentry instance.",
    retention: "Sentry's default event retention.",
    basis: "legitimate-interest",
  },
  {
    id: "feedback",
    element: "Feedback reports (holders of can-send-feedback only)",
    sentence:
      "Feedback sent from the widget becomes a GitHub issue with the route, the element and your nickname (or your user id when you have none).",
    // The FAB mounts in the root layout, so a holder meets it on every page —
    // naming a handful of routes would understate where it is offered.
    everywhere: true,
    parser:
      "Submitted through the feedback widget; the server attaches your nickname or user id, never your email address.",
    storage: "A private GitHub repository.",
    retention: "As long as the issue exists.",
    basis: "legitimate-interest",
    recipients: ["GitHub"],
  },
  {
    id: "server-logs",
    element: "Request logs",
    sentence:
      "Our server logs the method, path, status and duration of each request; no IP address or user agent.",
    everywhere: true,
    parser: "Written by our own request logger.",
    storage: "The hosting provider's log stream.",
    retention: "The hosting provider's default; not shipped elsewhere.",
    basis: "legitimate-interest",
  },
];

export type Processor = {
  name: string;
  purpose: string;
  /** Where the data is processed and under which transfer mechanism. */
  location: string;
  /** The contractual footing, stated plainly, gaps included. */
  agreement: string;
};

export const PROCESSORS: readonly Processor[] = [
  {
    name: "Turso (database)",
    purpose: "Hosts the database: accounts, sessions, results, questions.",
    location: "European Union.",
    agreement:
      "No data-processing agreement is available on our current plan; we will move to a plan that includes one before public release.",
  },
  {
    name: "Polar (payments)",
    purpose:
      "Takes payment for the hosting subscription and holds the billing record. Polar is the merchant of record: it sets and collects the price, carries the tax, and handles refunds.",
    location: "European Union.",
    agreement:
      "Polar's data-processing agreement has not yet been reviewed; it will be before public release.",
  },
  {
    name: "Cloudflare R2 (image storage)",
    purpose: "Stores uploaded quiz images.",
    location:
      "European Union jurisdiction; Cloudflare is certified under the EU–US Data Privacy Framework.",
    agreement: "Data-processing agreement accepted.",
  },
  {
    name: "Fly.io (hosting)",
    purpose: "Runs the application server.",
    location:
      "London; Fly.io is certified under the EU–US Data Privacy Framework.",
    agreement:
      "Data-processing agreement accepted; logs are not shipped elsewhere.",
  },
  {
    name: "Resend (email delivery)",
    purpose: "Sends verification and password-reset emails.",
    location:
      "European Union region; Resend's own sub-processors are in the United States under standard contractual clauses.",
    agreement: "Data-processing agreement accepted.",
  },
  {
    name: "Have I Been Pwned (password breach check)",
    purpose:
      "Receives the first five characters of a SHA-1 hash of a new password to check it against known breaches.",
    location: "Public API; the fragment cannot identify you or the password.",
    agreement: "No personal data is transferred.",
  },
  {
    name: "GitHub (feedback issues)",
    purpose: "Stores admin feedback reports as issues in a private repository.",
    location:
      "United States; GitHub is certified under the EU–US Data Privacy Framework.",
    agreement: "GitHub's terms of service.",
  },
];

export const CONTACT = {
  company: "NHG Design SRL",
  name: "Rob Csaszar",
  email: "privacy@orakl.quest",
  address: "Soarelui 25, Giarmata, Timis, Romania",
  /** Response window stated in the policy, in days. */
  responseDays: 15,
  ukRepresentative:
    "No UK representative is appointed yet; one will be when Orakl has material use in the United Kingdom.",
} as const;
