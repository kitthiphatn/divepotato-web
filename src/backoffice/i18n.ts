// Backoffice UI language (TH default, EN), chosen with the TH/EN toggle and kept in a cookie.
// Labels are written inline as L('ไทย', 'English'); shared labels live in the dictionaries below.
export type Lang = 'th' | 'en'
export const LANG_COOKIE = 'bo-lang'
export const THEME_COOKIE = 'bo-theme'

export const isLang = (v: unknown): v is Lang => v === 'th' || v === 'en'

export type Tr = (th: string, en: string) => string
export const translator =
  (lang: Lang): Tr =>
  (th, en) =>
    lang === 'en' ? en : th

type Pair = readonly [string, string]

// Booking statuses in Payload → the prototype's six visual states
export const STATUS_LABEL: Record<string, Pair> = {
  hold: ['จองไว้ชั่วคราว', 'On hold'],
  pending_review: ['รอตรวจสลิป', 'Slip to review'],
  deposit_paid: ['จ่ายมัดจำแล้ว', 'Deposit paid'],
  paid: ['จ่ายครบแล้ว', 'Fully paid'],
  completed: ['เสร็จสิ้น', 'Completed'],
  cancelled: ['ยกเลิกแล้ว', 'Cancelled'],
  refunded: ['คืนเงินแล้ว', 'Refunded'],
  expired: ['หมดเวลา', 'Expired'],
}
export const STATUS_CLASS: Record<string, string> = {
  hold: 'st-hold',
  pending_review: 'st-review',
  deposit_paid: 'st-deposit',
  paid: 'st-paid',
  completed: 'st-done',
  cancelled: 'st-cancelled',
  refunded: 'st-cancelled',
  expired: 'st-hold',
}
// Stepper: hold → slip review → deposit → paid → completed
export const STEPS: readonly (readonly [string, string, string])[] = [
  ['hold', 'จองไว้', 'Hold'],
  ['pending_review', 'รอตรวจสลิป', 'Slip review'],
  ['deposit_paid', 'มัดจำแล้ว', 'Deposit paid'],
  ['paid', 'จ่ายครบ', 'Fully paid'],
  ['completed', 'เสร็จสิ้น', 'Completed'],
]
export const VOID_STATUSES = ['cancelled', 'refunded', 'expired']

// Shop order statuses (Orders `status`) and their pill colours
export const ORDER_STATUS_LABEL: Record<string, Pair> = {
  pending_payment: ['รอชำระเงิน', 'Awaiting payment'],
  pending_review: ['รอตรวจสลิป', 'Slip to review'],
  paid: ['ชำระแล้ว รอแพ็ก', 'Paid, to pack'],
  packed: ['แพ็กแล้ว', 'Packed'],
  shipped: ['จัดส่งแล้ว', 'Shipped'],
  picked_up: ['รับที่ร้านแล้ว', 'Picked up'],
  cancelled: ['ยกเลิกแล้ว', 'Cancelled'],
  refunded: ['คืนเงินแล้ว', 'Refunded'],
  expired: ['หมดเวลา', 'Expired'],
}
export const ORDER_STATUS_CLASS: Record<string, string> = {
  pending_payment: 'st-hold',
  pending_review: 'st-review',
  paid: 'st-deposit',
  packed: 'st-deposit',
  shipped: 'st-paid',
  picked_up: 'st-paid',
  cancelled: 'st-cancelled',
  refunded: 'st-cancelled',
  expired: 'st-hold',
}

export const PROVIDER_LABEL: Record<string, Pair> = {
  omise: ['Omise', 'Omise'],
  stripe: ['Stripe', 'Stripe'],
  demo: ['เดโม', 'Demo'],
  slip: ['สลิปโอนเงิน', 'Transfer slip'],
  cash: ['เงินสดที่ร้าน', 'Cash at shop'],
  transfer: ['โอนผ่านธนาคาร', 'Bank transfer'],
}
// How the customer paid (Payments `method`)
export const METHOD_LABEL: Record<string, Pair> = {
  card: ['บัตร', 'Card'],
  promptpay: ['QR พร้อมเพย์', 'PromptPay QR'],
  transfer: ['โอนเงิน', 'Transfer'],
  cash: ['เงินสด', 'Cash'],
}
// Payment record statuses (Payments `status`) and their pill colours
export const PAY_STATUS_LABEL: Record<string, Pair> = {
  pending: ['รอตรวจสอบ', 'Pending'],
  succeeded: ['สำเร็จ', 'Succeeded'],
  failed: ['ไม่สำเร็จ', 'Failed'],
  rejected: ['ปฏิเสธสลิป', 'Rejected'],
}
export const PAY_STATUS_CLASS: Record<string, string> = {
  pending: 'st-review',
  succeeded: 'st-paid',
  failed: 'st-cancelled',
  rejected: 'st-cancelled',
}
export const KIND_LABEL: Record<string, Pair> = {
  deposit: ['มัดจำ', 'Deposit'],
  balance: ['ยอดคงเหลือ', 'Balance'],
  full: ['ชำระเต็มจำนวน', 'Full payment'],
  refund: ['คืนเงิน', 'Refund'],
}
export const SOURCE_LABEL: Record<string, Pair> = {
  website: ['เว็บไซต์', 'Website'],
  line: ['LINE', 'LINE'],
  phone: ['โทรศัพท์', 'Phone'],
  walk_in: ['หน้าร้าน', 'Walk-in'],
  agent: ['เอเจนต์', 'Agent'],
}
export const CERT_LABEL: Record<string, Pair> = {
  none: ['ยังไม่มีบัตร', 'No cert yet'],
  ow: ['Open Water', 'Open Water'],
  aow: ['Advanced', 'Advanced'],
  rescue: ['Rescue', 'Rescue'],
  dm: ['Divemaster', 'Divemaster'],
}
export const CERT_RANK = ['none', 'ow', 'aow', 'rescue', 'dm']

// Trip/course categories as the prototype shows them
export const CAT_LABEL: Record<string, Pair> = {
  course: ['คอร์ส PADI', 'PADI course'],
  daytrip: ['ทริปรายวัน', 'Day trip'],
  liveaboard: ['ลีฟอะบอร์ด', 'Liveaboard'],
  overseas: ['ต่างประเทศ', 'Overseas'],
}
export const ROLE_LABEL: Record<string, readonly [string, string, string, string]> = {
  admin: [
    'ผู้ดูแลระบบ',
    'Admin',
    'ทำได้ทุกอย่าง รวมถึงการเงินและตั้งค่า',
    'Everything, incl. money & settings',
  ],
  editor: ['บรรณาธิการ', 'Editor', 'แก้ไขหน้าเว็บ ทริป และบทความ', 'Website, trips and articles'],
  staff: ['พนักงาน', 'Staff', 'จัดการการจอง ตรวจสลิป รับชำระ', 'Bookings, slips, payments'],
  guide: ['ไกด์/ครู', 'Guide', 'ดูรอบออกเดินทางและใบรายชื่อ', 'Sees departures & manifests'],
}
export const DEP_STATUS_LABEL: Record<string, Pair> = {
  open: ['เปิดรับจอง', 'Open'],
  full: ['เต็ม', 'Full'],
  closed: ['ปิดรับจอง', 'Closed'],
}

export const POST_CATEGORIES = ['news', 'promotion', 'travel', 'tips'] as const
export type PostCategory = (typeof POST_CATEGORIES)[number]
export const POST_CAT_LABEL: Record<PostCategory, Pair> = {
  news: ['ข่าวสาร', 'News'],
  promotion: ['โปรโมชั่น', 'Promotion'],
  travel: ['รีวิวทริป', 'Trip report'],
  tips: ['เกร็ดความรู้ดำน้ำ', 'Diving tips'],
}

export const pair = (lang: Lang, p: Pair | undefined, fallback = '') =>
  p ? (lang === 'en' ? p[1] : p[0]) : fallback
