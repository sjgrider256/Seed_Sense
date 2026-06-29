import { GeoJSON, Marker } from 'react-leaflet'
import L from 'leaflet'
import { COUNT_PROP, NAME_PROP } from '../lib/colorScale.js'

// Centroid of a polygon's outer ring as [lat, lng], computed as the midpoint
// of the ring's bounding box (tiles are axis-aligned rectangles, so this is
// the true center). Coordinates are [lon, lat] post-reprojection.
function ringCenterLatLng(feature) {
  const ring = feature.geometry.coordinates[0]
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  return [(minLat + maxLat) / 2, (minLon + maxLon) / 2]
}

function countLabelIcon(count) {
  return L.divIcon({
    className: 'tile-label',
    html: `<span>${count}</span>`,
    iconSize: null, // let CSS size it; avoids offsetting the anchor
  })
}

export default function TileChoropleth({ data, colorScale }) {
  const styleFor = (feature) => ({
    fillColor: colorScale(feature.properties?.[COUNT_PROP] ?? 0),
    fillOpacity: 0.7,
    color: '#555555',
    weight: 1,
  })

  const onEachFeature = (feature, layer) => {
    const name = feature.properties?.[NAME_PROP] ?? 'unknown tile'
    const count = feature.properties?.[COUNT_PROP] ?? 0
    layer.bindTooltip(
      `<strong>${name}</strong><br/>Seedlings: ${count}`,
      { sticky: true },
    )
  }

  return (
    <>
      <GeoJSON data={data} style={styleFor} onEachFeature={onEachFeature} />
      {data.features.map((feature, i) => {
        const count = feature.properties?.[COUNT_PROP] ?? 0
        return (
          <Marker
            key={feature.properties?.[NAME_PROP] ?? i}
            position={ringCenterLatLng(feature)}
            icon={countLabelIcon(count)}
            interactive={false}
            keyboard={false}
          />
        )
      })}
    </>
  )
}
