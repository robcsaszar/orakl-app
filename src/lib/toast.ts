import { toast as sonner } from "svelte-sonner";
import { tv } from "tailwind-variants";
import Spinner from "./components/ui/Spinner.svelte";

export const toastVariants = tv({
  base: "rounded-2xl corner-shape-squircle p-3 text-sm font-medium font-sans flex items-center gap-2 backdrop-blur-sm backdrop-saturate-150 border",
  variants: {
    variant: {
      success: "bg-success/20 text-success-light border-success/30",
      error: "bg-danger/20 text-danger-light border-danger/30",
      warning: "bg-yellow-950 text-yellow-300 border-yellow-800/30",
      info: "bg-secondary-800/20 text-violet-400 border-secondary/30",
      loading: "bg-secondary-800/20 text-violet-400 border-secondary/30",
    },
  },
});

type ExtraOpts = Parameters<typeof sonner>[1];
type Variant = "success" | "error" | "warning" | "info" | "loading";

const cls = (variant: Variant) =>
  ({
    unstyled: true,
    classes: {
      toast: toastVariants({ variant }),
      // `unstyled` drops sonner's own button rules, so an action toast needs
      // its button dressed here or it renders as bare text.
      actionButton:
        "rounded-lg corner-shape-squircle border border-current/30 bg-current/10 px-2 py-1 text-xs font-semibold shrink-0 hover:bg-current/20 transition-colors",
    },
    // A toast morphing in place (same id) keeps stale fields from its
    // previous state unless overwritten — clear the loading spinner icon
    // explicitly so success/error/etc. fall back to their default icon.
    icon: variant === "loading" ? Spinner : undefined,
  }) as ExtraOpts;

// Loading toasts that resolve to success/error almost instantly (e.g. a fast
// server action) just flash on screen. Keep a loading toast up for at least
// this long, and morph it in place (same id) instead of dismiss + re-add.
const MIN_LOADING_VISIBLE_MS = 500;
const loadingShownAt = new Map<string | number, number>();

function settle(id: string | number | undefined, fire: () => void) {
  if (id === undefined) {
    fire();
    return;
  }
  const shownAt = loadingShownAt.get(id);
  if (shownAt === undefined) {
    fire();
    return;
  }
  loadingShownAt.delete(id);
  const remaining = MIN_LOADING_VISIBLE_MS - (Date.now() - shownAt);
  if (remaining > 0) setTimeout(fire, remaining);
  else fire();
}

export const toast = {
  success: (msg: string, opts?: ExtraOpts) =>
    settle(opts?.id, () => sonner.success(msg, { ...cls("success"), ...opts })),
  error: (msg: string, opts?: ExtraOpts) =>
    settle(opts?.id, () => sonner.error(msg, { ...cls("error"), ...opts })),
  warning: (msg: string, opts?: ExtraOpts) =>
    sonner.warning(msg, { ...cls("warning"), ...opts }),
  info: (msg: string, opts?: ExtraOpts) =>
    sonner(msg, { ...cls("info"), ...opts }),
  loading: (msg: string, opts?: ExtraOpts) => {
    const id = sonner.loading(msg, { ...cls("loading"), ...opts });
    loadingShownAt.set(id, Date.now());
    return id;
  },
  dismiss: sonner.dismiss,
};
