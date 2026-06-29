import { Circle, Tooltip } from 'react-leaflet'

// Each detected seedling is drawn as a dark-red circle whose radius is in
// METERS, so it scales naturally as the user zooms in and out (a fixed-pixel
// marker would not). Radius is intentionally small to reflect a seedling.
const RADIUS_METERS = 0.5

const CIRCLE_STYLE = {
  color: '#5a0000', // stroke
  weight: 1,
  fillColor: '#8b0000', // dark red
  fillOpacity: 0.85,
}

// Coordinates are [lon, lat] after reprojection; Leaflet wants [lat, lng].
export default function SeedlingPoints({ data }) {
  return (
    <>
      {data.features.map((feature, i) => {
        const [lon, lat] = feature.geometry.coordinates
        const tile = feature.properties?.tile ?? 'unknown'
        const confidence = feature.properties?.confidence
        return (
          <Circle
            key={i}
            center={[lat, lon]}
            radius={RADIUS_METERS}
            pathOptions={CIRCLE_STYLE}
          >
            <Tooltip>{tooltipText(tile, confidence)}</Tooltip>
          </Circle>
        )
      })}
    </>
  )
}

function tooltipText(tile, confidence) {
  if (typeof confidence === 'number') {
    return `${tile} — confidence ${confidence}`
  }
  return tile
}
