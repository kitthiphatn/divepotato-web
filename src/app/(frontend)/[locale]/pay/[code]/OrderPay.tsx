import config from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { isOneSize } from '@/backoffice/shop'
import { expireStaleOrders } from '@/hooks/orders'
import type { Locale } from '@/i18n/config'
import { getSite } from '@/lib/content'
import { getPayConfig } from '@/lib/payments/config'
import { reconcilePending } from '@/lib/payments/confirm'
import { orderFromLink } from '@/lib/payments/link'
import { bookingContact } from '@/site/booking'
import { PayPanel } from '@/site/components/PayPanel'
import { money } from '@/site/format'
import { getDict } from '@/site/i18n'

import { Check, Note } from './parts'

const PAID = ['paid', 'packed']

// Pay view for a shop order (DP-ORD-…): the full amount, with the same three methods as booking
// deposits. Like the booking view, pending card/QR payments are checked and stale orders expired
// before anything is shown.
export async function OrderPay({ locale, code, token }: { locale: Locale; code: string; token: string }) {
  const t = getDict(locale)
  const p = t.pay
  const o = t.order
  const payload = await getPayload({ config })
  const found = await orderFromLink(payload, code, token)
  if (!found) notFound()

  await reconcilePending(payload, { order: found.id }).catch(() => null)
  await expireStaleOrders(payload)

  const [order, payments, site, cfg] = await Promise.all([
    payload.findByID({ collection: 'orders', id: found.id, depth: 0, overrideAccess: true }),
    payload.find({
      collection: 'payments',
      where: { order: { equals: found.id } },
      sort: '-createdAt',
      pagination: false,
      depth: 0,
      overrideAccess: true,
    }),
    getSite(locale),
    getPayConfig(payload),
  ])
  const items = order.items ?? []
  const count = items.reduce((n, it) => n + (it.qty ?? 0), 0)
  const last = payments.docs[0]
  const demo = cfg.provider === 'demo' || payments.docs.some((x) => x.provider === 'demo')
  const contact = bookingContact(site)
  const ship = order.delivery === 'ship'
  const addr = order.address
  const state = PAID.includes(order.status)
    ? 'paid'
    : order.status === 'shipped' || order.status === 'picked_up'
      ? 'done'
      : order.status === 'pending_review'
        ? 'review'
        : order.status === 'pending_payment'
          ? 'pay'
          : order.status === 'expired'
            ? 'expired'
            : 'closed'
  const lineBtn = (cls: string) =>
    contact.lineUrl && (
      <a className={`pill ${cls}`} href={contact.lineUrl} target="_blank" rel="noopener noreferrer">
        {p.askLine}
      </a>
    )

  return (
    <section className="sec payp">
      <div className="w payw">
        <div className="payh">
          <span className="eb">
            {o.eb}
            {demo && <span className="demob">{p.demo}</span>}
          </span>
          <h1 className="dsp">
            {o.title} <span className="num">{order.code}</span>
          </h1>
        </div>

        <aside className="paysum">
          <ul className="olist">
            {items.map((it) => (
              <li key={it.id}>
                <span>
                  <b>{it.title}</b>
                  <small>
                    {[it.size && !isOneSize(it.size) && it.size, `× ${it.qty}`].filter(Boolean).join(' · ')}
                  </small>
                </span>
                <span className="num">{money(it.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="sum">
            <div>
              <dt>{o.code}</dt>
              <dd className="num">{order.code}</dd>
            </div>
            <div>
              <dt>{o.delivery}</dt>
              <dd>{ship ? o.ship : o.pickup}</dd>
            </div>
            <div>
              <dt>{t.checkout.subtotal}</dt>
              <dd className="num">
                {money(order.subtotal)} <small>({o.items(count)})</small>
              </dd>
            </div>
            {ship && (
              <div>
                <dt>{t.checkout.shipping}</dt>
                <dd className="num">{order.shippingFee ? money(order.shippingFee) : t.checkout.free}</dd>
              </div>
            )}
            <div className="due">
              <dt>{state === 'pay' || state === 'expired' ? o.dueNow : p.paid}</dt>
              <dd className="num">{money(order.total)}</dd>
            </div>
          </dl>
          {ship && addr?.line && (
            <p className="oaddr">
              {[addr.line, addr.district, addr.province, addr.postcode].filter(Boolean).join(' ')}
            </p>
          )}
        </aside>

        <div className="paymain">
          {state === 'pay' ? (
            cfg.methods.length ? (
              <PayPanel
                locale={locale}
                code={order.code ?? ''}
                token={token}
                provider={cfg.provider}
                publicKey={cfg.publicKey}
                methods={cfg.methods}
                amount={order.total ?? 0}
                holdExpiresAt={order.holdExpiresAt ?? null}
                bank={cfg.bank}
                kbank={cfg.kbank}
                lastFailed={last?.status === 'failed' && last.provider !== 'slip'}
                labels={{ ...p, holdLeft: o.holdLeft }}
              />
            ) : (
              <Note title={p.method} text={p.noMethods} lineUrl={contact.lineUrl} lineLabel={p.askLine} />
            )
          ) : state === 'paid' || state === 'done' ? (
            <div className="paydone" role="status">
              <Check />
              <h2>
                {order.status === 'shipped' ? o.shippedT : order.status === 'picked_up' ? o.pickedT : o.paidT}
              </h2>
              <p>{o.paidP}</p>
              <p className="ref">
                {o.code} <b className="num">{order.code}</b>
              </p>
              {order.status === 'shipped' && order.trackingNo && (
                <p className="ref">
                  {o.tracking} <b className="num">{order.trackingNo}</b>
                </p>
              )}
              {state === 'paid' && (
                <>
                  <h3>{p.next}</h3>
                  <ol className="steps">
                    <li>{ship ? o.nextShip : o.nextPickup}</li>
                  </ol>
                </>
              )}
              <div className="alt">
                {lineBtn('y')}
                <Link className="pill o" href={`/${locale}`}>
                  {p.home}
                </Link>
              </div>
            </div>
          ) : state === 'review' ? (
            <div className="paydone" role="status">
              <Check />
              <h2>{o.reviewT}</h2>
              <p>{o.reviewP}</p>
              <p className="ref">
                {o.code} <b className="num">{order.code}</b>
              </p>
              <div className="alt">
                {lineBtn('y')}
                <Link className="pill o" href={`/${locale}`}>
                  {p.home}
                </Link>
              </div>
            </div>
          ) : state === 'expired' ? (
            <div className="paydone off" role="status">
              <h2>{o.expiredT}</h2>
              <p>{o.expiredP}</p>
              <div className="alt">
                <Link className="pill k" href={`/${locale}/equipment`}>
                  {o.again}
                </Link>
                {lineBtn('o')}
              </div>
            </div>
          ) : (
            <Note title={o.closedT} text={p.closedP} lineUrl={contact.lineUrl} lineLabel={p.askLine} />
          )}
        </div>
      </div>
    </section>
  )
}
