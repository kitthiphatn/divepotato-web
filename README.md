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
| Guide (ไกด์) | `guide@divepotato.local` | `divepotato-demo` |

Set `SEED_PHOTOS_DIR` to a folder of the shop's `.webp` photos to add them to Media while seeding.
All seeded people, prices and dates are sample data.

## Admin extras

- Dashboard: today's departures, slips waiting for review, departures 80%+ full, deposits this month
- `/admin/departures-calendar`: month view of departures coloured by how full they are
- `/admin/manifest/<departureId>`: printable participant list (also linked from each departure)

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
