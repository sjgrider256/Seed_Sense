// Copies the latest backend GeoJSON outputs into the frontend's public/ folder
// so Vite can serve them. Runs automatically before `npm run dev`/`npm run build`.
//
// Does NOT touch the Python backend — it only reads the generated output files.
//
// - tile_seedling_counts.geojson  : REQUIRED (the primary map layer)
// - all_seedling_predictions.geojson : OPTIONAL (the seedling-point overlay)
import { existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { dirname, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))

// scripts/ -> frontend/ -> repo root
const outputDir = resolve(scriptDir, '..', '..', 'Data', 'Output')
const destDir = resolve(scriptDir, '..', 'public', 'data')

const FILES = [
  { name: 'tile_seedling_counts.geojson', required: true },
  { name: 'all_seedling_predictions.geojson', required: false },
  // Orthomosaic overlay artifacts produced by tools/prepare_ortho.py
  { name: 'ortho.png', required: false },
  { name: 'ortho_bounds.json', required: false },
]

mkdirSync(destDir, { recursive: true })

let copied = 0
for (const { name, required } of FILES) {
  const sourceFile = resolve(outputDir, name)
  const destFile = resolve(destDir, name)

  if (!existsSync(sourceFile)) {
    if (required) {
      console.error(`\x1b[31m[copy-data] ERROR:\x1b[0m required file not found:`)
      console.error(`  ${sourceFile}`)
      console.error(
        '\nRun the detection pipeline first to generate it:\n  python Run_all.py\n',
      )
      process.exit(1)
    }
    console.warn(
      `\x1b[33m[copy-data] skipped:\x1b[0m optional ${basename(name)} not found ` +
        `(seedling-point overlay will be unavailable).`,
    )
    continue
  }

  copyFileSync(sourceFile, destFile)
  console.log(`\x1b[32m[copy-data] OK:\x1b[0m copied ${name}`)
  copied++
}

console.log(`[copy-data] ${copied} file(s) copied to ${destDir}`)
