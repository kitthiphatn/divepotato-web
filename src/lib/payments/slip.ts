// Slip check for bank transfers: read the QR code printed on a Thai bank slip. That QR only
// carries the sending bank's code and the transaction reference (no amount, no receiver), so
// this proves neither; it finds slips with no QR and slips already used on another payment.
// Staff still approve every slip by hand.
import jsQR from 'jsqr'
import type { BasePayload } from 'payload'
import sharp from 'sharp'

import type { Payment } from '@/payload-types'

// Longest side we decode at; slip photos from phones are often 3-4k pixels
const MAX_SIDE = 1600

async function decodeAt(data: Buffer, side: number) {
  const { data: px, info } = await sharp(data)
    .rotate()
    .resize({ width: side, height: side, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const code = jsQR(new Uint8ClampedArray(px.buffer, px.byteOffset, px.length), info.width, info.height)
  return code?.data.trim() || null
}

// The QR text on the slip, or null when there is none or the image can't be read (e.g. a HEIC
// photo this server's image library can't open)
export async function readSlipQr(data: Buffer): Promise<string | null> {
  try {
    // A smaller copy helps when a large, noisy photo hides a small code
    return (await decodeAt(data, MAX_SIDE)) ?? (await decodeAt(data, 800))
  } catch {
    return null
  }
}

// ok, no_qr, or duplicate when another payment that wasn't rejected has the same slip QR
export async function checkSlip(
  payload: BasePayload,
  data: Buffer,
): Promise<{ slipRef: string | null; slipCheck: NonNullable<Payment['slipCheck']> }> {
  const slipRef = (await readSlipQr(data))?.slice(0, 500) ?? null
  if (!slipRef) return { slipRef: null, slipCheck: 'no_qr' }
  const used = await payload.count({
    collection: 'payments',
    where: { and: [{ slipRef: { equals: slipRef } }, { status: { not_equals: 'rejected' } }] },
    overrideAccess: true,
  })
  return { slipRef, slipCheck: used.totalDocs > 0 ? 'duplicate' : 'ok' }
}
