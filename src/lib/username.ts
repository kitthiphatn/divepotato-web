// Staff usernames: lowercase letters, digits, dot, underscore and dash (e.g. "noi.k", "guide_2").
// Shared by the Users collection, the backoffice actions, the seed and the migration backfill.
export const USERNAME_RE = /^[a-z0-9._-]+$/
export const USERNAME_MAX = 32

export const normalizeUsername = (v: string) => v.trim().toLowerCase()

export const isValidUsername = (v: string) => v.length <= USERNAME_MAX && USERNAME_RE.test(v)

// A username suggested from an email address: its local part with other characters dropped
export function usernameFromEmail(email: string) {
  const local = normalizeUsername(email.split('@')[0] ?? '')
  return local.replace(/[^a-z0-9._-]/g, '').slice(0, USERNAME_MAX)
}
