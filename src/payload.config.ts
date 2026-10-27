import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { th } from '@payloadcms/translations/languages/th'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Faqs } from './collections/Faqs'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { AboutPage } from './globals/AboutPage'
import { Announcement } from './globals/Announcement'
import { CookieConsent } from './globals/CookieConsent'
import { HomeSections } from './globals/HomeSections'
import { Popup } from './globals/Popup'
import { SiteSettings } from './globals/SiteSettings'
import { defaultLocale } from './i18n/config'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' · Dive Potato',
    },
  },
  // Admin panel UI language
  i18n: {
    supportedLanguages: { th, en },
    fallbackLanguage: 'th',
  },
  // Content language: every localized field is filled in for TH and EN
  localization: {
    locales: [
      { code: 'th', label: 'ไทย' },
      { code: 'en', label: 'English' },
    ],
    defaultLocale,
    fallback: true,
  },
  collections: [Posts, Faqs, Media, Users],
  globals: [SiteSettings, HomeSections, AboutPage, Announcement, Popup, CookieConsent],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
    // Regenerate only with `npm run generate:types`, so `npm run dev` doesn't leave a changed file
    autoGenerate: false,
  },
  // SQLite file lives in this site's own folder
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || 'file:./data/divepotato.db',
    },
  }),
  sharp,
  plugins: [],
  // Databases set up before roles were enforced may have no admin; promote the first account
  onInit: async (payload) => {
    const admins = await payload.count({
      collection: 'users',
      where: { role: { equals: 'admin' } },
    })
    if (admins.totalDocs > 0) return
    const { docs } = await payload.find({ collection: 'users', sort: 'createdAt', limit: 1 })
    if (docs[0]) {
      await payload.update({ collection: 'users', id: docs[0].id, data: { role: 'admin' } })
      payload.logger.info(`Made ${docs[0].email} an admin (the site had none)`)
    }
  },
})
