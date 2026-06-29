import { legendStops } from '../lib/colorScale.js'

// Static, simple legend showing the white -> dark blue ramp by count.
export default function Legend({ maxCount, colorScale }) {
  const stops = legendStops(maxCount)

  return (
    <div className="legend">
      <div className="legend-title">Seedlings per tile</div>
      {stops.map((count) => (
        <div className="legend-row" key={count}>
          <span
            className="legend-swatch"
            style={{ backgroundColor: colorScale(count) }}
          />
          <span className="legend-label">{count}</span>
        </div>
      ))}
    </div>
  )
}
