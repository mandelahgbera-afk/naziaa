/* The visitor's cookie choice. "granted" allows the TikTok ad pixel; "essential" also switches off
   Nazia's own anonymous visit statistics. No choice yet: no ad pixel, anonymous statistics only. */
export type Consent = "granted" | "essential" | null;
const KEY = "nz-consent";
export const CONSENT_EVENT = "nz-consent-change";
export const OPEN_CHOICES_EVENT = "nz-consent-open";

export function readConsent(): Consent {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "granted" || v === "essential" ? v : null;
  } catch {
    return null;
  }
}

export function saveConsent(v: Exclude<Consent, null>) {
  try {
    window.localStorage.setItem(KEY, v);
  } catch {}
  // a no also removes TikTok's cookies from before, on this site and its parent domain
  if (v === "essential") {
    const domains = ["", `; domain=.${location.hostname.replace(/^www\./, "")}`];
    for (const name of ["_ttp", "_tt_enable_cookie", "ttcsid"]) for (const d of domains) document.cookie = `${name}=; path=/; max-age=0${d}`;
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/** The browser's "do not sell or share" signal counts as a no. */
export const privacySignal = () => Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl);
