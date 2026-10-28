// Share of a departure's seats that are booked, and the colour band the admin views use for it
export function fullness(booked: number | null | undefined, capacity: number | null | undefined) {
  return capacity ? (booked ?? 0) / capacity : 0
}

export function fullnessBand(ratio: number, status?: string | null) {
  if (status === 'closed') return 'closed'
  if (ratio >= 1 || status === 'full') return 'full'
  if (ratio >= 0.8) return 'high'
  if (ratio >= 0.5) return 'mid'
  return 'low'
}
