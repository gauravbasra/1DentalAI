/**
 * Post-build: prepare standalone output for deployment.
 * 1. Copy .next/static → .next/standalone/.next/static (JS/CSS chunks)
 * 2. Copy public → .next/standalone/public (static assets)
 * 3. Copy pg and deps into .next/standalone/node_modules/
 * 4. Symlink Turbopack pg-[hash] → pg
 */
import { cpSync, existsSync, mkdirSync, readdirSync, symlinkSync, unlinkSync } from 'fs'
import { join } from 'path'

// 1. Copy static chunks so /_next/static/ requests resolve
const staticSrc = '.next/static'
const staticDst = '.next/standalone/.next/static'
if (existsSync(staticSrc)) {
  cpSync(staticSrc, staticDst, { recursive: true })
  console.log('✓ Copied .next/static → standalone')
}

// 2. Copy public directory
const publicSrc = 'public'
const publicDst = '.next/standalone/public'
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDst, { recursive: true })
  console.log('✓ Copied public → standalone')
}

const standaloneModules = '.next/standalone/node_modules'
const pkgs = ['pg', 'pg-types', 'pg-protocol', 'pgpass', 'pg-connection-string', 'split2', 'generic-pool']

mkdirSync(standaloneModules, { recursive: true })

for (const pkg of pkgs) {
  const src = join('node_modules', pkg)
  const dst = join(standaloneModules, pkg)
  if (existsSync(src) && !existsSync(dst)) {
    cpSync(src, dst, { recursive: true })
    console.log(`✓ Copied ${pkg} to standalone`)
  }
}

// Handle Turbopack hashed names: search ALL chunk files recursively
// for pg-[hash] references and create symlinks
import { readFileSync } from 'fs'

function walkDir(dir, callback) {
  if (!existsSync(dir)) return
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walkDir(full, callback)
      else if (entry.isFile() && entry.name.endsWith('.js')) callback(full)
    }
  } catch {}
}

const seen = new Set()
walkDir('.next/standalone/.next', (filePath) => {
  try {
    const content = readFileSync(filePath, 'utf8')
    const matches = content.match(/pg-[0-9a-f]{12,20}/g) || []
    for (const name of matches) {
      if (seen.has(name)) continue
      seen.add(name)
      const dst = join(standaloneModules, name)
      const src = join(standaloneModules, 'pg')
      // Remove any existing (possibly broken) symlink before recreating
      if (existsSync(dst)) { try { unlinkSync(dst) } catch {} }
      if (existsSync(src)) {
        try {
          // Symlink target must be relative to the symlink's OWN parent dir
          // so just 'pg', not the full path
          symlinkSync('pg', dst)
          console.log(`✓ Symlinked ${name} → pg`)
        } catch (e) { console.warn(`symlink ${name}:`, e.message) }
      }
    }
  } catch {}
})

console.log('✅ pg copied to standalone')
