'use client'

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="btn btn--style-primary btn--size-medium"
      onClick={() => window.print()}
    >
      {label}
    </button>
  )
}
