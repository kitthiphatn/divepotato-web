// Shared shapes for the payment providers. Amounts are whole baht in our code; each adapter
// converts to the provider's smallest unit (satang) and back.
export const PROVIDERS = ['demo', 'omise', 'stripe', 'kbank'] as const
export type ProviderId = (typeof PROVIDERS)[number]

export const PAY_METHODS = ['card', 'promptpay', 'transfer'] as const
export type PayMethod = (typeof PAY_METHODS)[number]

// A charge (Omise, KBank), PaymentIntent (Stripe) or KBank QR order as we need it, read back
// from the provider
export type Charge = {
  id: string
  status: 'pending' | 'succeeded' | 'failed'
  amount: number
  currency: string
  // Booking or shop order code we put in the charge's metadata (key `booking`) when creating it
  code: string | null
  method: 'card' | 'promptpay'
  // Why it failed, in the provider's words
  message?: string
  // Card: 3-D Secure page to send the customer to (Omise, KBank)
  authorizeUri?: string
  // Card: secret the browser confirms with Stripe.js
  clientSecret?: string
  // PromptPay: QR image to scan, and when it stops working
  qrImage?: string
  expiresAt?: string
}

export type ChargeInput = {
  amount: number
  // Booking or shop order code
  code: string
  description: string
}

export type Adapter = {
  // Omise, KBank and demo charge a card token right away; Stripe creates a PaymentIntent the
  // browser confirms (no token)
  card(input: ChargeInput & { token?: string; returnUri: string }): Promise<Charge>
  promptpay(input: ChargeInput & { email?: string }): Promise<Charge>
  get(id: string): Promise<Charge>
}

export class ProviderError extends Error {}

// Tokens the demo card form makes from the two test card numbers (see demo.ts)
export const DEMO_TOKEN_OK = 'demo_tok_ok'
export const DEMO_TOKEN_DECLINED = 'demo_tok_declined'
