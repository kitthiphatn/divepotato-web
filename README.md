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

| Role | Email | Password |
|---|---|---|
| Admin (ผู้ดูแลระบบ) | `admin@divepotato.local` (or `SEED_ADMIN_EMAIL`) | `divepotato-demo` (or `SEED_ADMIN_PASSWORD`) |
| Staff (พนักงาน) | `staff@divepotato.local` | `divepotato-demo` |
| Editor (บรรณาธิการ) | `editor@divepotato.local` | `divepotato-demo` |
| Guide (ไกด์) | `guide@divepotato.local` | `divepotato-demo` |

Set `SEED_PHOTOS_DIR` to a folder of the shop's `.webp` photos to add them to Media while seeding.
All seeded people, prices and dates are sample data.

## Admin extras

- Dashboard: today's departures, slips waiting for review, departures 80%+ full, deposits this month
- `/admin/departures-calendar`: month view of departures coloured by how full they are
- `/admin/manifest/<departureId>`: printable participant list (also linked from each departure)

## Backoffice / หลังบ้านสำหรับทีมงาน

`http://localhost:3006/backoffice` is the day-to-day back office for the shop team. It uses the same
Payload login and access rules as `/admin`, in Thai by default (TH/EN switch at the top), with dark
mode, and works on phones (bottom tab bar). Everything the team edits day to day has a screen here,
so nobody is sent to `/admin`; it stays available for admins only, through "เปิดหลังบ้านแบบเต็ม
(สำหรับผู้ดูแลระบบ)" in the user menu and Settings.

| Role | Sees |
|---|---|
| Admin | Everything |
| Staff | Today, Bookings, Departures, Customers |
| Editor | Trips & courses, Website, Shop |
| Guide | Today (read-only), Departures and manifests |

- **Today**: departures today and this week, slips to review, balances due, missing health forms,
  seats on hold and low stock (Bangkok time).
- **Bookings**: search, status chips, booking panel with steps, slip, payments, participants and
  timeline. Approve or reject a slip, record a deposit or balance (creates a Payment), mark
  completed, cancel with refund, create a booking on hold. LINE/email buttons are marked "coming soon".
- **Departures**: month calendar or list, departure detail with participants, printable manifest,
  create (admin) and edit.
- **Trips & courses**: cards by category; editor with TH/EN text, price and deposit, day-by-day
  itinerary, description in the block editor, photos from the media picker, show-on-website switch
  (published/draft) and a live preview card.
- **Customers**: search, profile with booking history and staff notes, add/edit.
- **Website**: home hero slides and the announcement bar with live previews; articles list and
  article editor (`/backoffice/website/articles/new`, `/[id]`): TH/EN title, summary and body,
  category, publish date, slug, cover, SEO title/description with a Google preview, publish/draft
  switch and a live article preview.
- **Shop**: stock per size (tap a size to adjust with +/-); tap a product to open the product editor
  (`/backoffice/shop/new`, `/[id]`): TH/EN name and description, brand, category, slug, photos, a
  sizes table (SKU, size, price, stock) and a live product card. Deleting a product is admin-only.
- **Settings** (admin): deposit %, seat hold minutes, cancellation policy (TH/EN plain text), Omise
  and LINE keys (stored for phase 2), staff roles, **add staff** (name, email, role, temporary
  password) and **set a new password** for someone who forgot theirs.

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

See [CLAUDE.md](CLAUDE.md) for the project phases and working rules.
