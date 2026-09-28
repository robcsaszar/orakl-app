let wakeLock: WakeLockSentinel | null = null;
let keepActive = false;

export async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  keepActive = true;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch {
    // Permission denied or not available
  }
}

export async function releaseWakeLock() {
  keepActive = false;
  await wakeLock?.release();
  wakeLock = null;
}

// Re-acquire when tab becomes visible (browser auto-releases on hide)
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && keepActive && !wakeLock) {
      requestWakeLock();
    }
  });
}
