import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.1dentalai.com'
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://1dentalai.com'
