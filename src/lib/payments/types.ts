// Shared shapes for the payment providers. Amounts are whole baht in our code; each adapter
// converts to the provider's smallest unit (satang) and back.
export const PROVIDERS = ['demo', 'omise', 'stripe'] as const
export type ProviderId = (typeof PROVIDERS)[number]

export const PAY_METHODS = ['card', 'promptpay', 'transfer'] as const
export type PayMethod = (typeof PAY_METHODS)[number]

// A charge (Omise) or PaymentIntent (Stripe) as we need it, read back from the provider
export type Charge = {
  id: string
  status: 'pending' | 'succeeded' | 'failed'
  amount: number
  currency: string
  // Booking code we put in the charge's metadata when creating it
  bookingCode: string | null
  method: 'card' | 'promptpay'
  // Why it failed, in the provider's words
  message?: string
  // Card: 3-D Secure page to send the customer to (Omise)
  authorizeUri?: string
  // Card: secret the browser confirms with Stripe.js
  clientSecret?: string
  // PromptPay: QR image to scan, and when it stops working
  qrImage?: string
  expiresAt?: string
}

export type ChargeInput = {
  amount: number
  bookingCode: string
  description: string
}

export type Adapter = {
  // Omise and demo charge a card token right away; Stripe creates a PaymentIntent the browser
  // confirms (no token)
  card(input: ChargeInput & { token?: string; returnUri: string }): Promise<Charge>
  promptpay(input: ChargeInput & { email?: string }): Promise<Charge>
  get(id: string): Promise<Charge>
}

export class ProviderError extends Error {}
