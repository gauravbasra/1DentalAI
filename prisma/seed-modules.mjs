/**
 * Seed default product modules using raw pg (no Prisma client required).
 * Run: node prisma/seed-modules.mjs
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { Client } = require('pg')

const MODULES = [
  { slug: 'scheduler',       name: 'Smart Scheduler',       description: 'Drag-and-drop schedule, waitlist, bulk confirm, check-in, and no-show tracking.',  priceMonthly: 9900,  sortOrder: 1 },
  { slug: 'patients',        name: 'Patient Management',    description: 'Complete patient records, medical alerts, family accounts, portal invites, and merge.',   priceMonthly: 4900,  sortOrder: 2 },
  { slug: 'insurance-rcm',   name: 'Insurance & RCM',       description: 'EDI eligibility, claim submission, ERA posting, denial management, and appeals.',         priceMonthly: 14900, sortOrder: 3 },
  { slug: 'clinical-ai',     name: 'Clinical AI',           description: 'AI encounter scribe, perio charting with staging, and AI CDT code suggestions.',          priceMonthly: 9900,  sortOrder: 4 },
  { slug: 'treatment-plans', name: 'Treatment Plans',       description: 'Multi-phase plans, insurance estimates, patient acceptance, and one-click checkout.',      priceMonthly: 4900,  sortOrder: 5 },
  { slug: 'billing-ledger',  name: 'Billing & Ledger',      description: 'Procedure-level posting, adjustments, payment collection, and aging reports.',            priceMonthly: 7900,  sortOrder: 6 },
  { slug: 'communications',  name: 'Communications',        description: 'Automated reminders, patient portal, two-way SMS, and review campaigns.',                 priceMonthly: 4900,  sortOrder: 7 },
  { slug: 'analytics',       name: 'Practice Intelligence', description: 'Production/collection reports, AI revenue opportunities, and payer analytics.',           priceMonthly: 4900,  sortOrder: 8 },
  { slug: 'pms-migration',   name: 'PMS Data Migration',    description: 'One-time migration from Dentrix, Eaglesoft, Open Dental, or Curve — all records.',        priceMonthly: 49900, sortOrder: 9 },
]

const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

for (const mod of MODULES) {
  const id = `mod_${mod.slug.replace(/-/g, '_')}`
  await client.query(
    `INSERT INTO "ProductModule" (id, slug, name, description, "priceMonthly", active, "sortOrder", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,true,$6,now(),now())
     ON CONFLICT (slug) DO UPDATE
       SET name=$3, description=$4, "priceMonthly"=$5, "sortOrder"=$6, "updatedAt"=now()`,
    [id, mod.slug, mod.name, mod.description, mod.priceMonthly, mod.sortOrder]
  )
  console.log('✓', mod.name, `$${mod.priceMonthly / 100}/mo`)
}

await client.end()
console.log('\n✅ Modules seeded')
