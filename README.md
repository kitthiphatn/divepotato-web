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

## Public site / หน้าเว็บไซต์

`/th` (default) and `/en`, in the "design 11" style (white / yellow `#FFC20E` / black). Every page
has a TH/EN switch, and every word on it comes from the backoffice:

| Page | Path | Data |
|---|---|---|
| Home | `/{th,en}` | `home-sections` (hero slides, which sections show), `site-settings`, `about-page` stats, courses, trips, open departures, products, latest 3 published articles, FAQ |
| Courses | `/courses`, `/courses/<slug>` | `courses` (level chips derived from the PADI code), course departures |
| Trips | `/trips`, `/trips/<slug>` | `trips` (filter by type, month, people), departures, dive sites, cancellation policy from `booking-settings` |
| Equipment | `/equipment`, `/equipment/<slug>` | `products` + `product-variants` (sizes, price, stock); order and questions go to LINE |
| Articles | `/articles`, `/articles/<slug>` | `posts` + categories (filter, table of contents, related posts, booking CTA, per-article SEO) |
| About | `/about` | `about-page` |
| Contact | `/contact` | `site-settings` contact (LINE, phone, email, hours, map link). No form: there is no collection for messages |

Also wired from their globals: the **announcement bar**, the **popup** (shown once a day or once
per visit, a new version shows again after an edit) and **cookie consent** (PDPA; GA4 loads only
after consent). `sitemap.xml` (both languages with hreflang), `robots.txt`, per-page metadata with
canonical/hreflang/Open Graph, and JSON-LD (LocalBusiness on home, Product for trips and gear,
Course for courses, Article for posts).

**Booking request (no payment yet).** Every "จอง" button opens a sheet: departure, number of people,
name, phone, email, LINE ID and a note. A server action (`src/site/actions/booking.ts`) validates on
the server, has a honeypot field and a per-IP limit (5 requests / 10 minutes, in memory), then
creates a `customers` and a `bookings` record (source `website`) through the Local API. The booking
is saved as **`pending_review`**, not `hold`: a hold blocks seats until `holdExpiresAt`, but
nothing expires holds yet (that job comes with payments in P2), so a web request would keep seats
blocked. `pending_review` takes no seats and shows in the backoffice bookings list. The visitor sees
a thank-you screen with the booking code; the shop calls back by LINE or phone. To confirm it, use
**Reject slip** (moves it to hold) and then record the deposit; the **Approve slip** button needs an
uploaded slip, which web requests don't have.

**Freshness.** Pages are cached and rebuilt at most every 60 s; edits in the backoffice or `/admin`
(trips, courses, departures, articles, products, sizes, globals, booking settings) refresh them
right away through the revalidate hooks. Nothing is pre-rendered at build time (the build runs on an
empty database): each page renders from the real database on its first request. List pages with
filters (`/trips`, `/courses`, `/equipment`, `/articles`) render per request.

Code: pages in `src/app/(frontend)/[locale]`, components and helpers in `src/site`, queries in
`src/lib/content.ts`, styles in `src/app/(frontend)/globals.css` (plain CSS ported from the design;
no Tailwind on the public site). Font: IBM Plex Sans Thai from `@fontsource` (already installed;
the design's Inter + Noto Sans Thai would need Google Fonts at build time).

หน้าเว็บสาธารณะ `/th` และ `/en` ดึงข้อมูลทั้งหมดจากหลังบ้าน ปุ่ม "จอง" ส่งคำขอจอง (ยังไม่รับชำระเงิน)
คำขอจะเข้าไปที่หลังบ้านในสถานะ "รอตรวจสอบ" แล้วร้านติดต่อกลับทาง LINE หรือโทรศัพท์

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

See [CLAUDE.md](CLAUDE.md) for the project phases and working rules.
