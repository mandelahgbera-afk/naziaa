/** ISO timestamp for n days ago (kept out of components so render stays pure). */
export function daysAgoIso(n: number) {
  return new Date(Date.now() - n * 864e5).toISOString();
}

export function isFresh(iso: string, minutes: number, now = Date.now()) {
  return now - new Date(iso).getTime() < minutes * 60_000;
}

/** Day boundaries for dashboard windows, in the server's local time. */
export function dashboardWindow(days = 14) {
  const since = new Date(Date.now() - (days - 1) * 864e5);
  since.setHours(0, 0, 0, 0);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  return { since, startOfToday, weekAgo, now: new Date() };
}

/** Whole days between an ISO timestamp and now. */
export function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
}
