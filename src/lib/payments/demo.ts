// Simulated provider for trying the whole flow without a gateway account. No money moves.
// "Charges" live in this server process only; the browser-side demo form turns the test card
// 4242 4242 4242 4242 into DEMO_TOKEN_OK and 4000 0000 0000 0002 into DEMO_TOKEN_DECLINED, so
// even demo card numbers never reach the server.
import { randomBytes } from 'node:crypto'

import { DEMO_TOKEN_OK, type Adapter, type Charge } from './types'

// Kept on globalThis so dev-server reloads of this module don't lose pending demo charges
const g = globalThis as unknown as { __demoCharges?: Map<string, Charge> }
const charges = (g.__demoCharges ??= new Map<string, Charge>())

const newId = () => `demo_${randomBytes(9).toString('base64url')}`

export const demo: Adapter = {
  async card(i) {
    const ok = i.token === DEMO_TOKEN_OK
    const c: Charge = {
      id: newId(),
      status: ok ? 'succeeded' : 'failed',
      amount: i.amount,
      currency: 'thb',
      code: i.code,
      method: 'card',
      message: ok ? undefined : 'Card declined (demo)',
    }
    charges.set(c.id, c)
    return c
  },
  async promptpay(i) {
    const c: Charge = {
      id: newId(),
      status: 'pending',
      amount: i.amount,
      currency: 'thb',
      code: i.code,
      method: 'promptpay',
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    }
    charges.set(c.id, c)
    return c
  },
  // A demo charge this process doesn't know (e.g. after a restart) stays pending
  async get(id) {
    return (
      charges.get(id) ?? {
        id,
        status: 'pending',
        amount: 0,
        currency: 'thb',
        code: null,
        method: 'promptpay',
      }
    )
  },
}

// "Simulate payment" button on the demo QR
export function simulateDemoPaid(id: string) {
  const c = charges.get(id)
  if (c && c.status === 'pending') charges.set(id, { ...c, status: 'succeeded' })
  return Boolean(c)
}
