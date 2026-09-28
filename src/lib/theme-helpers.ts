import type { SkyPhase } from "@orakl/shared";
import { effectiveThemeForPhase, getSkyPhase } from "@orakl/shared";

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getEffectivePhase(mode: string): string {
  if (mode === "dark") return "night";
  if (mode === "light") return "morning";
  if (mode === "dynamic") return getSkyPhase(new Date().getHours());
  if (mode === "system") {
    return systemPrefersDark() ? "night" : "morning";
  }
  return mode;
}

export async function applyTheme(mode: string) {
  const phase = getEffectivePhase(mode);
  const effective = effectiveThemeForPhase(phase as SkyPhase);

  const html = document.documentElement;
  html.dataset.themeMode = mode;
  html.dataset.effectiveTheme = effective;
  html.dataset.skyPhase = phase;

  try {
    const body: Record<string, string> = { mode };
    if (mode === "system") {
      body.sysPref = systemPrefersDark() ? "dark" : "light";
    }
    await fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Non-critical; cookie will be set on next full navigation
  }
}
