export function blurActiveElement(): void {
  if (typeof document === 'undefined') return;
  const active = document.activeElement as { blur?: () => void } | null;
  active?.blur?.();
}
