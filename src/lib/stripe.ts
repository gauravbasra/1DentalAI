import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
    _stripe = new Stripe(key, { apiVersion: '2026-05-27.dahlia' })
  }
  return _stripe
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.1dentalai.com'
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://1dentalai.com'
