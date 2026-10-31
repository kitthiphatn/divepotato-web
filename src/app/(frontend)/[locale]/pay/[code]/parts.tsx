// Pieces shared by the booking and the shop order pay views
export function Check() {
  return (
    <div className="ck2">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </div>
  )
}

export function Note({
  title,
  text,
  lineUrl,
  lineLabel,
}: {
  title: string
  text: string
  lineUrl: string | null
  lineLabel: string
}) {
  return (
    <div className="paydone off">
      <h2>{title}</h2>
      <p>{text}</p>
      {lineUrl && (
        <div className="alt">
          <a className="pill y" href={lineUrl} target="_blank" rel="noopener noreferrer">
            {lineLabel}
          </a>
        </div>
      )}
    </div>
  )
}
