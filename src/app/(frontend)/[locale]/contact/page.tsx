import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { isLocale } from '@/i18n/config'
import { getSite } from '@/lib/content'
import { mapsUrl, socialsOf } from '@/site/components/Footer'
import { PageIntro } from '@/site/components/PageIntro'
import { cleanContact, latLng, telHref } from '@/site/format'
import { getDict } from '@/site/i18n'
import { LineIcon, MailIcon, PhoneIcon } from '@/site/icons'
import { pageMeta } from '@/site/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getDict(locale)
  const site = await getSite(locale)
  return pageMeta({
    locale,
    path: '/contact',
    title: t.nav.contact,
    description: t.contact.lede,
    image: site?.settings.hero?.background,
  })
}

// Contact details from site settings. There is no collection for contact messages yet, so the
// page offers LINE, phone and email instead of a form.
export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = getDict(locale)
  const site = await getSite(locale)
  const c = site?.settings.contact
  const phone = cleanContact(c?.phone)
  const lineId = cleanContact(c?.lineId)
  const lineUrl = c?.lineUrl && /^https?:\/\//i.test(c.lineUrl) ? c.lineUrl : null
  const socials = socialsOf(c)
  const coords = latLng(c?.mapLocation)

  return (
    <>
      <PageIntro locale={locale} eb={t.contact.eb} title={t.contact.title} lede={t.contact.lede} />
      <section className="sec tight" style={{ paddingTop: 0 }}>
        <div className="w">
          <div className="cg3">
            {(lineUrl || lineId) && (
              <div className="cc">
                <span className="ic">
                  <LineIcon />
                </span>
                <h2>{t.contact.lineT}</h2>
                <p>{t.contact.lineP}</p>
                {lineId && <span className="v">{lineId}</span>}
                {lineUrl && (
                  <a className="pill y" href={lineUrl} target="_blank" rel="noopener noreferrer">
                    {t.contact.lineT}
                  </a>
                )}
              </div>
            )}
            {phone && (
              <div className="cc">
                <span className="ic">
                  <PhoneIcon />
                </span>
                <h2>{t.contact.callT}</h2>
                <p>{t.contact.callP}</p>
                <span className="v num">{phone}</span>
                <a className="pill k" href={telHref(phone)}>
                  {t.contact.callT}
                </a>
              </div>
            )}
            {c?.email && (
              <div className="cc">
                <span className="ic">
                  <MailIcon />
                </span>
                <h2>{t.contact.mailT}</h2>
                <p>{t.contact.mailP}</p>
                <span className="v">{c.email}</span>
                <a className="pill o" href={`mailto:${c.email}`}>
                  {t.contact.mailT}
                </a>
              </div>
            )}
          </div>

          <div className="cinfo">
            <dl>
              {c?.address && (
                <div>
                  <dt>{t.contact.address}</dt>
                  <dd>{c.address}</dd>
                </div>
              )}
              {c?.hours && (
                <div>
                  <dt>{t.contact.hours}</dt>
                  <dd>{c.hours}</dd>
                </div>
              )}
              {socials.length > 0 && (
                <div>
                  <dt>{t.contact.follow}</dt>
                  <dd className="soc">
                    {socials.map((s) => (
                      <a key={s.name} className="pill o sm" href={s.url} target="_blank" rel="noopener noreferrer">
                        {s.name}
                      </a>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
            {coords ? (
              <div className="map embed">
                <iframe
                  title={t.contact.address}
                  src={`https://maps.google.com/maps?q=${coords.join(',')}&z=16&hl=${locale}&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                <div className="mcard">
                  {c?.address && <p>{c.address}</p>}
                  <a className="pill k sm" href={mapsUrl(coords.join(','))} target="_blank" rel="noopener noreferrer">
                    {t.contact.map}
                  </a>
                </div>
              </div>
            ) : (
              c?.address && (
                <div className="map">
                  <div>
                    <span className="pin" />
                    <p>{c.address}</p>
                    <a className="pill wh sm" href={mapsUrl(c.address)} target="_blank" rel="noopener noreferrer">
                      {t.contact.map}
                    </a>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </section>
    </>
  )
}
