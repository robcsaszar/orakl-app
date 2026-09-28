/**
 * Shared countdown timer module.
 * Replaces duplicated setInterval/clearInterval patterns across components.
 */

export interface CountdownTimer {
  /** Start (or restart) the countdown from `duration` seconds. */
  start(duration: number): void;
  /** Stop the countdown and clear the interval. */
  stop(): void;
  /** Whether the timer is currently running. */
  readonly running: boolean;
}

export interface TimerCallbacks {
  /** Called every tick (1s) with the new timeRemaining value. */
  onTick: (timeRemaining: number) => void;
  /** Called when timeRemaining reaches 0. */
  onExpire: () => void;
}

/**
 * Create a countdown timer that decrements every second.
 *
 * Usage:
 * ```ts
 * const timer = createCountdown({
 *   onTick: (t) => { this.timeRemaining = t; },
 *   onExpire: () => { this.handleTimeout(); },
 * });
 * timer.start(30); // 30-second countdown
 * timer.stop();    // cancel early
 * ```
 */
export function createCountdown(callbacks: TimerCallbacks): CountdownTimer {
  let interval: ReturnType<typeof setInterval> | null = null;
  let remaining = 0;

  function stop() {
    if (interval !== null) {
      clearInterval(interval);
      interval = null;
    }
  }

  function start(duration: number) {
    stop();
    remaining = duration;
    interval = setInterval(() => {
      remaining--;
      callbacks.onTick(remaining);
      if (remaining <= 0) {
        stop();
        callbacks.onExpire();
      }
    }, 1000);
  }

  return {
    start,
    stop,
    get running() {
      return interval !== null;
    },
  };
}
