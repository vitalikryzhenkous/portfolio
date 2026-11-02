// Anonymous event counting via GoatCounter (no cookies). No-op when the counter is absent,
// blocked, or on localhost (count.js skips local hosts), so tests and previews are never counted.
declare global {
  interface Window {
    goatcounter?: { count?: (v: { path: string; title?: string; event?: boolean }) => void };
  }
}

export function track(name: string, title?: string): void {
  try {
    window.goatcounter?.count?.({ path: name, ...(title ? { title } : {}), event: true });
  } catch {
    /* analytics must never break the page */
  }
}
