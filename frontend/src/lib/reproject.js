import proj4 from 'proj4'

// Reproject GeoJSON from its declared CRS into WGS84 lon/lat for Leaflet.
//
// The source CRS is detected from the GeoJSON `crs` member rather than assumed.
// Supported source systems (Phase 2): WGS84 (EPSG:4326), Web Mercator
// (EPSG:3857), and WGS84 / UTM zones (EPSG:326xx north, EPSG:327xx south) whose
// proj4 definitions are computed from the zone number — no external lookup.
// Any other EPSG code is rejected with a clear error; there is NO fallback.

const WGS84 = 'EPSG:4326'

// Pull the EPSG code out of a CRS name string. Handles the common encodings:
//   "EPSG:32618"
//   "urn:ogc:def:crs:EPSG::32618"
//   "http://www.opengis.net/def/crs/EPSG/0/32618"
// The trailing digit group is captured so the "0" in ".../EPSG/0/32618" is
// not mistaken for the code. Returns an integer, or null if none is found.
export function detectEpsgCode(fc) {
  const name = fc?.crs?.properties?.name
  if (typeof name !== 'string') return null
  const match = name.match(/epsg.*?(\d+)\D*$/i)
  return match ? parseInt(match[1], 10) : null
}

// Map a detected EPSG code to a proj4 source definition string (or a built-in
// name proj4 already knows). Returns null for unsupported codes.
function proj4DefForEpsg(code) {
  // Built into proj4 — no definition needed.
  if (code === 4326) return 'EPSG:4326'
  if (code === 3857) return 'EPSG:3857'

  // WGS84 / UTM North (326zz) and South (327zz), zones 1-60.
  if (code >= 32601 && code <= 32660) {
    const zone = code - 32600
    return `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`
  }
  if (code >= 32701 && code <= 32760) {
    const zone = code - 32700
    return `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs`
  }

  return null
}

// Resolve the source projection for an EPSG code, registering it with proj4 if
// needed. Returns the proj4 source key (e.g. "EPSG:32618"). Throws on an
// unsupported code.
function resolveSourceProjection(code) {
  const sourceKey = `EPSG:${code}`
  const def = proj4DefForEpsg(code)
  if (def === null) {
    throw new Error(
      `Unsupported coordinate system: EPSG:${code}. ` +
        `This viewer supports WGS84 (4326), Web Mercator (3857), and ` +
        `WGS84/UTM zones (326xx, 327xx). Reproject the source orthomosaic ` +
        `to a WGS84/UTM zone before running the pipeline.`,
    )
  }
  // Built-in names ("EPSG:4326"/"EPSG:3857") are already known to proj4.
  if (!def.startsWith('EPSG:')) {
    proj4.defs(sourceKey, def)
  }
  return sourceKey
}

// Recursively reproject a GeoJSON coordinate array of arbitrary nesting depth.
// A position is the leaf case: an array whose first element is a number.
function reprojectCoords(coords, source) {
  if (typeof coords[0] === 'number') {
    const [lon, lat] = proj4(source, WGS84, [coords[0], coords[1]])
    return [lon, lat]
  }
  return coords.map((c) => reprojectCoords(c, source))
}

// Detect the source CRS, reproject every feature to WGS84, and return a new
// FeatureCollection (input is not mutated). Throws an Error with a user-facing
// message if the CRS is missing or unsupported — the caller should surface it
// and skip rendering the map.
export function prepareForLeaflet(fc) {
  const code = detectEpsgCode(fc)
  if (code === null) {
    throw new Error(
      'No coordinate reference system (CRS) found in the GeoJSON. ' +
        'Cannot place tiles on the map.',
    )
  }

  const source = resolveSourceProjection(code)

  return {
    ...fc,
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::4326' } },
    features: fc.features.map((feature) => ({
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: reprojectCoords(feature.geometry.coordinates, source),
      },
    })),
  }
}
