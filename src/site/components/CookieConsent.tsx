'use client'

import { useEffect, useState } from 'react'

import { CONSENT_OPEN_EVENT, readConsent, writeConsent } from '@/site/consent'

type Labels = {
  message: string
  policy: string
  settings: string
  acceptAll: string
  optional: string
  optionalDesc: string
  save: string
}

// PDPA cookie banner: shown until the visitor chooses; "ตั้งค่าคุกกี้" in the footer reopens it
export function CookieConsent({
  t,
  message,
  policyUrl,
}: {
  t: Labels
  message?: string | null
  policyUrl?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState(false)
  const [optional, setOptional] = useState(false)

  useEffect(() => {
    // Consent lives in a cookie, readable only after hydration
    const saved = readConsent()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    if (saved) setOptional(saved.analytics)
    else setOpen(true)
    const reopen = () => {
      setSettings(true)
      setOpen(true)
    }
    window.addEventListener(CONSENT_OPEN_EVENT, reopen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen)
  }, [])

  if (!open) return null

  // One switch covers analytics and marketing cookies
  const save = (allow: boolean) => {
    writeConsent({ analytics: allow, marketing: allow })
    setOptional(allow)
    setOpen(false)
    setSettings(false)
  }
  const policy = policyUrl && /^(https?:\/\/|\/)/i.test(policyUrl) ? policyUrl : null

  return (
    <div className="cky" role="dialog" aria-modal="false" aria-labelledby="cky-t">
      <div className="rw">
        <p id="cky-t">
          {message || t.message}{' '}
          {policy && <a href={policy}>{t.policy}</a>}
        </p>
        <div className="bt">
          {!settings && (
            <button type="button" className="lnk" onClick={() => setSettings(true)}>
              {t.settings}
            </button>
          )}
          <button type="button" className="pill k sm" onClick={() => save(true)}>
            {t.acceptAll}
          </button>
        </div>
      </div>
      {settings && (
        <div className="opt2">
          <label htmlFor="cky-opt">
            <input
              id="cky-opt"
              type="checkbox"
              checked={optional}
              onChange={(e) => setOptional(e.target.checked)}
            />
            <span>
              {t.optional}
              <small>{t.optionalDesc}</small>
            </span>
          </label>
          <button type="button" className="pill o sm" onClick={() => save(optional)}>
            {t.save}
          </button>
        </div>
      )}
    </div>
  )
}

export function CookieSettingsLink({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}>
      {label}
    </button>
  )
}
