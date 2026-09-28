export function lockBodyScroll(): () => void {
  const current = Number(document.body.dataset.overlayLockCount ?? "0");
  document.body.dataset.overlayLockCount = String(current + 1);
  if (current === 0) document.body.style.overflow = "hidden";
  return () => {
    const next = Math.max(
      0,
      Number(document.body.dataset.overlayLockCount ?? "1") - 1,
    );
    document.body.dataset.overlayLockCount = String(next);
    if (next === 0) {
      delete document.body.dataset.overlayLockCount;
      document.body.style.overflow = "";
    }
  };
}
