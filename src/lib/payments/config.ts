// Which provider and methods the pay page offers. The provider and methods are chosen in the
// backoffice (Booking settings); the keys only ever come from the server environment.
import type { BasePayload } from 'payload'

import { siteUrl } from '@/site/seo'

import { demo } from './demo'
import { omise } from './omise'
import { stripe } from './stripe'
import { PAY_METHODS, PROVIDERS, type Adapter, type PayMethod, type ProviderId } from './types'

export const ENV_KEYS: Record<Exclude<ProviderId, 'demo'>, { public: string; secret: string }> = {
  omise: { public: 'OMISE_PUBLIC_KEY', secret: 'OMISE_SECRET_KEY' },
  stripe: { public: 'STRIPE_PUBLISHABLE_KEY', secret: 'STRIPE_SECRET_KEY' },
}

const env = (name: string) => process.env[name]?.trim() || ''

// Whether each key is set (never the values), for the backoffice settings screen
export function keyStatus() {
  return Object.fromEntries(
    Object.entries(ENV_KEYS).map(([p, k]) => [
      p,
      { public: Boolean(env(k.public)), secret: Boolean(env(k.secret)) },
    ]),
  ) as Record<Exclude<ProviderId, 'demo'>, { public: boolean; secret: boolean }>
}

export const providerReady = (p: ProviderId) =>
  p === 'demo' || (Boolean(env(ENV_KEYS[p].public)) && Boolean(env(ENV_KEYS[p].secret)))

export const publicKeyOf = (p: ProviderId) => (p === 'demo' ? '' : env(ENV_KEYS[p].public))

const ADAPTERS: Record<ProviderId, Adapter> = { demo, omise, stripe }
export const adapterFor = (p: ProviderId) => ADAPTERS[p]

export const isProvider = (v: unknown): v is ProviderId =>
  (PROVIDERS as readonly unknown[]).includes(v)

// Where to point the Omise and Stripe dashboards; outside /api so Payload doesn't own them
export const webhookUrls = () => ({
  omise: `${siteUrl()}/webhooks/omise`,
  stripe: `${siteUrl()}/webhooks/stripe`,
})

export type PayConfig = {
  provider: ProviderId
  ready: boolean
  publicKey: string
  // Methods to show: those enabled in settings, minus card/QR when the provider has no keys
  // and minus transfer when no bank account is set
  methods: PayMethod[]
  bank: { bankName: string; accountName: string; accountNumber: string }
}

export async function getPayConfig(payload: BasePayload): Promise<PayConfig> {
  const s = await payload.findGlobal({ slug: 'booking-settings', depth: 0, overrideAccess: true })
  const provider = isProvider(s.paymentProvider) ? s.paymentProvider : 'demo'
  const ready = providerReady(provider)
  // An empty list only exists on sites set up before this setting; saving needs at least one
  const enabled: PayMethod[] = s.payMethods?.length ? s.payMethods : [...PAY_METHODS]
  const bank = {
    bankName: s.bankName?.trim() ?? '',
    accountName: s.accountName?.trim() ?? '',
    accountNumber: s.accountNumber?.trim() ?? '',
  }
  const methods = PAY_METHODS.filter(
    (m) => enabled.includes(m) && (m === 'transfer' ? Boolean(bank.accountNumber) : ready),
  )
  return { provider, ready, publicKey: ready ? publicKeyOf(provider) : '', methods, bank }
}
