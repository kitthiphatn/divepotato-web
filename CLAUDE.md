# Dive Potato: project rules

## Summary
Website and booking backend for **Dive Potato Scuba Diving**, a Thai PADI dive shop that sells
day trips, liveaboards, overseas trips and PADI courses.

**Stack:** Next.js 16 (App Router) · React 19 · Payload CMS 3 (admin at `/admin`) ·
SQLite via `@payloadcms/db-sqlite` (`data/divepotato.db`) · Lexical rich text · Tailwind CSS 4 ·
content localized TH (default) + EN, admin UI in TH/EN. The architecture mirrors the owner's
Lomprayah Cargo site (`landing-page-for-lomprayah-cargo-nextjs`).

## Phases
- **P0** Real admin + seed data so the client can try the backend. *(current)*
- **P1** The full public site in "design 11" (luxury, clean, white / yellow `#FFC20E` / black,
  real photos), TH/EN.
- **P2** Booking + Omise deposit, 15-minute seat hold, payment webhook, LINE Messaging API + email
  notifications.
- **P3** Operations: slip review, balance payments, cancel/refund, printable manifest, reports,
  audit.
- **P4** Gear shop with stock per size.
- **P5** Launch.

## Working rules
- **(a) Scope.** Stay strictly inside the agreed scope and the current phase. Propose extras;
  don't build them.
- **(b) Dependencies.** Name any new plugin, library or service and get the owner's OK before
  adding it.
- **(c) Skills.** Prefer the skills in `.claude/skills` when present.
- **(d) Ask first.** Ask the owner before pushing, merging or opening PRs.
- **(e) Git.** Feature branches only, small frequent commits, merge via PR, tag milestones,
  no force-push on shared branches. Never commit `node_modules`, `.next`, `data/*.db`, `media/`
  or `.env`.

## How to run
```bash
cp .env.example .env      # set PAYLOAD_SECRET
npm install
npm run seed              # sample data + demo users (safe on a fresh DB)
npm run dev               # http://localhost:3006 , admin at http://localhost:3006/admin
```
Other scripts: `npm run typecheck`, `npm run lint`, `npm run build`,
`npm run generate:types`, `npm run generate:importmap`,
`npm run payload migrate:create <name>` after any schema change (commit the migration).

## สรุปภาษาไทย
เว็บไซต์และระบบจองของร้านดำน้ำ Dive Potato ใช้ Next.js + Payload CMS + SQLite รองรับไทย/อังกฤษ
แบ่งงานเป็นเฟส: P0 หลังบ้านจริงพร้อมข้อมูลตัวอย่าง · P1 หน้าเว็บดีไซน์ 11 · P2 ระบบจอง + มัดจำ Omise
+ LINE/อีเมล · P3 งานปฏิบัติการ (ตรวจสลิป ยอดคงเหลือ ยกเลิก/คืนเงิน ใบรายชื่อ รายงาน) · P4 ร้านขายอุปกรณ์ ·
P5 เปิดใช้งานจริง
กติกา: ทำเฉพาะขอบเขตของเฟสปัจจุบัน, ขออนุญาตก่อนเพิ่มไลบรารี/บริการใหม่, ใช้ skills ใน `.claude/skills`
ถ้ามี, ถามเจ้าของก่อน push/merge/เปิด PR, ใช้ git แบบ feature branch และ commit เล็กๆ บ่อยๆ
รัน: `npm run dev`, `npm run seed`, หลังบ้านที่ `/admin`
