import { latLng } from '@/site/format'

export const mapsUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`

// The shop's map box: an embedded Google map when site settings have a map location,
// otherwise the address with a link that searches Google Maps for it
export function ShopMap({
  address,
  mapLocation,
  locale,
  label,
}: {
  address?: string | null
  mapLocation?: string | null
  locale: string
  label: string
}) {
  const coords = latLng(mapLocation)
  if (coords) {
    const q = coords.join(',')
    return (
      <div className="map embed">
        <iframe
          title={address || label}
          src={`https://maps.google.com/maps?q=${q}&z=16&hl=${locale}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <div className="mcard">
          {address && <p>{address}</p>}
          <a className="pill k sm" href={mapsUrl(q)} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        </div>
      </div>
    )
  }
  if (!address) return null
  return (
    <div className="map">
      <div>
        <span className="pin" />
        <p>{address}</p>
        <a className="pill wh sm" href={mapsUrl(address)} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      </div>
    </div>
  )
}
