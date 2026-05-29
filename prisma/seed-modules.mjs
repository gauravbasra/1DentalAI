/**
 * Seed default product modules.
 * Run: node prisma/seed-modules.mjs
 */
import pkg from '@prisma/client'
const { PrismaClient } = pkg
const db = new PrismaClient()

const MODULES = [
  { slug: 'scheduler',      name: 'Smart Scheduler',        description: 'Drag-and-drop schedule, waitlist, bulk confirm, check-in, and no-show tracking.',  priceMonthly: 9900,  sortOrder: 1 },
  { slug: 'patients',       name: 'Patient Management',     description: 'Complete patient records, medical alerts, family accounts, portal invites, and merge.',   priceMonthly: 4900,  sortOrder: 2 },
  { slug: 'insurance-rcm',  name: 'Insurance & RCM',        description: 'EDI eligibility, claim submission, ERA posting, denial management, and appeals.',         priceMonthly: 14900, sortOrder: 3 },
  { slug: 'clinical-ai',    name: 'Clinical AI',            description: 'AI encounter scribe, perio charting with staging, and AI CDT code suggestions.',          priceMonthly: 9900,  sortOrder: 4 },
  { slug: 'treatment-plans',name: 'Treatment Plans',        description: 'Multi-phase plans, insurance estimates, patient acceptance, and one-click checkout.',      priceMonthly: 4900,  sortOrder: 5 },
  { slug: 'billing-ledger', name: 'Billing & Ledger',       description: 'Procedure-level posting, adjustments, payment collection, and aging reports.',            priceMonthly: 7900,  sortOrder: 6 },
  { slug: 'communications', name: 'Communications',         description: 'Automated reminders, patient portal, two-way SMS, and review campaigns.',                 priceMonthly: 4900,  sortOrder: 7 },
  { slug: 'analytics',      name: 'Practice Intelligence',  description: 'Production/collection reports, AI revenue opportunities, and payer analytics.',           priceMonthly: 4900,  sortOrder: 8 },
  { slug: 'pms-migration',  name: 'PMS Data Migration',     description: 'One-time migration from Dentrix, Eaglesoft, Open Dental, or Curve — all records.',        priceMonthly: 49900, sortOrder: 9 },
]

async function main() {
  for (const mod of MODULES) {
    await db.productModule.upsert({
      where: { slug: mod.slug },
      create: mod,
      update: { name: mod.name, description: mod.description, priceMonthly: mod.priceMonthly },
    })
    console.log('✓', mod.name, `$${mod.priceMonthly / 100}/mo`)
  }
  console.log('\n✅ Modules seeded')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
