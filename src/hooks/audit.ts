import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

// Fields that change on every save and say nothing about what the user did
const IGNORED = new Set(['updatedAt', 'createdAt', '_status', 'id'])

type Doc = Record<string, unknown>

// Top-level fields whose value changed, as { field: { from, to } }
export function diffDocs(before: Doc | undefined, after: Doc | undefined) {
  const diff: Record<string, { from: unknown; to: unknown }> = {}
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  for (const key of keys) {
    if (IGNORED.has(key)) continue
    const from = before?.[key]
    const to = after?.[key]
    if (JSON.stringify(from ?? null) !== JSON.stringify(to ?? null)) diff[key] = { from, to }
  }
  return diff
}

async function writeLog(
  req: PayloadRequest,
  data: {
    action: 'create' | 'update' | 'delete'
    collectionSlug: string
    docId: string
    diff: unknown
  },
) {
  try {
    await req.payload.create({
      collection: 'audit-logs',
      data: { ...data, diff: data.diff as Record<string, unknown>, user: req.user?.id ?? null },
      req,
      overrideAccess: true,
    })
  } catch (err) {
    // An audit failure must never block the change itself
    req.payload.logger.error({ err }, `Audit log failed for ${data.collectionSlug}/${data.docId}`)
  }
}

// Shared hook for Bookings, Payments, Departures and Trips. Internal updates (e.g. the seat count
// a booking writes onto its departure) pass `context.skipAudit` so they don't flood the log.
export const auditAfterChange: CollectionAfterChangeHook = async ({
  collection,
  context,
  doc,
  operation,
  previousDoc,
  req,
}) => {
  if (context?.skipAudit) return doc
  const diff = operation === 'create' ? diffDocs(undefined, doc) : diffDocs(previousDoc, doc)
  if (operation === 'update' && Object.keys(diff).length === 0) return doc
  await writeLog(req, {
    action: operation,
    collectionSlug: collection.slug,
    docId: String(doc.id),
    diff,
  })
  return doc
}

export const auditAfterDelete: CollectionAfterDeleteHook = async ({
  collection,
  context,
  doc,
  req,
}) => {
  if (context?.skipAudit) return doc
  await writeLog(req, {
    action: 'delete',
    collectionSlug: collection.slug,
    docId: String(doc.id),
    diff: diffDocs(doc, undefined),
  })
  return doc
}
