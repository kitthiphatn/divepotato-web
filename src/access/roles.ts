import type { Access, FieldAccess } from 'payload'

// admin: everything · editor: website content · staff: bookings, customers, departures ·
// guide: read departures and bookings (manifests only)
export const ROLES = ['admin', 'editor', 'staff', 'guide'] as const
export type Role = (typeof ROLES)[number]

export function roleOf(user: unknown): Role | null {
  const role = (user as { role?: string } | null | undefined)?.role
  return (ROLES as readonly string[]).includes(role ?? '') ? (role as Role) : null
}

export const hasRole =
  (...roles: Role[]) =>
  (user: unknown): boolean => {
    const role = roleOf(user)
    return role !== null && roles.includes(role)
  }

const accessFor =
  (...roles: Role[]): Access =>
  ({ req: { user } }) =>
    hasRole(...roles)(user)

export const isAdmin = hasRole('admin')

export const adminOnly = accessFor('admin')
export const contentTeam = accessFor('admin', 'editor')
export const bookingReaders = accessFor('admin', 'staff', 'guide')
export const bookingEditors = accessFor('admin', 'staff')
export const anyUser: Access = ({ req: { user } }) => Boolean(user)
export const nobody: Access = () => false

export const adminField: FieldAccess = ({ req: { user } }) => isAdmin(user)

// Admin `hidden` for collections a guide has no use for (they work from departures and manifests)
export const hiddenFromGuide = ({ user }: { user: unknown }) => roleOf(user) === 'guide'
