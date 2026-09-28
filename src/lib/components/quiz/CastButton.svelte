<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { storage } from "$lib/storage";
  import { cn } from "tailwind-variants";

  interface Props {
    size?: "sm" | "md";
    /** "header": unstyled text-register recipe for header nav; "button": default filled Button. */
    register?: "button" | "header";
  }

  let { size = "md", register = "button" }: Props = $props();

  let isSupported = $state(false);
  let isConnected = $state(false);
  let isCasting = $state(false);
  let _displayUrl: string | null = null;
  let _request: PresentationRequest | null = null;
  let _connection: PresentationConnection | null = null;

  onMount(async () => {
    const isMobile =
      /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
    isSupported =
      !isMobile &&
      typeof PresentationRequest !== "undefined" &&
      typeof navigator.presentation !== "undefined";

    if (!isSupported) return;

    const storedId = storage.getCastId();
    if (storedId) {
      try {
        const url = await getDisplayUrl();
        if (!url) return;
        _request = new PresentationRequest([url]);
        _connection = await _request.reconnect(storedId);
        isConnected = true;
        setupHandlers();
      } catch {
        storage.removeCastId();
      }
    }
  });

  onDestroy(() => stopCast());

  function setupHandlers() {
    if (!_connection) return;
    _connection.onclose = () => {
      isConnected = false;
      _connection = null;
      storage.removeCastId();
    };
    _connection.onterminate = () => {
      isConnected = false;
      _connection = null;
      storage.removeCastId();
    };
  }

  async function getDisplayUrl(): Promise<string | null> {
    if (_displayUrl) return _displayUrl;
    try {
      const res = await fetch("/api/curator/display-token", { method: "POST" });
      if (res.ok) {
        const { url } = await res.json();
        if (url) {
          _displayUrl = url;
          return url;
        }
      }
    } catch {
      // no active lobby or network error
    }
    return null;
  }

  async function startCast() {
    if (isCasting) return;
    isCasting = true;
    try {
      const displayUrl = await getDisplayUrl();
      if (!displayUrl) return;
      if (!isSupported) {
        window.open(displayUrl, "orakl-display", "noopener,noreferrer");
        return;
      }
      try {
        _request = new PresentationRequest([displayUrl]);
        _connection = await _request.start();
        isConnected = true;
        storage.setCastId(_connection.id);
        setupHandlers();
      } catch {}
    } finally {
      isCasting = false;
    }
  }

  function stopCast() {
    if (_connection) {
      _connection.terminate();
      _connection = null;
    }
    storage.removeCastId();
    isConnected = false;
  }

  function handleClick() {
    if (!isSupported) {
      startCast();
    } else if (isConnected) {
      stopCast();
    } else {
      startCast();
    }
  }

  const tooltip = $derived(
    !isSupported
      ? "Open display in new tab"
      : isConnected
        ? "Stop casting"
        : "Cast to display",
  );

  const label = $derived(
    !isSupported
      ? "Display"
      : isConnected
        ? size === "sm" ? "Stop" : "Stop cast"
        : "Cast",
  );
</script>

<Button
  type="button"
  unstyled={register === "header"}
  variant={register === "header" ? undefined : isConnected && isSupported ? "secondary" : "ghost"}
  class={register === "header"
    ? cn(
        "inline-flex items-center gap-1.5 -mx-1.5 px-1.5 hover:text-foreground",
        isConnected && isSupported ? "text-secondary" : "text-foreground-darker",
      )
    : undefined}
  loading={isCasting}
  onclick={handleClick}
  data-tooltip={tooltip}
  aria-label={tooltip}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class={register === "header" ? "size-4" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"}
    viewBox="0 0 24 24"
    stroke-width="2"
    stroke="currentColor"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
    <path d="M3 19l.01 0"></path>
    <path d="M7 19a4 4 0 0 0 -4 -4"></path>
    <path d="M11 19a8 8 0 0 0 -8 -8"></path>
    <path d="M15 19h6V5H3v2"></path>
  </svg>
  {label}
</Button>
