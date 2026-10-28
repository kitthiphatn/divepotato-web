import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { roleOf, type Role } from '@/access/roles'

// Custom admin views are not behind Payload's login check, so each one checks the user itself
export function requireRole(props: AdminViewServerProps, roles: Role[]) {
  const user = props.initPageResult.req.user
  const adminRoute = props.initPageResult.req.payload.config.routes.admin
  if (!user) redirect(`${adminRoute}/login`)
  const role = roleOf(user)
  if (!role || !roles.includes(role)) redirect(`${adminRoute}/unauthorized`)
  return { user, role, adminRoute }
}

export function templateProps(props: AdminViewServerProps) {
  const { initPageResult, params, searchParams } = props
  return {
    i18n: initPageResult.req.i18n,
    locale: initPageResult.locale,
    params,
    payload: initPageResult.req.payload,
    permissions: initPageResult.permissions,
    searchParams,
    user: initPageResult.req.user ?? undefined,
    visibleEntities: initPageResult.visibleEntities,
  }
}
