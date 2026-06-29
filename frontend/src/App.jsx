import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  LayersControl,
  LayerGroup,
  ImageOverlay,
  Pane,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import { prepareForLeaflet } from './lib/reproject.js'
import { getMaxCount, makeColorScale } from './lib/colorScale.js'
import TileChoropleth from './components/TileChoropleth.jsx'
import SeedlingPoints from './components/SeedlingPoints.jsx'
import Legend from './components/Legend.jsx'

const TILES_URL = '/data/tile_seedling_counts.geojson'
const POINTS_URL = '/data/all_seedling_predictions.geojson'
const ORTHO_IMG_URL = '/data/ortho.png'
const ORTHO_BOUNDS_URL = '/data/ortho_bounds.json'

// Allow zooming well past the OSM basemap's native zoom. The basemap simply
// goes blank (white) at that point, which is acceptable for these rural plots;
// the vector layers stay sharp at any zoom.
const MAX_ZOOM = 24

// Fits the map view to the tile layer once the data is available.
function FitToData({ data }) {
  const map = useMap()
  useEffect(() => {
    if (!data) return
    const layer = L.geoJSON(data)
    const bounds = layer.getBounds()
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] })
    }
  }, [data, map])
  return null
}

export default function App() {
  const [data, setData] = useState(null)
  const [points, setPoints] = useState(null)
  const [ortho, setOrtho] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    // Tile counts are required; a failure here blocks the map.
    fetch(TILES_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load data (HTTP ${res.status})`)
        return res.json()
      })
      .then((fc) => {
        if (cancelled) return
        // Detects the source CRS and reprojects to WGS84; throws (caught
        // below) if the CRS is missing or unsupported, leaving data null.
        setData(prepareForLeaflet(fc))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })

    // Seedling points are an optional overlay; a failure here is non-fatal
    // and simply leaves the overlay empty/unavailable.
    fetch(POINTS_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((fc) => {
        if (cancelled || !fc) return
        setPoints(prepareForLeaflet(fc))
      })
      .catch(() => {
        /* overlay stays unavailable */
      })

    // Orthomosaic overlay is also optional (produced by tools/prepare_ortho.py).
    // bounds JSON is already in WGS84 LatLngBounds form, so no reprojection.
    fetch(ORTHO_BOUNDS_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((meta) => {
        if (cancelled || !meta?.bounds) return
        setOrtho(meta.bounds)
      })
      .catch(() => {
        /* overlay stays unavailable */
      })

    return () => {
      cancelled = true
    }
  }, [])

  const maxCount = useMemo(
    () => (data ? getMaxCount(data.features) : 0),
    [data],
  )
  const colorScale = useMemo(() => makeColorScale(maxCount), [maxCount])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Seed Sense</h1>
        <div className="header-scene" aria-hidden="true">
          <div className="drone">
            <svg className="drone-svg" viewBox="0 0 40 20" width="40" height="20">
              <g
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                fill="#ffffff"
              >
                <line x1="6" y1="9" x2="34" y2="9" />
                <line x1="6" y1="5" x2="6" y2="9" />
                <line x1="34" y1="5" x2="34" y2="9" />
                <line x1="1" y1="5" x2="11" y2="5" />
                <line x1="29" y1="5" x2="39" y2="5" />
                <rect x="15" y="7" width="10" height="6" rx="3" />
              </g>
            </svg>
            <span className="scan-beam" />
          </div>
          <svg
            className="header-trees"
            viewBox="0 0 480 40"
            preserveAspectRatio="none"
          >
            <path
              fill="#14532d"
              d="M0 40 L0 30 L20 12 L40 30 L60 16 L80 30 L100 10 L120 30 L140 14 L160 30 L180 12 L200 30 L220 16 L240 30 L260 10 L280 30 L300 14 L320 30 L340 12 L360 30 L380 16 L400 30 L420 10 L440 30 L460 14 L480 30 L480 40 Z"
            />
          </svg>
        </div>
      </header>

      {error ? (
        <div className="app-error">
          <h2>Unable to display the map</h2>
          <p>{error}</p>
        </div>
      ) : (
        <>
          <MapContainer
            className="map"
            center={[0, 0]}
            zoom={2}
            maxZoom={MAX_ZOOM}
            scrollWheelZoom
          >
            {/* Dedicated pane so the ortho draws above the basemap (200) but
                below the tile polygons and seedling points (overlayPane 400). */}
            <Pane name="ortho" style={{ zIndex: 250 }} />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={MAX_ZOOM}
            />
            {data && (
              <>
                <TileChoropleth data={data} colorScale={colorScale} />
                <FitToData data={data} />
              </>
            )}
            {(ortho || points) && (
              <LayersControl position="topright">
                {ortho && (
                  <LayersControl.Overlay name="Orthomosaic">
                    <ImageOverlay url={ORTHO_IMG_URL} bounds={ortho} pane="ortho" />
                  </LayersControl.Overlay>
                )}
                {points && (
                  <LayersControl.Overlay name="Seedling points">
                    <LayerGroup>
                      <SeedlingPoints data={points} />
                    </LayerGroup>
                  </LayersControl.Overlay>
                )}
              </LayersControl>
            )}
          </MapContainer>

          {data && <Legend maxCount={maxCount} colorScale={colorScale} />}
        </>
      )}
    </div>
  )
}
