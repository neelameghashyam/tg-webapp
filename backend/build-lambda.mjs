/**
 * Build Lambda deployment packages using esbuild.
 *
 * Produces single-file bundles (tree-shaken, minified) instead of src/ + node_modules/.
 * Result: ~100-500KB per zip vs 10-50MB.
 *
 * Output:
 *   deployment/artifacts/backend.zip   — Hono BFF Lambda
 *   deployment/artifacts/cron.zip      — All cron handlers bundled together
 *
 * Usage:
 *   node build-lambda.mjs                 # build + zip
 *   node build-lambda.mjs --bundle-only   # build only, no zip
 *   node build-lambda.mjs --backend       # backend only
 *   node build-lambda.mjs --cron          # cron only
 */

import { build } from 'esbuild'
import { execSync } from 'child_process'
import { mkdirSync, rmSync, existsSync, writeFileSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const ARTIFACTS = resolve(PROJECT_ROOT, 'deployment/artifacts')

const bundleOnly = process.argv.includes('--bundle-only')
const backendOnly = process.argv.includes('--backend')
const cronOnly = process.argv.includes('--cron')
const buildAll = !backendOnly && !cronOnly

// Shared esbuild config
const shared = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: false,
  minify: true,
  treeShaking: true,
  banner: {
    js: `import{createRequire}from'module';const require=createRequire(import.meta.url);`,
  },
}

function zipDir(dir, zipPath) {
  if (existsSync(zipPath)) rmSync(zipPath)
  execSync(`cd "${dir}" && zip -r "${zipPath}" . -x '*.map'`, { stdio: 'inherit' })
  const sizeMB = (statSync(zipPath).size / 1024 / 1024).toFixed(2)
  console.log(`  → ${zipPath} (${sizeMB} MB)`)
}

// ===========================================================================
// Backend (Hono BFF)
// ===========================================================================

async function buildBackend() {
  const outDir = resolve(ARTIFACTS, 'backend')
  if (existsSync(outDir)) rmSync(outDir, { recursive: true })
  mkdirSync(outDir, { recursive: true })

  console.log('[backend] Bundling...')

  await build({
    ...shared,
    entryPoints: [resolve(__dirname, 'src/index.js')],
    outfile: resolve(outDir, 'index.mjs'),
    // mysql2 uses native bindings — keep external if needed
    // (in practice, mysql2/promise works fine bundled)
    external: [],
  })

  writeFileSync(resolve(outDir, 'package.json'), JSON.stringify({ type: 'module' }, null, 2))

  if (!bundleOnly) {
    zipDir(outDir, resolve(ARTIFACTS, 'backend.zip'))
    rmSync(outDir, { recursive: true })
  }

  console.log('[backend] Done.')
}

// ===========================================================================
// Cron (multiple handlers, one bundle)
// ===========================================================================

async function buildCron() {
  const outDir = resolve(ARTIFACTS, 'cron')
  if (existsSync(outDir)) rmSync(outDir, { recursive: true })
  mkdirSync(outDir, { recursive: true })

  console.log('[cron] Bundling...')

  // Each handler is a separate entry point → separate output file
  // Lambda invokes each by handler name (e.g. tg-status-updater.handler)
  await build({
    ...shared,
    entryPoints: [
      resolve(PROJECT_ROOT, 'cron/src/handlers/tg-status-updater.js'),
      resolve(PROJECT_ROOT, 'cron/src/handlers/ie-status-updater.js'),
      resolve(PROJECT_ROOT, 'cron/src/handlers/deadline-reminder.js'),
    ],
    outdir: outDir,
    // @aws-sdk is available in Lambda runtime — no need to bundle it
    external: ['@aws-sdk/*'],
    // Resolve cron dependencies from its own node_modules
    nodePaths: [resolve(PROJECT_ROOT, 'cron/node_modules'), resolve(__dirname, 'node_modules')],
  })

  writeFileSync(resolve(outDir, 'package.json'), JSON.stringify({ type: 'module' }, null, 2))

  if (!bundleOnly) {
    zipDir(outDir, resolve(ARTIFACTS, 'cron.zip'))
    rmSync(outDir, { recursive: true })
  }

  console.log('[cron] Done.')
}

// ===========================================================================
// Main
// ===========================================================================

mkdirSync(ARTIFACTS, { recursive: true })

if (buildAll || backendOnly) await buildBackend()
if (buildAll || cronOnly) await buildCron()

console.log('\nBuild complete.')
if (!bundleOnly) {
  console.log('Artifacts:')
  execSync(`ls -la "${ARTIFACTS}"/*.zip`, { stdio: 'inherit' })
}
