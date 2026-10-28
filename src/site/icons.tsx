// Line icons from the design 11 file, drawn in currentColor
const GEAR: Record<string, string> = {
  mask: '<path d="M8 22c0-6 5-8 24-8s24 2 24 8v9c0 6-4 10-10 10-7 0-8-6-14-6s-7 6-14 6c-6 0-10-4-10-10Z"/><path d="M32 15v18"/>',
  fins: '<path d="M26 6h12l2 14 6 26c0 4-4 8-10 8h-8c-6 0-10-4-10-8l6-26Z"/><path d="M24 20h16M28 28v20M36 28v20"/>',
  wetsuit:
    '<path d="M23 8h18l9 11-6 6-4-4v34h-8l-0-15-0 15h-8V21l-4 4-6-6Z"/>',
  computer:
    '<rect x="18" y="12" width="28" height="40" rx="10"/><circle cx="32" cy="30" r="8"/><path d="M32 26v4l3 2"/>',
  accessory:
    '<rect x="8" y="20" width="48" height="32" rx="6"/><path d="M22 20v-6a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v6M8 34h48"/>',
}

export function GearIcon({ category }: { category?: string | null }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: GEAR[category ?? ''] ?? GEAR.accessory }}
    />
  )
}

// Home highlight icons (home-sections.services[].icon)
const SERVICE: Record<string, string> = {
  mask: GEAR.mask,
  boat: '<path d="M6 40h52l-7 12H13Z"/><path d="M16 40V24h26l8 16M24 24V14h10v10"/><path d="M4 58c4 0 4-2 8-2s4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2"/>',
  certificate:
    '<rect x="8" y="12" width="48" height="34" rx="4"/><path d="M16 22h20M16 30h14"/><circle cx="44" cy="32" r="6"/><path d="M40 37l-2 13 6-3 6 3-2-13"/>',
  shield: '<path d="M32 6l22 8v14c0 14-9 25-22 30C19 53 10 42 10 28V14Z"/><path d="M22 31l7 7 13-14"/>',
  globe:
    '<circle cx="32" cy="32" r="24"/><path d="M8 32h48M32 8c8 8 8 40 0 48M32 8c-8 8-8 40 0 48"/>',
  shop: '<path d="M8 24l5-14h38l5 14M8 24h48v30H8ZM8 24c0 4 3 7 7 7s7-3 7-7c0 4 3 7 7 7s7-3 7-7c0 4 3 7 7 7s7-3 7-7"/><path d="M26 54V40h12v14"/>',
}

export function ServiceIcon({ icon }: { icon?: string | null }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: SERVICE[icon ?? ''] ?? SERVICE.mask }}
    />
  )
}

export function Chevron({ dir = 'right' }: { dir?: 'left' | 'right' | 'down' }) {
  const d = dir === 'left' ? 'M15 5l-7 7 7 7' : dir === 'down' ? 'M5 9l7 7 7-7' : 'M9 5l7 7-7 7'
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export function LineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.5s6-3.5 8.2-6C21.4 14.3 22 12.7 22 11c0-4.4-4.5-8-10-8Zm-3.6 10.4H6.5a.5.5 0 0 1-.5-.5V9a.5.5 0 0 1 1 0v3.4h1.4a.5.5 0 0 1 0 1Zm2.1-.5a.5.5 0 0 1-1 0V9a.5.5 0 0 1 1 0v3.9Zm4.7 0a.5.5 0 0 1-.9.3l-2-2.7v2.4a.5.5 0 0 1-1 0V9a.5.5 0 0 1 .9-.3l2 2.7V9a.5.5 0 0 1 1 0v3.9Zm3.1-2.5a.5.5 0 0 1 0 1h-1.4v.9h1.4a.5.5 0 0 1 0 1h-1.9a.5.5 0 0 1-.5-.5V9a.5.5 0 0 1 .5-.5h1.9a.5.5 0 0 1 0 1h-1.4v.9h1.4Z" />
    </svg>
  )
}

export function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  )
}

export function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  )
}
