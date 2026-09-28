import type { FontPreference } from "@orakl/shared";

/** Set the live `data-font` attribute and persist the choice via cookie. */
export async function applyFont(font: FontPreference) {
  document.documentElement.dataset.font = font;
  try {
    await fetch("/api/font", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ font }),
    });
  } catch {
    // Non-critical; cookie will be set on next full navigation.
  }
}
