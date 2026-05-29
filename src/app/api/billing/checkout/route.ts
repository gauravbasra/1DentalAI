import { NextRequest, NextResponse } from 'next/server'
import { getStripe, APP_URL, SITE_URL } from '@/lib/stripe'
import { db } from '@/lib/prisma'
import { currentSession } from '@/lib/auth'
import type { ProductModule } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await currentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { moduleIds } = await req.json() as { moduleIds: string[] }
  if (!moduleIds?.length) return NextResponse.json({ error: 'No modules selected' }, { status: 400 })

  const isTest = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')

  const modules = await db.productModule.findMany({
    where: { id: { in: moduleIds }, active: true },
  })

  if (!modules.length) return NextResponse.json({ error: 'No valid modules' }, { status: 400 })

  // Ensure each module has a Stripe Price — create on-the-fly if missing
  const lineItems = await Promise.all(modules.map(async (mod: ProductModule) => {
    let priceId = isTest ? mod.stripePriceIdTest : mod.stripePriceId

    if (!priceId) {
      // Create Stripe product + price on demand
      const product = await getStripe().products.create({
        name: mod.name,
        metadata: { moduleId: mod.id, moduleSlug: mod.slug },
      })
      const price = await getStripe().prices.create({
        product: product.id,
        unit_amount: mod.priceMonthly,
        currency: 'usd',
        recurring: { interval: 'month' },
      })
      priceId = price.id
      // Save it back to DB
      await db.productModule.update({
        where: { id: mod.id },
        data: isTest ? { stripePriceIdTest: priceId } : { stripePriceId: priceId },
      })
    }

    return { price: priceId, quantity: 1 }
  }))

  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: lineItems,
    success_url: `${APP_URL}/onboarding/connect-pms?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/onboarding`,
    client_reference_id: session.tenantId,
    metadata: { tenantId: session.tenantId, moduleIds: moduleIds.join(',') },
    subscription_data: {
      metadata: { tenantId: session.tenantId, moduleIds: moduleIds.join(',') },
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
