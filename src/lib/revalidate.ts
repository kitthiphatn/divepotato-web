import { revalidatePath } from 'next/cache'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'

function refresh() {
  try {
    revalidatePath('/', 'layout')
  } catch {
    // Not inside a Next.js request (e.g. a CLI script); nothing to refresh
  }
}

// Show admin edits on the site right away instead of waiting for the next rebuild
export const revalidateSite: GlobalAfterChangeHook = ({ doc }) => {
  refresh()
  return doc
}

export const revalidateDoc: CollectionAfterChangeHook = ({ doc }) => {
  refresh()
  return doc
}

export const revalidateDeleted: CollectionAfterDeleteHook = ({ doc }) => {
  refresh()
  return doc
}
