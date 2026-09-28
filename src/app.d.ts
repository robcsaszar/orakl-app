/// <reference path="../.svelte-kit/ambient.d.ts" />

import type {
  AnalyticsState,
  FontPreference,
  ResolvedTheme,
} from "@orakl/shared";

declare global {
  const __APP_VERSION__: string;
  const __BUILD_DATE__: string;

  // Build-level feature flags (map #859, decision 5). Replaced with a literal
  // at build time by vite.config.ts's BUILD_FLAG_DEFINES, so a false one drops
  // its guarded branch from the bundle. Not runtime flags — never in
  // FLAG_REGISTRY, the feature_flags table, or FEATURE_FLAG_* env.
  const __FEATURE_SKY__: boolean;
  const __FEATURE_PLAYER_EMOTES__: boolean;
  const __FEATURE_SIGNUP_ROLE_SELECTION__: boolean;
  const __FEATURE_WIP_QUESTION_TYPES__: boolean;

  namespace App {
    interface Error {
      message: string;
      eventId?: string;
      stack?: string;
    }
    interface Locals {
      theme: ResolvedTheme;
      font: FontPreference;
      analytics: AnalyticsState;
    }
  }
}
