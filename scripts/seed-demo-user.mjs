/**
 * Seed demo admin user for local/staging environments.
 * Usage: DATABASE_URL=... node scripts/seed-demo-user.mjs
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { Client } = require('pg')
const { pbkdf2: pbkdf2Cb, randomBytes, createHash } = require('crypto')
const { promisify } = require('util')
const pbkdf2 = promisify(pbkdf2Cb)

const TENANT_ID = 'tenant_1dentalai_production'
const DEMO_EMAIL = 'admin@1dentalai.com'
const DEMO_PASSWORD = 'Demo1234!'
const DEMO_NAME = 'Demo Admin'
const ROLE = 'super_admin'
const ITERATIONS = 310_000

function newId(prefix) {
  return `${prefix}_${randomBytes(12).toString('hex')}`
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url')
  const derived = await pbkdf2(password, salt, ITERATIONS, 32, 'sha256')
  return { hash: derived.toString('base64url'), salt, iterations: ITERATIONS }
}

const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

// Ensure Tenant exists
await client.query(
  `INSERT INTO "Tenant" (id, name, slug, mode, "createdAt", "updatedAt")
   VALUES ($1, $2, $3, 'ACTIVE', now(), now())
   ON CONFLICT (id) DO NOTHING`,
  [TENANT_ID, '1DentalAI Demo', '1dentalai-demo']
)
console.log('✓ Tenant ready')

// Create demo user
const pw = await hashPassword(DEMO_PASSWORD)
const userId = newId('user')
await client.query(
  `INSERT INTO "AuthUser" (id, "tenantId", email, "emailHash", "displayName", "roleKey", status,
     "passwordHash", "passwordSalt", "passwordIterations", "mfaRequired", "mustChangePassword",
     "failedLoginCount", "createdAt", "updatedAt")
   VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE',$7,$8,$9,false,false,0,now(),now())
   ON CONFLICT ("tenantId", "emailHash") DO UPDATE SET
     "passwordHash"=$7, "passwordSalt"=$8, "passwordIterations"=$9,
     "roleKey"=$6, status='ACTIVE', "updatedAt"=now()`,
  [userId, TENANT_ID, DEMO_EMAIL, sha256(DEMO_EMAIL), DEMO_NAME, ROLE,
   pw.hash, pw.salt, pw.iterations]
)
console.log(`✓ Demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)

await client.end()
console.log('\n✅ Done — log in at app.1dentalai.com/app')
