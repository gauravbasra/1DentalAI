/**
 * Post-build: copy pg and its deps into .next/standalone/node_modules/
 * so they are available when the standalone server runs.
 * Also handles Turbopack's hashed external module names by scanning
 * the runtime for any pg-* reference and creating symlinks.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, symlinkSync } from 'fs'
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

// Handle Turbopack hashed names: find any pg-[hash] directory referenced in chunks
// and create a symlink pointing to pg
const chunksDir = '.next/standalone/.next/server/chunks'
if (existsSync(chunksDir)) {
  try {
    const runtime = readdirSync(chunksDir).filter(f => f.includes('turbopack') && f.endsWith('.js'))
    for (const file of runtime) {
      const { readFileSync } = await import('fs')
      const content = readFileSync(join(chunksDir, file), 'utf8')
      const matches = content.match(/["']pg-[0-9a-f]{16}["']/g) || []
      for (const match of matches) {
        const name = match.replace(/['"]/g, '')
        const dst = join(standaloneModules, name)
        const src = join(standaloneModules, 'pg')
        if (!existsSync(dst) && existsSync(src)) {
          symlinkSync(src, dst)
          console.log(`✓ Symlinked ${name} → pg`)
        }
      }
    }
  } catch (e) {
    console.warn('Could not create Turbopack hash symlinks:', e.message)
  }
}

console.log('✅ pg copied to standalone')
