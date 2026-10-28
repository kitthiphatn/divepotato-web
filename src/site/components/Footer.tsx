import Link from 'next/link'

import type { Locale } from '@/i18n/config'
import type { Site } from '@/lib/content'
import { cleanContact, telHref } from '@/site/format'
import type { Dict } from '@/site/i18n'

import { CookieSettingsLink } from './CookieConsent'
import type { NavItem } from './Header'

export function socialsOf(contact: Site['settings']['contact']) {
  const list: [string, string | null | undefined][] = [
    ['LINE', contact?.lineUrl],
    ['Facebook', contact?.facebookUrl],
    ['Instagram', contact?.instagramUrl],
    ['TikTok', contact?.tiktokUrl],
    ['YouTube', contact?.youtubeUrl],
    ['WhatsApp', contact?.whatsappUrl],
  ]
  return list.flatMap(([name, url]) =>
    url && /^https?:\/\//i.test(url.trim()) ? [{ name, url: url.trim() }] : [],
  )
}

export const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

export function Footer({
  locale,
  t,
  site,
  logo,
  items,
}: {
  locale: Locale
  t: Dict
  site: Site | null
  logo: string
  items: NavItem[]
}) {
  const s = site?.settings
  const c = s?.contact
  const phone = cleanContact(c?.phone)
  const socials = socialsOf(c)
  const year = new Date().getFullYear()
  const siteName = s?.siteName || 'Dive Potato Scuba Diving'
  return (
    <footer className="ftr" id="contact-info">
      <div className="w">
        <div className="fg">
          <div className="fb">
            <span className="flg">
              {/* eslint-disable-next-line @next/next/no-img-element -- logo of any format */}
              <img src={logo} width={88} height={88} alt={siteName} loading="lazy" />
            </span>
            {s?.footerNote && <p>{s.footerNote}</p>}
          </div>
          <div>
            <h3>{t.footer.contact}</h3>
            <dl>
              {c?.address && (
                <div>
                  <dt>{t.footer.address}</dt>
                  <dd>{c.address}</dd>
                </div>
              )}
              {phone && (
                <div>
                  <dt>{t.footer.phone}</dt>
                  <dd>
                    <a className="num" href={telHref(phone)}>
                      {phone}
                    </a>
                  </dd>
                </div>
              )}
              {c?.lineId && (
                <div>
                  <dt>LINE</dt>
                  <dd>
                    {c.lineUrl ? (
                      <a href={c.lineUrl} target="_blank" rel="noopener noreferrer">
                        {cleanContact(c.lineId)}
                      </a>
                    ) : (
                      cleanContact(c.lineId)
                    )}
                  </dd>
                </div>
              )}
              {c?.email && (
                <div>
                  <dt>{t.footer.email}</dt>
                  <dd>
                    <a href={`mailto:${c.email}`}>{c.email}</a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <div>
            {c?.hours && (
              <>
                <h3>{t.footer.hours}</h3>
                <dl>
                  <div>
                    <dd>{c.hours}</dd>
                  </div>
                </dl>
              </>
            )}
            <h3 style={c?.hours ? { marginTop: 28 } : undefined}>{t.footer.menu}</h3>
            <ul>
              {items
                .filter((i) => i.key !== 'home')
                .map((i) => (
                  <li key={i.key}>
                    <Link href={i.href}>{i.label}</Link>
                  </li>
                ))}
            </ul>
          </div>
          {socials.length > 0 && (
            <div>
              <h3>{t.footer.follow}</h3>
              <ul>
                {socials.map((so) => (
                  <li key={so.name}>
                    <a href={so.url} target="_blank" rel="noopener noreferrer">
                      {so.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {c?.address && (
          <div className="map">
            <div>
              <span className="pin" />
              <p>{c.address}</p>
              <a
                className="pill wh sm"
                href={mapsUrl(c.address)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.contact.map}
              </a>
            </div>
          </div>
        )}
        <div className="fbot">
          <span>
            © {year} {siteName}
          </span>
          <span className="r">
            <CookieSettingsLink label={t.footer.cookies} />
            <Link href={`/${locale === 'th' ? 'en' : 'th'}`} hrefLang={locale === 'th' ? 'en' : 'th'}>
              {locale === 'th' ? 'English' : 'ภาษาไทย'}
            </Link>
          </span>
        </div>
      </div>
    </footer>
  )
}
