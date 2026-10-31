'use client'

import { useEffect } from 'react'

import { CONSENT_CHANGE_EVENT, readConsent, type Consent } from '@/site/consent'

type GtagWindow = { dataLayer?: unknown[] } & Record<string, unknown>

// Google Analytics 4 (ID from site settings), loaded only once the visitor allows analytics
// cookies (PDPA). GA4 counts client-side page changes itself from browser history.
export function Analytics({ id }: { id: string }) {
  useEffect(() => {
    const w = window as unknown as GtagWindow
    const apply = (consent: Consent | null) => {
      if (!consent?.analytics) {
        w[`ga-disable-${id}`] = true
        return
      }
      w[`ga-disable-${id}`] = false
      if (document.getElementById('dp-gtag')) return
      w.dataLayer = w.dataLayer || []
      // gtag.js reads the arguments object itself, so this must stay a plain function
      const gtag = function () {
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer!.push(arguments)
      } as (...args: unknown[]) => void
      gtag('js', new Date())
      gtag('config', id)
      const script = document.createElement('script')
      script.id = 'dp-gtag'
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
      document.head.appendChild(script)
    }
    apply(readConsent())
    const onChange = (e: Event) => apply((e as CustomEvent<Consent>).detail)
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange)
  }, [id])

  return null
}
