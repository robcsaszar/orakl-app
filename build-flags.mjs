// Build-level feature flags (map #859, decisions 5 + 7).
//
// A build flag leaves the runtime flag system entirely — no FLAG_REGISTRY
// entry, no feature_flags row, no FEATURE_FLAG_* env override. Set
// BUILD_FEATURE_<NAME>=true at build time to ship the feature; anything else
// keeps it out of the bundle.
//
// The values are literal `define` replacements, so `if (__FEATURE_SKY__)`
// becomes `if (false)` and the guarded branch — including any dynamic import()
// inside it — is dropped by dead-code elimination.
//
// Plain .mjs, not .ts: `node build-ws-server.mjs` imports this directly, and
// that build runs with configFile:false so it inherits no defines of its own.
export const BUILD_FLAGS = [
  "SKY",
  "PLAYER_EMOTES",
  "SIGNUP_ROLE_SELECTION",
  "WIP_QUESTION_TYPES",
];

/** `{ __FEATURE_SKY__: "false", … }` — ready to spread into Vite's `define`. */
export function buildFlagDefines(env = process.env) {
  return Object.fromEntries(
    BUILD_FLAGS.map((name) => [
      `__FEATURE_${name}__`,
      JSON.stringify(env[`BUILD_FEATURE_${name}`] === "true"),
    ]),
  );
}
