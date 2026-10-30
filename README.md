# Dive Potato: website and booking backend

Website and admin for **Dive Potato Scuba Diving**, a PADI dive shop in Thailand.
Built with Next.js and Payload CMS (admin at `/admin`), SQLite, TH/EN.

เว็บไซต์และระบบหลังบ้านของร้านดำน้ำ Dive Potato (PADI) สร้างด้วย Next.js + Payload CMS
หลังบ้านอยู่ที่ `/admin` รองรับภาษาไทยและอังกฤษ

## Getting started / เริ่มพัฒนา

```bash
cp .env.example .env   # then set PAYLOAD_SECRET
npm install
npm run seed           # sample data (ข้อมูลตัวอย่าง)
npm run dev            # http://localhost:3006 and http://localhost:3006/admin
```

### Demo accounts (created by `npm run seed`)

| Role | Username | Email | Password |
|---|---|---|---|
| Admin (ผู้ดูแลระบบ) | `admin` | `admin@divepotato.local` (or `SEED_ADMIN_EMAIL`) | `divepotato-demo` (or `SEED_ADMIN_PASSWORD`) |
| Staff (พนักงาน) | `staff` | `staff@divepotato.local` | `divepotato-demo` |
| Editor (บรรณาธิการ) | `editor` | `editor@divepotato.local` | `divepotato-demo` |
| Guide (ไกด์) | `guide` | `guide@divepotato.local` | `divepotato-demo` |

Sign in at `/backoffice` (admins can also use `/admin`) with **either the username or the email**
(เข้าสู่ระบบด้วยชื่อผู้ใช้หรืออีเมลก็ได้). Usernames are lowercase `a-z`, `0-9` and `. _ -`.
Running the seed on an older database gives the demo accounts their usernames; the
`login_with_username` migration gives every existing account a username from its email
(`noi@shop.com` → `noi`, plus `-<id>` if two would clash), and the email keeps working.

Set `SEED_PHOTOS_DIR` to a folder of the shop's `.webp` photos to add them to Media while seeding.
All seeded people, prices and dates are sample data.

## Admin extras

- Dashboard: today's departures, slips waiting for review, departures 80%+ full, deposits this month
- `/admin/departures-calendar`: month view of departures coloured by how full they are
- `/admin/manifest/<departureId>`: printable participant list (also linked from each departure)

## Backoffice / หลังบ้านสำหรับทีมงาน

`http://localhost:3006/backoffice` is the day-to-day back office for the shop team. It uses the same
Payload login and access rules as `/admin`, in Thai by default (TH/EN switch at the top), with dark
mode, and works on phones (bottom tab bar). Every function of the Payload admin panel has a screen
here, so the team never needs `/admin` and the backoffice has no links to it. `/admin` itself still
works for **admins only**, by typing the address (emergency use): the Users collection's
`access.admin` allows the admin role only, and the proxy (`src/proxy.ts`) redirects Payload's
`/admin/unauthorized` page to `/backoffice`, so staff, editors and guides who open `/admin` (or sign
in there) land in the backoffice. This gates the panel only; the REST and Local API keep the
collection access rules.

| Role | Sees |
|---|---|
| Admin | Everything |
| Staff | Today, Bookings (with Payments), Departures, Customers |
| Editor | Trips & courses, Website, Shop |
| Guide | Today (read-only), Departures and manifests |

- **Today**: departures today and this week, slips to review, balances due, missing health forms,
  seats on hold and low stock (Bangkok time).
- **Bookings**: search, status chips, booking panel with steps, slip, payments, participants and
  timeline. Approve or reject a slip, record a deposit or balance (creates a Payment), mark
  completed, cancel with refund, create a booking on hold. LINE/email buttons are marked "coming soon".
- **Payments** (`/backoffice/bookings/payments`, tab in Bookings; staff and admin): every payment
  and refund, status chips and a provider filter, slip thumbnail (tap for the full slip), "open
  booking" link, 30 per page.
- **Departures**: month calendar or list, departure detail with participants, printable manifest,
  create (admin) and edit.
- **Trips & courses**: cards by category; editor with TH/EN text, price and deposit, day-by-day
  itinerary, description in the block editor, photos from the media picker, show-on-website switch
  (published/draft) and a live preview card. **Dive sites** tab (`/backoffice/trips/sites`): cards
  with photo, TH/EN name, region and description; add, edit, delete (warns which trips use the site).
- **Customers**: search, profile with booking history and staff notes, add/edit.
- **Website**: home hero slides and the announcement bar with live previews; articles list and
  article editor (`/backoffice/website/articles/new`, `/[id]`): TH/EN title, summary and body,
  category, publish date, slug, cover, SEO title/description with a Google preview, publish/draft
  switch and a live article preview.
  Further tabs (`/backoffice/website?tab=...`):
  - **หน้าแรก** (`home`): the home highlight cards (icon, TH/EN title and text, reorder, up to 6)
    and the show trips / courses / latest posts / FAQ switches, with a preview.
  - **ป๊อปอัป** (`popup`): on/off, how often, start/end (Thai time), white frame, auto-advance and
    seconds, up to 10 slides with a 16:9 and a 9:16 phone image per language and a link, with a
    desktop/phone preview.
  - **เกี่ยวกับเรา** (`about`): TH/EN title and intro, main image, key figures, body in the block
    editor, SEO (title, description, share image) with a Google preview and a page preview.
  - **คำถามที่พบบ่อย** (`faq`): list by order with category chips, add/edit in a dialog (TH/EN
    question and answer, category, show on home, order), delete, and up/down to reorder.
  - **แบนเนอร์คุกกี้** (`cookie`): TH/EN message and privacy policy link, with a preview.
  - **ข้อมูลร้าน** (`site`): the site-settings global: TH/EN site name, logo, favicon, phone, email,
    LINE ID and link, TH/EN hours and address, Facebook/Instagram/TikTok/YouTube/WhatsApp links,
    the fallback home hero, TH/EN footer note and the Google Analytics ID, with a footer preview.
  - **คลังรูป** (`media`): every file in Media with search, upload (same form and server action as
    the picker), TH/EN alt text editing, and delete for admins only. Before deleting, it lists where
    the photo is still used (trips, courses, articles, products, dive sites, payment slips, shop
    info, home slides, About and popup); photos placed inside rich text bodies are not checked.
- **Shop**: stock per size (tap a size to adjust with +/-); tap a product to open the product editor
  (`/backoffice/shop/new`, `/[id]`): TH/EN name and description, brand, category, slug, photos, a
  sizes table (SKU, size, price, stock) and a live product card. Deleting a product is admin-only. **Rental gear** tab
  (`/backoffice/shop/rentals`): TH/EN name, price per day and stock (tap the stock to adjust with
  +/-); add and edit, delete for admins only.
- **Settings** (admin): deposit %, seat hold minutes, cancellation policy (TH/EN plain text), Omise
  and LINE keys (stored for phase 2), staff roles, **add staff** (name, email, username prefilled
  from the email, role, temporary password), **edit a username** and **set a new password** for
  someone who forgot theirs. **Audit log** (`/backoffice/settings/audit`): read-only list of what
  the audit hook records (bookings, payments, departures, trips), filtered by collection, user and
  action, 30 per page, with the changed fields and their before/after values.

**Block editor** (articles and trip descriptions): one card per block: paragraph, H2, H3, bullet or
numbered list (one item per line), quote and photo. Inside the text: `**bold**`, `*italic*` and
`[link text](https://...)`. `src/backoffice/blocks.ts` converts the stored Lexical JSON to blocks
and back, with no editor library. A body is only rewritten for a language that was edited. If a
body has formatting the simple editor can't show (tables, embeds, underline...), the screen warns
that editing keeps the text but simplifies that formatting.

**Media picker**: every photo field (trip and product photos, article cover and photos, home slides)
opens one picker with search, the Media grid and **อัปโหลดรูป**. Uploads (JPG, PNG, WebP, GIF or AVIF,
up to 10 MB) need Thai alt text (English is optional and copies the Thai if empty) and go through a
server action on the Local API, so files land in `MEDIA_DIR` like any other Media upload.
Server actions accept bodies up to 12 MB for this (`experimental.serverActions.bodySizeLimit`).

## Database changes / เปลี่ยนโครงสร้างฐานข้อมูล

`npm run dev` and `npm run seed` push schema changes to the local SQLite file automatically.
After changing a collection or global, create a migration and commit it:

```bash
npm run payload migrate:create <name>
npm run generate:types
```

Production applies pending migrations on start. A database filled by `npm run dev`/`npm run seed`
is a dev (pushed) database, so build against a throwaway database, as the Lomprayah CI does:

```bash
DATABASE_URL=file:/tmp/build.db npm run build
```

## Deploy (Ubuntu mini PC) / ขึ้นเว็บเดโมบนมินิพีซี

A self-hosted demo runs on an Ubuntu Server 24.04 mini PC behind a Cloudflare Tunnel at
https://demo.cleanandcare.live: install, tunnel, nightly backups, restore and updates are scripted in
`deploy/ubuntu/`. Step-by-step guide (Thai first): [deploy/ubuntu/README.md](deploy/ubuntu/README.md).

ขั้นตอนติดตั้งแบบทีละขั้น (ภาษาไทย) อยู่ที่ [deploy/ubuntu/README.md](deploy/ubuntu/README.md)

See [CLAUDE.md](CLAUDE.md) for the project phases and working rules.
