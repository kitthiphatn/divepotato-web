'use client'

import { useRouter } from 'next/navigation'
import { startTransition, useEffect, useId, useRef, useState } from 'react'

import { DEMO_TOKEN_DECLINED, DEMO_TOKEN_OK, type PayMethod, type ProviderId } from '@/lib/payments/types'
import {
  checkPaymentAction,
  payCardAction,
  payQrAction,
  simulateDemoAction,
  uploadSlipAction,
  type PayResult,
} from '@/site/actions/pay'
import type { Dict } from '@/site/i18n'

type Labels = Dict['pay']

const baht = (n: number) => `฿${Math.round(n).toLocaleString('en-US')}`
const fill = (s: string, vars: Record<string, string>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')
const PROVIDER_NAME: Record<ProviderId, string> = {
  demo: 'Demo',
  omise: 'Omise',
  stripe: 'Stripe',
  kbank: 'KBank',
}

// Minimal shapes of the two gateways' browser libraries, loaded only when that provider is on
type OmiseJs = {
  setPublicKey(key: string): void
  createToken(
    type: 'card',
    card: Record<string, string>,
    cb: (status: number, res: { id?: string; message?: string }) => void,
  ): void
}
type StripeCard = { mount(el: HTMLElement): void; destroy(): void }
type StripeJs = {
  elements(): { create(type: 'card', opts?: Record<string, unknown>): StripeCard }
  confirmCardPayment(
    secret: string,
    data: { payment_method: { card: StripeCard; billing_details?: { name?: string } } },
  ): Promise<{ error?: { message?: string } }>
}
// KBank's widget (kpayment.min.js): renders from its own tag's data-* settings, opens with show()
// and, for cards, submits the form it sits in with the card token
type KPaymentJs = { show(): void }
declare global {
  interface Window {
    Omise?: OmiseJs
    Stripe?: (key: string) => StripeJs
    KPayment?: KPaymentJs
  }
}

const SCRIPTS: Partial<Record<ProviderId, string>> = {
  omise: 'https://cdn.omise.co/omise.js',
  stripe: 'https://js.stripe.com/v3/',
}

// Adds the provider's script tag once; true when it has loaded
function useScript(src: string | undefined) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!src) return
    let el = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    const done = () => setReady(true)
    if (el?.dataset.loaded) return done()
    if (!el) {
      el = document.createElement('script')
      el.src = src
      el.async = true
      document.head.appendChild(el)
    }
    const onLoad = () => {
      el!.dataset.loaded = '1'
      done()
    }
    el.addEventListener('load', onLoad)
    return () => el!.removeEventListener('load', onLoad)
  }, [src])
  return ready
}

type Props = {
  locale: string
  code: string
  token: string
  provider: ProviderId
  publicKey: string
  methods: PayMethod[]
  // Due now: a booking's deposit or a shop order's total
  amount: number
  holdExpiresAt: string | null
  bank: { bankName: string; accountName: string; accountNumber: string }
  // KBank only: widget script and card merchant id (see lib/payments/config)
  kbank?: { script: string; mid: string }
  lastFailed: boolean
  labels: Labels
}

// Countdown, method tabs and the three ways to pay, for a booking or a shop order. Every success
// ends in router.refresh(): the server page then reads the booking/order again and shows the paid
// or slip-received state.
export function PayPanel(props: Props) {
  const { methods, labels: t, holdExpiresAt, provider } = props
  const id = useId()
  const [tab, setTab] = useState<PayMethod>(methods[0])
  const [err, setErr] = useState<string | null>(props.lastFailed ? t.lastFailed : null)
  const router = useRouter()
  const left = useCountdown(holdExpiresAt, () => router.refresh())
  const link = { locale: props.locale, code: props.code, token: props.token }
  const shared = { ...props, link, setErr, onPaid: () => router.refresh() }

  return (
    <div className="payp-panel">
      {left !== null && (
        <p className={`timer${left < 120 ? ' low' : ''}`} role="timer" aria-live="off">
          <span>{t.holdLeft}</span>
          <b className="num">
            {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
          </b>
        </p>
      )}
      {provider === 'demo' && (
        <p className="demon">
          <span className="demob">{t.demo}</span> {t.demoNote}
        </p>
      )}
      <span className="lbl" id={`${id}-m`}>
        {t.method}
      </span>
      <div className="ptabs" role="tablist" aria-labelledby={`${id}-m`}>
        {methods.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            id={`${id}-t-${m}`}
            aria-selected={tab === m}
            aria-controls={`${id}-p-${m}`}
            onClick={() => {
              setTab(m)
              setErr(null)
            }}
          >
            {t[m]}
          </button>
        ))}
      </div>
      <div className="ppane" role="tabpanel" id={`${id}-p-${tab}`} aria-labelledby={`${id}-t-${tab}`}>
        {tab === 'card' && <CardForm {...shared} />}
        {tab === 'promptpay' && <QrPay {...shared} />}
        {tab === 'transfer' && <Transfer {...shared} />}
      </div>
      {err && (
        <p className="err" role="alert">
          {err}
        </p>
      )}
    </div>
  )
}

// Seconds left on the seat hold; calls onEnd once when it runs out
function useCountdown(until: string | null, onEnd: () => void) {
  const end = until ? Date.parse(until) : NaN
  // Starts empty so the server render and the first client render match
  const [left, setLeft] = useState<number | null>(null)
  const ended = useRef(false)
  const cb = useRef(onEnd)
  useEffect(() => {
    cb.current = onEnd
  })
  useEffect(() => {
    if (Number.isNaN(end)) return
    const tick = () => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000))
      setLeft(s)
      if (s === 0 && !ended.current) {
        ended.current = true
        cb.current()
      }
    }
    tick()
    const iv = window.setInterval(tick, 1000)
    return () => window.clearInterval(iv)
  }, [end])
  return left
}

type Shared = Props & {
  link: { locale: string; code: string; token: string }
  setErr: (s: string | null) => void
  onPaid: () => void
}

// What to do with a card or check result
function settle(r: PayResult, s: Shared) {
  const t = s.labels
  if (!r.ok) return s.setErr(r.error)
  if (r.redirect) return window.location.assign(r.redirect)
  if (r.status === 'succeeded') return s.onPaid()
  if (r.status === 'failed') return s.setErr(`${t.failed}${r.message ? ` (${r.message})` : ''}. ${t.retry}`)
}

// Puts KBank's widget script into `form` with its data-* settings (KBank reads them from its own
// tag); true once it has loaded. Each mount gets a fresh tag, removed again on unmount.
function useKbankWidget(
  form: React.RefObject<HTMLFormElement | null>,
  src: string | undefined,
  attrs: Record<string, string> | null,
) {
  const [loaded, setLoaded] = useState<string | null>(null)
  const key = src && attrs ? `${src}|${JSON.stringify(attrs)}` : ''
  useEffect(() => {
    const el = form.current
    if (!el || !key) return
    const [url, json] = [key.slice(0, key.indexOf('|')), key.slice(key.indexOf('|') + 1)]
    const tag = document.createElement('script')
    tag.src = url
    for (const [k, v] of Object.entries(JSON.parse(json) as Record<string, string>))
      tag.setAttribute(`data-${k}`, v)
    tag.addEventListener('load', () => setLoaded(key))
    el.appendChild(tag)
    return () => el.replaceChildren()
  }, [form, key])
  return Boolean(key) && loaded === key
}

const kbankAction = (path: string, link: Shared['link']) =>
  `/webhooks/kbank/${path}?${new URLSearchParams({ locale: link.locale, code: link.code, t: link.token })}`

// KBank card: its widget takes the card details and posts a token to our route, which charges it
// (amount from the server) and sends the customer to 3-D Secure or back to this page
function KbankCard(s: Shared) {
  const t = s.labels
  const form = useRef<HTMLFormElement>(null)
  const ready = useKbankWidget(
    form,
    s.kbank?.script,
    s.kbank
      ? {
          apikey: s.publicKey,
          amount: s.amount.toFixed(2),
          currency: 'THB',
          'payment-methods': 'card',
          name: 'Dive Potato',
          mid: s.kbank.mid,
          'show-button': 'false',
        }
      : null,
  )
  return (
    <div className="cardf">
      <form ref={form} method="POST" action={kbankAction('card', s.link)} />
      <button className="pill y full" type="button" disabled={!ready} onClick={() => window.KPayment?.show()}>
        {fill(t.payBtn, { amount: baht(s.amount) })}
      </button>
      <p className="sfine">{fill(t.cardSafe, { provider: PROVIDER_NAME.kbank })}</p>
    </div>
  )
}

function CardForm(s: Shared) {
  if (s.provider === 'kbank') return <KbankCard {...s} />
  return <TokenCardForm {...s} />
}

function TokenCardForm(s: Shared) {
  const t = s.labels
  const { provider, publicKey } = s
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [num, setNum] = useState('')
  const [exp, setExp] = useState('')
  const [cvc, setCvc] = useState('')
  const loaded = useScript(SCRIPTS[provider])
  const stripeEl = useRef<HTMLDivElement>(null)
  const stripeRef = useRef<{ stripe: StripeJs; card: StripeCard } | null>(null)

  // Stripe draws its own card field (in an iframe) into our box
  useEffect(() => {
    if (provider !== 'stripe' || !loaded || !window.Stripe || !stripeEl.current) return
    const stripe = window.Stripe(publicKey)
    const card = stripe.elements().create('card', {
      hidePostalCode: true,
      style: { base: { fontSize: '16px', color: '#1d1d1f' } },
    })
    card.mount(stripeEl.current)
    stripeRef.current = { stripe, card }
    return () => {
      card.destroy()
      stripeRef.current = null
    }
  }, [provider, loaded, publicKey])

  const digits = num.replace(/\D/g, '')
  const [mm, yy] = exp.split('/').map((x) => x.trim())

  // Card number, expiry and CVC only ever go to the provider's library, not to our server
  const tokenize = (): Promise<string> =>
    new Promise((resolve, reject) => {
      const month = Number(mm)
      const year = 2000 + Number(yy)
      const now = new Date()
      const future =
        month >= 1 && month <= 12 && (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1))
      if (digits.length < 12 || !future || !/^\d{3,4}$/.test(cvc)) return reject(new Error(t.cardInvalid))
      if (provider === 'demo') {
        if (digits === '4242424242424242') return resolve(DEMO_TOKEN_OK)
        if (digits === '4000000000000002') return resolve(DEMO_TOKEN_DECLINED)
        return reject(new Error(t.demoCardOnly))
      }
      const omise = window.Omise
      if (!omise) return reject(new Error(t.error))
      omise.setPublicKey(publicKey)
      omise.createToken(
        'card',
        {
          name: name.trim(),
          number: digits,
          expiration_month: String(month),
          expiration_year: String(year),
          security_code: cvc,
        },
        (status, res) => (status === 200 && res.id ? resolve(res.id) : reject(new Error(res.message || t.cardInvalid))),
      )
    })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    s.setErr(null)
    setBusy(true)
    try {
      if (provider === 'stripe') {
        const st = stripeRef.current
        if (!st) throw new Error(t.error)
        const r = await payCardAction(s.link)
        if (!r.ok || !r.clientSecret || !r.paymentId) return settle(r, s)
        const res = await st.stripe.confirmCardPayment(r.clientSecret, {
          payment_method: { card: st.card, billing_details: { name: name.trim() || undefined } },
        })
        // Either way the server reads the PaymentIntent back from Stripe
        const check = await checkPaymentAction({ ...s.link, paymentId: r.paymentId })
        if (res.error && !(check.ok && check.status === 'succeeded'))
          return s.setErr(`${t.failed} (${res.error.message ?? ''}). ${t.retry}`)
        return settle(check, s)
      }
      const cardToken = await tokenize()
      settle(await payCardAction({ ...s.link, cardToken }), s)
    } catch (err) {
      s.setErr(err instanceof Error ? err.message : t.error)
    } finally {
      setBusy(false)
    }
  }

  const fid = useId()
  return (
    <form className="cardf" onSubmit={submit} noValidate>
      {provider === 'demo' && <p className="hintp">{t.demoCards}</p>}
      {/* No `name` attributes: these fields are never posted to our server */}
      <label className="fld">
        <span>{t.cardName}</span>
        <input className="inp" autoComplete="cc-name" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {provider === 'stripe' ? (
        <div className="fld">
          <span id={`${fid}-c`}>{t.cardNumber}</span>
          <div className="inp stripe-card" ref={stripeEl} aria-labelledby={`${fid}-c`} />
        </div>
      ) : (
        <>
          <label className="fld">
            <span>{t.cardNumber}</span>
            <input
              className="inp num"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              maxLength={23}
              value={num}
              onChange={(e) => setNum(e.target.value.replace(/[^\d ]/g, ''))}
            />
          </label>
          <div className="f2">
            <label className="fld">
              <span>{t.cardExp}</span>
              <input
                className="inp num"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                maxLength={5}
                value={exp}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d)
                }}
              />
            </label>
            <label className="fld">
              <span>{t.cardCvc}</span>
              <input
                className="inp num"
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={4}
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
              />
            </label>
          </div>
        </>
      )}
      <button className="pill y full" type="submit" disabled={busy || (provider !== 'demo' && !loaded)}>
        {busy ? t.paying : fill(t.payBtn, { amount: baht(s.amount) })}
      </button>
      {provider !== 'demo' && (
        <p className="sfine">{fill(t.cardSafe, { provider: PROVIDER_NAME[provider] })}</p>
      )}
    </form>
  )
}

function QrPay(s: Shared) {
  const t = s.labels
  const [busy, setBusy] = useState(false)
  const [qr, setQr] = useState<{
    paymentId: number
    image?: string
    orderId?: string
    expiresAt?: string
  } | null>(null)
  const { link, setErr, onPaid } = s
  const key = `${link.locale}|${link.code}|${link.token}`

  // While a QR is up, ask the server every 3 s; it reads the charge from the provider
  useEffect(() => {
    if (!qr) return
    let stop = false
    const iv = window.setInterval(async () => {
      const [locale, code, token] = key.split('|')
      const r = await checkPaymentAction({ locale, code, token, paymentId: qr.paymentId }).catch(() => null)
      if (stop || !r) return
      if (r.ok && r.status === 'succeeded') onPaid()
      else if (r.ok && r.status === 'failed') {
        setQr(null)
        setErr(`${t.failed}. ${t.retry}`)
      }
    }, 3000)
    return () => {
      stop = true
      window.clearInterval(iv)
    }
  }, [qr, key, onPaid, setErr, t.failed, t.retry])

  const create = async () => {
    setErr(null)
    setBusy(true)
    const r = await payQrAction(link).catch(() => null)
    setBusy(false)
    if (!r || !r.ok) return setErr(r && !r.ok ? r.error : t.error)
    if (r.status === 'succeeded') return onPaid()
    if (r.status !== 'pending' || !r.paymentId) return setErr(`${t.failed}. ${t.retry}`)
    setQr({ paymentId: r.paymentId, image: r.qrImage, orderId: r.orderId, expiresAt: r.expiresAt })
  }

  const simulate = async () => {
    if (!qr) return
    setBusy(true)
    const r = await simulateDemoAction({ ...link, paymentId: qr.paymentId }).catch(() => null)
    setBusy(false)
    if (r) settle(r, s)
  }

  if (!qr)
    return (
      <div className="qrpay">
        <p className="hintp">{fill(t.qrScan, { amount: baht(s.amount) })}</p>
        <button className="pill y full" type="button" onClick={create} disabled={busy}>
          {busy ? t.paying : t.qrBtn}
        </button>
      </div>
    )

  const time = qr.expiresAt
    ? new Date(qr.expiresAt).toLocaleTimeString(link.locale === 'th' ? 'th-TH' : 'en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Bangkok',
      })
    : null
  return (
    <div className="qrpay">
      <p className="hintp">{fill(t.qrScan, { amount: baht(s.amount) })}</p>
      <div className="qrbox">
        {s.provider === 'kbank' && qr.orderId ? (
          <KbankQr {...s} orderId={qr.orderId} />
        ) : s.provider === 'demo' || !qr.image ? (
          <DemoQr label={t.demoQr} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr.image} alt={t.qrAlt} width={260} height={260} />
        )}
        <b className="num">{baht(s.amount)}</b>
        {time && <small>{fill(t.qrExpires, { time })}</small>}
      </div>
      <p className="qrwait" role="status">
        <i aria-hidden="true" />
        {t.qrWait}
      </p>
      {s.provider === 'demo' && (
        <button className="pill k full" type="button" onClick={simulate} disabled={busy}>
          <span className="demob">{t.demo}</span> {t.simulate}
        </button>
      )}
      <button className="pill o full" type="button" onClick={create} disabled={busy}>
        {t.qrNew}
      </button>
    </div>
  )
}

// KBank QR: its widget shows the QR of the order we created; opened right away and again from
// the button. Payment is still detected by the polling above (and KBank's webhook).
function KbankQr(s: Shared & { orderId: string }) {
  const t = s.labels
  const form = useRef<HTMLFormElement>(null)
  const ready = useKbankWidget(
    form,
    s.kbank?.script,
    s.kbank
      ? {
          apikey: s.publicKey,
          amount: s.amount.toFixed(2),
          currency: 'THB',
          'payment-methods': 'qr',
          name: 'Dive Potato',
          'order-id': s.orderId,
          'show-button': 'false',
        }
      : null,
  )
  useEffect(() => {
    if (ready) window.KPayment?.show()
  }, [ready])
  return (
    <>
      <form ref={form} method="POST" action={kbankAction('return', s.link)} />
      <button className="pill y" type="button" disabled={!ready} onClick={() => window.KPayment?.show()}>
        {t.qrBtn}
      </button>
    </>
  )
}

// A QR-looking graphic for demo mode, clearly marked; it encodes nothing
function DemoQr({ label }: { label: string }) {
  const n = 25
  const cells: [number, number][] = []
  let seed = 7
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  const finder = (x: number, y: number) =>
    [[0, 0], [n - 7, 0], [0, n - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!finder(x, y) && rnd() > 0.52) cells.push([x, y])
  return (
    <figure className="demoqr">
      <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width="260" height="260" role="img" aria-label={label}>
        <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
        {cells.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0a0a0a" />
        ))}
        {[[0, 0], [n - 7, 0], [0, n - 7]].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <rect x={x + 0.5} y={y + 0.5} width="6" height="6" fill="none" stroke="#0a0a0a" strokeWidth="1" />
            <rect x={x + 2} y={y + 2} width="3" height="3" fill="#0a0a0a" />
          </g>
        ))}
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  )
}

function Transfer(s: Shared) {
  const t = s.labels
  const { bank, link } = s
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const fid = useId()

  const copy = (k: string, v: string) => {
    navigator.clipboard?.writeText(v.replace(/[^\d]/g, '') || v).then(
      () => {
        setCopied(k)
        window.setTimeout(() => setCopied(null), 1500)
      },
      () => null,
    )
  }

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    s.setErr(null)
    if (!file || file.size > 5 * 1024 * 1024) return s.setErr(t.slipBad)
    const fd = new FormData()
    fd.set('locale', link.locale)
    fd.set('code', link.code)
    fd.set('token', link.token)
    fd.set('slip', file)
    setBusy(true)
    startTransition(async () => {
      const r = await uploadSlipAction(fd).catch(() => null)
      setBusy(false)
      if (!r || !r.ok) return s.setErr(r && !r.ok ? r.error : t.error)
      s.onPaid()
    })
  }

  const rows: [string, string, string, boolean][] = [
    ['bank', t.bank, bank.bankName, false],
    ['name', t.accountName, bank.accountName, false],
    ['no', t.accountNumber, bank.accountNumber, true],
    ['amt', t.amount, baht(s.amount), true],
  ]
  return (
    <form className="xfer" onSubmit={submit}>
      <dl className="sum bankd">
        {rows
          .filter((r) => r[2])
          .map(([k, label, v, canCopy]) => (
            <div key={k}>
              <dt>{label}</dt>
              <dd className={canCopy ? 'num' : undefined}>
                {v}
                {canCopy && (
                  <button type="button" className="cpy" onClick={() => copy(k, v)}>
                    {copied === k ? t.copied : t.copy}
                  </button>
                )}
              </dd>
            </div>
          ))}
      </dl>
      <label className="slipin" htmlFor={`${fid}-f`}>
        <span className="lbl">{t.slip}</span>
        <span className="drop">
          <b>{file ? file.name : t.slip}</b>
          <small>{t.slipHint}</small>
        </span>
      </label>
      <input
        id={`${fid}-f`}
        className="sr"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button className="pill y full" type="submit" disabled={busy || !file}>
        {busy ? t.sending : t.slipSend}
      </button>
    </form>
  )
}
