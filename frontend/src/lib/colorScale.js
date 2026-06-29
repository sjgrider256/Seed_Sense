// Sequential white -> dark blue ramp keyed on per-tile seedling count.
// Endpoints chosen to match a standard "Blues" feel:
//   0        -> white   (#ffffff)
//   maxCount -> dark blue (#08306b)
const LOW = [255, 255, 255] // white
const HIGH = [8, 48, 107] // dark blue

export const COUNT_PROP = 'seedling count'
export const NAME_PROP = 'tile name'

function lerpChannel(a, b, t) {
  return Math.round(a + (b - a) * t)
}

function toHex(rgb) {
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('')
}

// Largest seedling count across all features (>= 0). Used to normalize the ramp.
export function getMaxCount(features) {
  return features.reduce((max, f) => {
    const c = f.properties?.[COUNT_PROP] ?? 0
    return c > max ? c : max
  }, 0)
}

// Build a count -> hex color function for a given maximum count.
export function makeColorScale(maxCount) {
  return (count) => {
    const safeCount = typeof count === 'number' ? count : 0
    const t = maxCount > 0 ? Math.min(safeCount / maxCount, 1) : 0
    const rgb = [
      lerpChannel(LOW[0], HIGH[0], t),
      lerpChannel(LOW[1], HIGH[1], t),
      lerpChannel(LOW[2], HIGH[2], t),
    ]
    return toHex(rgb)
  }
}

// Evenly spaced sample values from 0..maxCount for rendering a legend.
export function legendStops(maxCount, steps = 5) {
  if (maxCount <= 0) return [0]
  const stops = []
  for (let i = 0; i < steps; i++) {
    stops.push(Math.round((maxCount * i) / (steps - 1)))
  }
  // De-duplicate in case rounding collapses small ranges.
  return [...new Set(stops)]
}
