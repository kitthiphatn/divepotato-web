# เปิดรับชำระเงินจริง (Omise / Stripe / KBank)

> **English summary:** how to take real deposits. Card and PromptPay QR go through Omise or Stripe
> (pick one in the backoffice), bank transfers are checked by staff from the uploaded slip. Put the
> provider's keys in `/opt/divepotato/.env` (`OMISE_PUBLIC_KEY`, `OMISE_SECRET_KEY` or
> `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`) and restart the service; keys are never stored in
> the database. Register the webhook (`https://<domain>/webhooks/omise` for all charge events, or
> `https://<domain>/webhooks/stripe` for `payment_intent.succeeded`,
> `payment_intent.payment_failed` and `payment_intent.canceled`). In **Settings → Payment
> channels** choose the provider, tick the methods and enter the bank account. The site ships in
> **demo** mode (simulated payments, no money moves); choosing Omise or Stripe ends it. Slip QR
> check: only proves a slip has a QR and wasn't used before, never the amount or receiver; staff
> always approve by hand. Go-live: test keys + test card, then live keys, one small real payment,
> refund it. Gear shop orders (`DP-ORD-…`) use the same provider, methods, webhooks and slip review,
> but the customer pays the full amount; delivery rules (pickup, post, 100 THB fee, free from
> 3,000 THB) are in **Settings → Shop delivery** and orders are handled in **Shop → Orders**.
> **KBank (K Payment Gateway, Embedded UI)** is a third choice: set `KBANK_PUBLIC_KEY`,
> `KBANK_SECRET_KEY`, `KBANK_MID` (cards only) and `KBANK_ENV` (`sandbox` or `production`), and
> register `https://<domain>/webhooks/kbank` as the Notify URL and
> `https://<domain>/webhooks/kbank/return` as the Callback URL in the KBank merchant portal (section 8).

หน้าชำระเงินของเว็บมี 3 ช่องทาง

| ช่องทาง | ยืนยันอย่างไร |
| --- | --- |
| บัตรเครดิต/เดบิต | ผ่าน Omise หรือ Stripe ยืนยันอัตโนมัติ (รวม 3-D Secure / OTP ของธนาคาร) |
| QR พร้อมเพย์ | ผ่าน Omise หรือ Stripe ลูกค้าสแกนจ่าย หน้าเว็บยืนยันเองภายในไม่กี่วินาที |
| โอนเงินแล้วแนบสลิป | ลูกค้าอัปโหลดสลิป ทีมงานตรวจและกดอนุมัติในหลังบ้าน |

เลือกใช้ **Omise, Stripe หรือ KBank อย่างใดอย่างหนึ่ง** สลับได้จากหลังบ้านโดยไม่ต้องแก้โค้ด
ข้อมูลบัตรของลูกค้าส่งตรงไปที่ผู้ให้บริการ ไม่ผ่านเซิร์ฟเวอร์ของร้าน (KBank ดูหัวข้อ 8)

## 1. สมัครและเอาคีย์ / Get the keys

ทุกเจ้ามีคีย์ 2 ชุด: **โหมดทดสอบ (test)** ไว้ลองระบบ ไม่ตัดเงินจริง และ **โหมดจริง (live)**
ใช้ได้หลังผ่านการยืนยันตัวตน/เอกสารบริษัทแล้ว เริ่มจาก test ก่อนเสมอ

### Omise (Opn Payments)

1. สมัครที่ https://dashboard.omise.co แล้วยืนยันอีเมล
2. เมนู **Keys** จะเห็น
   - Public key ขึ้นต้นด้วย `pkey_test_` (ทดสอบ) หรือ `pkey_` (จริง)
   - Secret key ขึ้นต้นด้วย `skey_test_` หรือ `skey_` กด Show เพื่อดู
3. สลับ test/live ที่ปุ่มมุมบนของแดชบอร์ด คีย์จะเปลี่ยนตาม
4. เปิดใช้ PromptPay ในบัญชี (ถ้ายังไม่เปิด ติดต่อ Omise) โหมดจริงต้องส่งเอกสารให้ Omise อนุมัติก่อน

### Stripe

1. สมัครที่ https://dashboard.stripe.com ตั้งประเทศบัญชีเป็นประเทศไทย
2. เมนู **Developers → API keys**
   - Publishable key ขึ้นต้นด้วย `pk_test_` หรือ `pk_live_`
   - Secret key ขึ้นต้นด้วย `sk_test_` หรือ `sk_live_` (กด Reveal)
3. สลับ test/live ด้วยสวิตช์ **Test mode**
4. เปิด **PromptPay** ที่ **Settings → Payment methods** (บัญชีไทยเท่านั้น)
5. PromptPay ของ Stripe ต้องมีอีเมล ระบบใช้อีเมลลูกค้า ถ้าลูกค้าไม่กรอก จะใช้อีเมลร้านจาก
   หน้าตั้งค่าเว็บไซต์ (ข้อมูลติดต่อ) ควรกรอกอีเมลร้านไว้

## 2. ใส่คีย์ในเซิร์ฟเวอร์ / Put the keys on the server

คีย์ **ไม่เก็บในฐานข้อมูลและไม่กรอกในหลังบ้าน** ใส่ในไฟล์ `.env` บนเซิร์ฟเวอร์เท่านั้น

```bash
sudo nano /opt/divepotato/.env
```

ใส่เฉพาะของเจ้าที่จะใช้ (ใส่ทั้งสองเจ้าก็ได้ ถ้าอยากสลับไปมา)

```bash
OMISE_PUBLIC_KEY=pkey_test_xxxxxxxx
OMISE_SECRET_KEY=skey_test_xxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxx
```

บันทึก (Ctrl+O, Enter, Ctrl+X) แล้วรีสตาร์ทเว็บ ไม่ต้อง build ใหม่

```bash
sudo systemctl restart divepotato
```

ตรวจว่า `NEXT_PUBLIC_SERVER_URL` ใน `.env` เป็นโดเมนจริงแบบ `https://` ด้วย เพราะใช้สร้างลิงก์
กลับจากหน้า 3-D Secure และ URL ของ webhook

> Secret key (`skey_…`, `sk_…`) เทียบเท่ารหัสผ่านบัญชีรับเงิน ห้ามส่งในแชต ห้าม commit เข้า git
> ถ้าหลุดให้กด roll/regenerate ในแดชบอร์ดทันทีแล้วใส่คีย์ใหม่

## 3. ลงทะเบียน Webhook

Webhook ทำให้ระบบรู้ผลการจ่ายเงินแม้ลูกค้าปิดหน้าเว็บไปก่อน ดู URL ที่ถูกต้องได้ในหลังบ้าน
**ตั้งค่า → ช่องทางรับชำระเงิน** (ด้านล่างสุดของหัวข้อ)

| เจ้า | URL | เหตุการณ์ (events) |
| --- | --- | --- |
| Omise | `https://<โดเมน>/webhooks/omise` | ทั้งหมด (Omise ส่งทุก event ไปที่ URL เดียว) ที่ใช้คือ `charge.complete` |
| Stripe | `https://<โดเมน>/webhooks/stripe` | `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` |

- **Omise:** แดชบอร์ด → **Webhooks** → ใส่ URL (ตั้งแยกกันทั้งโหมด test และ live)
- **Stripe:** **Developers → Webhooks → Add endpoint** → ใส่ URL และเลือก 3 event ข้างบน
  (ทำทั้งโหมด test และ live) ไม่ต้องใช้ signing secret

ทำไมไม่ต้องใช้ signing secret: ระบบไม่เชื่อข้อมูลที่ webhook ส่งมา หยิบแค่เลขรายการ แล้วถามผลจาก
Omise/Stripe ด้วย secret key ของร้านเองทุกครั้ง ถ้ามีคนปลอม webhook ก็ไม่มีผลอะไร

## 4. ตั้งค่าในหลังบ้าน / Backoffice settings

ล็อกอินด้วยบัญชี admin → **ตั้งค่า → ช่องทางรับชำระเงิน**

1. **ผู้ให้บริการ:** เลือก Omise หรือ Stripe การ์ดจะบอกว่าคีย์แต่ละตัว "ตั้งแล้ว" หรือ "ยังไม่ตั้ง"
   (ไม่แสดงค่าคีย์) ถ้าเลือกเจ้าที่ยังไม่มีคีย์ จะมีกล่องเตือนสีแดง และหน้าชำระเงินจะ **ซ่อน**
   บัตรและ QR ไว้ (เหลือแค่โอนเงิน) จนกว่าจะใส่คีย์และรีสตาร์ท
2. **ช่องทางที่เปิดให้ลูกค้า:** ติ๊กบัตร / QR พร้อมเพย์ / โอนเงิน ต้องเปิดอย่างน้อย 1 ช่องทาง
3. **บัญชีธนาคารสำหรับโอน:** ธนาคาร ชื่อบัญชี เลขที่บัญชี ถ้าไม่ใส่เลขที่บัญชี หน้าชำระเงิน
   จะไม่แสดงการโอนเงิน
4. กด **บันทึกการตั้งค่า**

### ปิดโหมดเดโม / Turn off demo mode

เว็บเริ่มต้นในโหมด **เดโม**: บัตรและ QR เป็นของจำลอง ไม่มีเงินเข้าจริง (บัตรทดสอบ
4242 4242 4242 4242) และรายการชำระจะมีป้าย **DEMO** ในหลังบ้าน
เมื่อเลือก Omise หรือ Stripe แล้วบันทึก โหมดเดโมจะหยุดทันที ไม่มีทางย้อนไปใช้เดโมเองโดยอัตโนมัติ
แม้คีย์จะหายก็ตาม (กรณีนั้นบัตร/QR แค่ถูกซ่อน)

## 5. สลิปโอนเงิน / Bank transfer slips

- ลูกค้าอัปโหลดรูปสลิป (JPG, PNG, WEBP, HEIC ไม่เกิน 5 MB) การจองเปลี่ยนเป็น **รอตรวจสลิป**
  และที่นั่งยังถูกกันไว้จนกว่าทีมงานจะอนุมัติหรือปฏิเสธ
- ระบบอ่าน **QR บนสลิป** ให้อัตโนมัติ แล้วแสดงป้ายในหน้าตรวจสลิป
  - เขียว **QR ถูกต้อง ไม่ซ้ำ**: พบ QR และยังไม่เคยใช้กับรายการอื่น
  - เหลือง **ไม่พบ QR**: อ่าน QR ไม่ได้ (รูปเบลอ ครอปจนไม่เห็น QR หรือไฟล์ HEIC บางแบบ) ต้องตรวจเอง
  - แดง **สลิปซ้ำ**: QR เดียวกันเคยใช้กับการจองอื่นแล้ว (มีลิงก์ไปการจองนั้น) น่าสงสัยมาก
- **ข้อจำกัด:** QR บนสลิปธนาคารไทยมีแค่รหัสธนาคารและเลขอ้างอิงรายการ **ไม่มียอดเงินและไม่มีบัญชี
  ผู้รับ** ระบบจึงตรวจยอดหรือบัญชีปลายทางไม่ได้ และ **ไม่อนุมัติเอง** ทีมงานต้องเช็กยอดเข้าบัญชีจริง
  ในแอปธนาคารก่อนกดอนุมัติทุกครั้ง
- ปฏิเสธสลิป → การจองกลับเป็น "จองไว้" และกันที่นั่งต่ออีกตามเวลาที่ตั้งไว้ ให้ลูกค้าส่งสลิปใหม่

## 6. ร้านค้าออนไลน์ / Gear shop orders

คำสั่งซื้ออุปกรณ์จากหน้าเว็บ (เลขขึ้นต้น `DP-ORD-`) ใช้ผู้ให้บริการ ช่องทาง webhook และการตรวจสลิป
ชุดเดียวกับการจอง ไม่ต้องตั้งค่าเพิ่มที่ Omise/Stripe ต่างกันตรงที่ลูกค้า **จ่ายเต็มจำนวน** ไม่มีมัดจำ

- **ตั้งค่า → การจัดส่งสินค้า:** เปิด/ปิด รับที่ร้าน (ฟรี) และส่งไปรษณีย์, ค่าส่ง (เริ่มต้น 100 บาท),
  ส่งฟรีเมื่อซื้อครบ (เริ่มต้น 3,000 บาท, ใส่ 0 = ไม่มีส่งฟรี)
- **สต็อก:** สั่งซื้อแล้วสินค้าถูก **จอง** ไว้ตามเวลาเดียวกับการกันที่นั่ง (ตั้งค่า → การจองและมัดจำ)
  ระหว่างรอชำระหรือรอตรวจสลิป คนอื่นซื้อชิ้นนั้นไม่ได้ จ่ายแล้วจึง **ตัดสต็อกจริง** ถ้าไม่จ่ายภายในเวลา
  คำสั่งซื้อหมดเวลาและปล่อยสินค้าคืนเอง ยกเลิกคำสั่งซื้อที่จ่ายแล้วแต่ยังไม่ส่ง ระบบคืนสต็อกให้
  (ถ้าส่ง/รับไปแล้ว ไม่คืนสต็อกอัตโนมัติ ปรับเองถ้าได้ของคืน)
- **ร้านค้า → คำสั่งซื้อ:** ตรวจสลิป → แพ็กเรียบร้อย → จัดส่ง (ใส่เลขพัสดุ) หรือ ลูกค้ารับที่ร้านแล้ว
  ยกเลิก/คืนเงินได้จากปุ่ม ⋯ (คืนเงินบัตรต้องทำในแดชบอร์ด Omise/Stripe เหมือนการจอง)
- ทีมงานบทบาท staff เห็นเฉพาะแท็บคำสั่งซื้อ ส่วนสินค้าและอุปกรณ์ให้เช่ายังเป็นของ admin/editor

## 7. เช็กลิสต์ก่อนเปิดจริง / Go-live checklist

1. [ ] ใส่คีย์ **test** ใน `.env` รีสตาร์ท แล้วเลือกเจ้านั้นในหลังบ้าน ไม่มีกล่องเตือนสีแดง
2. [ ] ลงทะเบียน webhook ในโหมด test
3. [ ] จองทริปจากหน้าเว็บ จ่ายด้วยบัตรทดสอบของเจ้านั้น
       (Omise และ Stripe ใช้ `4242 4242 4242 4242` วันหมดอายุในอนาคต CVC อะไรก็ได้)
       → หน้าเว็บขึ้น "ชำระมัดจำเรียบร้อย" และหลังบ้านเป็น **มัดจำแล้ว**
4. [ ] ลอง QR พร้อมเพย์ในโหมด test (แดชบอร์ดมีปุ่มจำลองว่าจ่ายแล้วในหน้ารายการนั้น)
       → หน้าเว็บเปลี่ยนเองภายในไม่กี่วินาที
5. [ ] ลองโอนเงินแนบสลิป แล้วอนุมัติในหลังบ้าน
6. [ ] เปลี่ยนเป็นคีย์ **live** ใน `.env` รีสตาร์ท และลงทะเบียน webhook ในโหมด live
7. [ ] จ่ายจริงด้วยบัตรของร้านเอง **ยอดเล็กๆ** (เช่น ทริปที่ตั้งราคาทดสอบไว้ หรือคนเดียว)
       ตรวจว่ายอดเข้าในแดชบอร์ด Omise/Stripe และหลังบ้านขึ้น **มัดจำแล้ว**
8. [ ] **คืนเงิน (refund)** รายการทดสอบนั้นในแดชบอร์ด Omise/Stripe แล้วยกเลิกการจองในหลังบ้าน
       (ปุ่มยกเลิก ใส่ยอดคืน) ตอนนี้การคืนเงินผ่านบัตรต้องทำในแดชบอร์ดของเจ้านั้นเอง
9. [ ] สั่งซื้ออุปกรณ์จากหน้าเว็บ 1 รายการด้วยบัตรทดสอบ แล้วยกเลิก/คืนเงินในหลังบ้าน ตรวจว่าสต็อกกลับมา
10. [ ] ลบทริป/ราคาทดสอบ (ถ้ามี) และแจ้งทีมงานเรื่องการตรวจสลิปและคำสั่งซื้อ

## 8. KBank (K Payment Gateway)

ใช้ **Embedded UI** ของกสิกรไทย: หน้าชำระเงินเปิดหน้าต่างของ KBank ให้ลูกค้ากรอกบัตรหรือสแกน QR
ข้อมูลบัตรไม่ผ่านเซิร์ฟเวอร์ของร้าน ระบบได้แค่ token ไปตัดเงินด้วยยอดจากฐานข้อมูล แล้วถามผลจาก KBank
ด้วย secret key ทุกครั้งก่อนยืนยัน

**สิ่งที่ร้านต้องสมัครกับ KBank**

1. สมัคร **K PAYMENT GATEWAY แบบ Embedded UI** ทั้ง **บัตร (Visa / Mastercard / JCB แบบ 3D Secure)**
   และ **Thai QR** ถ้าต้องการทั้งสองอย่าง (ระหว่างทดสอบติดต่อ `kpgw_imp@kasikornbank.com`)
2. ได้ user สำหรับ **Merchant Portal** ของ Sandbox ก่อน ในนั้นมี Public key (`pkey_test_…`)
   และ Secret key (`skey_test_…`) เมื่อเปิดใช้จริงจะได้ portal และคีย์ชุดจริง (`pkey_prod_…`, `skey_prod_…`)
3. ขอ **MID (Merchant ID)** สำหรับรับบัตร (15 หลัก) QR ใช้ได้โดยไม่ต้องมี MID
4. แจ้ง URL สองตัวนี้ให้ KBank (หรือตั้งเองใน Merchant Portal ด้วย user ระดับ Admin) แยกทั้ง Sandbox และจริง
   - **Notify URL:** `https://<โดเมน>/webhooks/kbank` (รับผลบัตรและ QR แบบ real-time)
   - **Callback URL:** `https://<โดเมน>/webhooks/kbank/return` (ลูกค้ากลับมาหลังกรอก OTP 3D Secure)
5. ถ้า KBank ใช้ IP Whitelist ให้แจ้ง IP ของเซิร์ฟเวอร์ด้วย

**ใส่ใน `/opt/divepotato/.env`** แล้วรีสตาร์ท

```bash
KBANK_PUBLIC_KEY=pkey_test_xxxxxxxx
KBANK_SECRET_KEY=skey_test_xxxxxxxx
KBANK_MID=401xxxxxxxxx001
KBANK_ENV=sandbox
```

| `KBANK_ENV` | API | สคริปต์หน้าต่างชำระเงิน |
| --- | --- | --- |
| `sandbox` (ค่าเริ่มต้น) | `https://dev-kpaymentgateway-services.kasikornbank.com` | `https://dev-kpaymentgateway.kasikornbank.com/ui/v2/kpayment.min.js` |
| `production` | `https://kpaymentgateway-services.kasikornbank.com` | `https://kpaymentgateway.kasikornbank.com/ui/v2/kpayment.min.js` |

คีย์ชุดทดสอบใช้กับ `sandbox` เท่านั้น คีย์จริงใช้กับ `production` เท่านั้น เปลี่ยนพร้อมกันเสมอ
ถ้าไม่ใส่ `KBANK_MID` หน้าชำระเงินจะมีแค่ QR (หลังบ้านขึ้นกล่องเตือนสีเหลือง)

- **ทดสอบ QR:** ใน Sandbox ใช้ **QR Simulator** ใน Merchant Portal ค้นหา QR ID แล้วกด Pay
  หน้าเว็บเปลี่ยนเป็นชำระแล้วเองภายในไม่กี่วินาที
- **คืนเงิน:** void/refund บัตรทำใน Merchant Portal ของ KBank Thai QR คืนเงินผ่านระบบไม่ได้
  (void ได้เฉพาะจ่ายผ่าน K PLUS) ต้องโอนคืนเอง
- Webhook ตรวจ checksum (SHA-256 ด้วย secret key) ถ้าไม่ตรงตอบ 401 ถ้าตรงก็ยังถามผลจาก KBank ซ้ำก่อนยืนยัน

## แก้ปัญหา / Troubleshooting

| อาการ | สาเหตุ / วิธีแก้ |
| --- | --- |
| หน้าชำระเงินมีแค่ "โอนเงิน" | ยังไม่ได้ใส่คีย์ของเจ้าที่เลือก หรือยังไม่ได้รีสตาร์ทหลังแก้ `.env` |
| KBank: ไม่มีช่องบัตร มีแค่ QR | ยังไม่ได้ใส่ `KBANK_MID` |
| KBank: ปุ่มชำระกดไม่ได้ / หน้าต่าง KBank ไม่ขึ้น | `KBANK_ENV` ไม่ตรงกับชุดคีย์ (test ต้องคู่กับ `sandbox`) หรือเบราว์เซอร์บล็อกสคริปต์ของ kasikornbank.com |
| หน้าชำระเงินไม่มี "โอนเงิน" | ยังไม่ได้ใส่เลขที่บัญชีในหลังบ้าน |
| จ่ายแล้วหลังบ้านยังเป็น "จองไว้" | ตรวจ webhook ในแดชบอร์ด (ดูว่าส่งไม่สำเร็จไหม) และ `journalctl -u divepotato -f` ระบบจะเช็กซ้ำเองตอนลูกค้าเปิดหน้าชำระเงินอีกครั้ง |
| ลูกค้าจ่ายหลังหมดเวลากันที่นั่ง | ถ้ายังมีที่ว่าง ระบบรับการจองให้ ถ้าเต็มแล้ว ไทม์ไลน์การจองจะขึ้น "ต้องคืนเงินลูกค้า" ให้ทีมงานคืนเงิน |
| ไทม์ไลน์ขึ้น "อาจชำระซ้ำ" | ลูกค้าสแกนจ่าย QR สองครั้ง ตรวจในแดชบอร์ดแล้วคืนเงินรายการที่เกิน |
| ลูกค้าจ่ายคำสั่งซื้อหลังหมดเวลา | ถ้ายังมีของ ระบบรับคำสั่งซื้อให้ ถ้าหมดแล้ว ไทม์ไลน์ขึ้น "ต้องคืนเงินลูกค้า" |
| หน้าเช็กเอาต์บอกยังไม่เปิดสั่งซื้อออนไลน์ | ปิดทั้งรับที่ร้านและส่งไปรษณีย์ไว้ใน ตั้งค่า → การจัดส่งสินค้า |
