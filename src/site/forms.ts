// Helpers for the public forms' server actions (booking request, shop checkout)
import { headers } from 'next/headers'

export const str = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : ''

export const PHONE = /^\+?[0-9][0-9 ()-]{6,18}[0-9]$/
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Simple per-key limit kept in this server process: `max` hits per `windowMs`
export function rateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  return (key: string) => {
    const now = Date.now()
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= max) {
      hits.set(key, recent)
      return true
    }
    recent.push(now)
    hits.set(key, recent)
    // Drop stale entries now and then so the map can't grow without bound
    if (hits.size > 5000)
      for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k)
    return false
  }
}

export async function clientIp() {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown'
}
