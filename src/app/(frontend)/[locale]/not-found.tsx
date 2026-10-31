import Link from 'next/link'

// Shown for unknown pages inside /th or /en. The locale isn't passed to not-found, so the text
// is in both languages.
export default function NotFound() {
  return (
    <section className="nf">
      <div>
        <h1 className="dsp">ไม่พบหน้านี้ · Page not found</h1>
        <p>ลิงก์อาจเปลี่ยนไปแล้ว · The link may have changed.</p>
        <Link className="pill k" href="/">
          กลับหน้าแรก · Home
        </Link>
      </div>
    </section>
  )
}
