/**
 * Post-build: copy pg and its deps into .next/standalone/node_modules/
 * so they are available when the standalone server runs.
 * Also handles Turbopack's hashed external module names by scanning
 * the runtime for any pg-* reference and creating symlinks.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, symlinkSync, unlinkSync } from 'fs'
import { join } from 'path'

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
