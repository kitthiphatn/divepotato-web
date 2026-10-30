import config from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { expireStaleHolds } from '@/hooks/bookings'
import { isLocale } from '@/i18n/config'
import { getSite } from '@/lib/content'
import { getPayConfig } from '@/lib/payments/config'
import { reconcileBooking } from '@/lib/payments/confirm'
import { bookingFromLink } from '@/lib/payments/link'
import type { Course, Departure, Trip } from '@/payload-types'
import { bookingContact } from '@/site/booking'
import { PayPanel } from '@/site/components/PayPanel'
import { dateRange, money } from '@/site/format'
import { getDict } from '@/site/i18n'

type Props = {
  params: Promise<{ locale: string; code: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

// Private to whoever holds the link
export const metadata: Metadata = { robots: { index: false, follow: false } }

const PAID = ['deposit_paid', 'paid', 'completed']

// /<locale>/pay/<booking code>?t=<token>: deposit for a booking on hold. Pending card/QR payments
// are checked with the provider and stale holds expired before anything is shown, so the page
// is right after a 3-D Secure return or a reload.
export default async function PayPage({ params, searchParams }: Props) {
  const { locale, code } = await params
  if (!isLocale(locale)) notFound()
  const token = (await searchParams).t ?? ''
  const t = getDict(locale)
  const p = t.pay
  const payload = await getPayload({ config })
  const found = await bookingFromLink(payload, decodeURIComponent(code), token)
  if (!found) notFound()

  await reconcileBooking(payload, found.id).catch(() => null)
  const depId = typeof found.departure === 'object' ? found.departure.id : found.departure
  await expireStaleHolds(payload, depId)

  const [b, payments, site, cfg] = await Promise.all([
    payload.findByID({ collection: 'bookings', id: found.id, depth: 2, locale, overrideAccess: true }),
    payload.find({
      collection: 'payments',
      where: { booking: { equals: found.id } },
      sort: '-createdAt',
      pagination: false,
      depth: 0,
      overrideAccess: true,
    }),
    getSite(locale),
    getPayConfig(payload),
  ])
  const dep = typeof b.departure === 'object' ? (b.departure as Departure) : null
  const rel = dep ? (dep.kind === 'course' ? dep.course : dep.trip) : null
  const offering = rel && typeof rel === 'object' ? (rel as Trip | Course) : null
  const backHref = offering?.slug
    ? `/${locale}/${dep?.kind === 'course' ? 'courses' : 'trips'}/${offering.slug}`
    : `/${locale}`
  const paid = payments.docs
    .filter((x) => x.status === 'succeeded')
    .reduce((s, x) => s + (x.kind === 'refund' ? -x.amount : x.amount), 0)
  const last = payments.docs[0]
  const demo = cfg.provider === 'demo' || payments.docs.some((x) => x.provider === 'demo')
  const contact = bookingContact(site)
  const pax = b.participants?.length ?? 0

  const state = PAID.includes(b.status)
    ? 'paid'
    : b.status === 'pending_review'
      ? 'review'
      : b.status === 'hold'
        ? 'pay'
        : b.status === 'expired'
          ? 'expired'
          : 'closed'

  return (
    <section className="sec payp">
      <div className="w payw">
        <div className="payh">
          <span className="eb">
            {p.eb}
            {demo && <span className="demob">{p.demo}</span>}
          </span>
          <h1 className="dsp">{offering?.title ?? b.code}</h1>
        </div>

        <aside className="paysum">
          <dl className="sum">
            <div>
              <dt>{p.code}</dt>
              <dd className="num">{b.code}</dd>
            </div>
            {dep && (
              <div>
                <dt>{p.date}</dt>
                <dd>{dateRange(locale, dep.startDate, dep.endDate)}</dd>
              </div>
            )}
            <div>
              <dt>{p.people}</dt>
              <dd className="num">{pax}</dd>
            </div>
            <div>
              <dt>{p.total}</dt>
              <dd className="num">{money(b.total)}</dd>
            </div>
            {state === 'paid' ? (
              <div className="due">
                <dt>{p.paid}</dt>
                <dd className="num">{money(paid)}</dd>
              </div>
            ) : (
              <div className="due">
                <dt>{p.dueNow}</dt>
                <dd className="num">{money(b.deposit)}</dd>
              </div>
            )}
            <div>
              <dt>{p.later}</dt>
              <dd className="num">{money(Math.max(0, (b.total ?? 0) - Math.max(paid, b.deposit ?? 0)))}</dd>
            </div>
          </dl>
        </aside>

        <div className="paymain">
          {state === 'pay' ? (
            cfg.methods.length ? (
              <PayPanel
                locale={locale}
                code={b.code ?? ''}
                token={token}
                provider={cfg.provider}
                publicKey={cfg.publicKey}
                methods={cfg.methods}
                deposit={b.deposit ?? 0}
                holdExpiresAt={b.holdExpiresAt ?? null}
                bank={cfg.bank}
                lastFailed={last?.status === 'failed' && last.provider !== 'slip'}
                labels={p}
              />
            ) : (
              <Note title={p.method} text={p.noMethods} lineUrl={contact.lineUrl} lineLabel={p.askLine} />
            )
          ) : state === 'paid' ? (
            <div className="paydone" role="status">
              <Check />
              <h2>{b.status === 'deposit_paid' ? p.paidT : p.fullT}</h2>
              <p>{p.paidP}</p>
              <p className="ref">
                {p.code} <b className="num">{b.code}</b>
              </p>
              <h3>{p.next}</h3>
              <ol className="steps">
                <li>{p.next1}</li>
                {b.status === 'deposit_paid' && <li>{p.next2}</li>}
              </ol>
              <div className="alt">
                {contact.lineUrl && (
                  <a className="pill y" href={contact.lineUrl} target="_blank" rel="noopener noreferrer">
                    {p.askLine}
                  </a>
                )}
                <Link className="pill o" href={`/${locale}`}>
                  {p.home}
                </Link>
              </div>
            </div>
          ) : state === 'review' ? (
            <div className="paydone" role="status">
              <Check />
              <h2>{p.reviewT}</h2>
              <p>{p.reviewP}</p>
              <p className="ref">
                {p.code} <b className="num">{b.code}</b>
              </p>
              <div className="alt">
                {contact.lineUrl && (
                  <a className="pill y" href={contact.lineUrl} target="_blank" rel="noopener noreferrer">
                    {p.askLine}
                  </a>
                )}
                <Link className="pill o" href={`/${locale}`}>
                  {p.home}
                </Link>
              </div>
            </div>
          ) : state === 'expired' ? (
            <div className="paydone off" role="status">
              <h2>{p.expiredT}</h2>
              <p>{p.expiredP}</p>
              <div className="alt">
                <Link className="pill k" href={backHref}>
                  {p.again}
                </Link>
                {contact.lineUrl && (
                  <a className="pill o" href={contact.lineUrl} target="_blank" rel="noopener noreferrer">
                    {p.askLine}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <Note title={p.closedT} text={p.closedP} lineUrl={contact.lineUrl} lineLabel={p.askLine} />
          )}
        </div>
      </div>
    </section>
  )
}

function Check() {
  return (
    <div className="ck2">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </div>
  )
}

function Note({
  title,
  text,
  lineUrl,
  lineLabel,
}: {
  title: string
  text: string
  lineUrl: string | null
  lineLabel: string
}) {
  return (
    <div className="paydone off">
      <h2>{title}</h2>
      <p>{text}</p>
      {lineUrl && (
        <div className="alt">
          <a className="pill y" href={lineUrl} target="_blank" rel="noopener noreferrer">
            {lineLabel}
          </a>
        </div>
      )}
    </div>
  )
}
