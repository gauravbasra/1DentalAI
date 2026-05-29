import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/prisma'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const tenantId = session.metadata?.tenantId
    const moduleIds = session.metadata?.moduleIds?.split(',') ?? []

    if (tenantId && moduleIds.length) {
      await Promise.all(moduleIds.map(moduleId =>
        db.tenantSubscription.upsert({
          where: { tenantId_moduleId: { tenantId, moduleId } },
          create: {
            tenantId,
            moduleId,
            stripeSubscriptionId: session.subscription as string,
            stripeCustomerId: session.customer as string,
            status: 'active',
          },
          update: {
            stripeSubscriptionId: session.subscription as string,
            stripeCustomerId: session.customer as string,
            status: 'active',
          },
        })
      ))
      // Activate tenant
      await db.tenant.update({ where: { id: tenantId }, data: { mode: 'ACTIVE' } })
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const tenantId = sub.metadata?.tenantId
    if (tenantId) {
      await db.tenantSubscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          status: sub.status,
          currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
        },
      })
    }
  }

  return NextResponse.json({ received: true })
}
