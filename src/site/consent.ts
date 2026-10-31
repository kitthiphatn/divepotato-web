// Visitor's cookie choices (PDPA), same behaviour as the Lomprayah site. Analytics scripts must
// check this before loading.
export type Consent = { analytics: boolean; marketing: boolean; at: string; v: 1 }

export const CONSENT_COOKIE = 'dp_consent'
export const CONSENT_CHANGE_EVENT = 'dp-consent-change'
export const CONSENT_OPEN_EVENT = 'dp-consent-open'

export function readConsent(): Consent | null {
  if (typeof document === 'undefined') return null
  const raw = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
  if (!raw) return null
  try {
    const value = JSON.parse(decodeURIComponent(raw.slice(CONSENT_COOKIE.length + 1)))
    return value?.v === 1 ? (value as Consent) : null
  } catch {
    return null
  }
}

export function writeConsent(choice: { analytics: boolean; marketing: boolean }): Consent {
  const consent: Consent = { ...choice, at: new Date().toISOString(), v: 1 }
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; path=/; max-age=${maxAge}; samesite=lax`
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: consent }))
  return consent
}

// True when now falls inside the optional start/end window set in the backoffice
export function isWithinWindow(startsAt?: string | null, endsAt?: string | null): boolean {
  const now = Date.now()
  if (startsAt && new Date(startsAt).getTime() > now) return false
  if (endsAt && new Date(endsAt).getTime() < now) return false
  return true
}
