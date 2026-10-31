// Shop delivery rules from Booking settings, and the shipping fee they give. Pure, so the cart
// and checkout pages show the same numbers the server charges.
export type DeliveryRules = {
  pickup: boolean
  ship: boolean
  // Flat fee for shipping by post, free from `freeMin` (0 = never free)
  fee: number
  freeMin: number
}

export const DEFAULT_RULES: DeliveryRules = { pickup: true, ship: true, fee: 100, freeMin: 3000 }

export function deliveryRules(s: {
  pickupEnabled?: boolean | null
  shippingEnabled?: boolean | null
  shippingFee?: number | null
  freeShippingMin?: number | null
}): DeliveryRules {
  return {
    pickup: s.pickupEnabled ?? DEFAULT_RULES.pickup,
    ship: s.shippingEnabled ?? DEFAULT_RULES.ship,
    fee: Math.max(0, Math.round(s.shippingFee ?? DEFAULT_RULES.fee)),
    freeMin: Math.max(0, Math.round(s.freeShippingMin ?? 0)),
  }
}

export const shippingFee = (subtotal: number, delivery: 'pickup' | 'ship', r: DeliveryRules) =>
  delivery === 'pickup' || (r.freeMin > 0 && subtotal >= r.freeMin) ? 0 : r.fee
