'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Module = { id: string; slug: string; name: string; description: string; priceMonthly: number }

export default function OnboardingPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/billing/modules')
      .then(r => r.json())
      .then(data => { setModules(data); setLoading(false) })
      .catch(() => { setError('Failed to load modules'); setLoading(false) })
  }, [])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  async function handleCheckout() {
    if (!selected.size) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleIds: [...selected] }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Checkout failed')
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const totalCents = modules.filter(m => selected.has(m.id)).reduce((s, m) => s + m.priceMonthly, 0)

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-2 text-sm font-semibold text-cyan-700">Step 2 of 3</div>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-950">
          Choose your modules
        </h1>
        <p className="mt-3 text-neutral-600">
          Select the modules you want to activate. You can add more after launch.
          All prices are per location per month.
        </p>

        {/* Module grid */}
        {loading ? (
          <div className="mt-12 text-center text-neutral-500">Loading modules…</div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {modules.map(mod => {
              const isSelected = selected.has(mod.id)
              return (
                <button
                  key={mod.id}
                  onClick={() => toggle(mod.id)}
                  className={`rounded-xl border-2 p-5 text-left transition-all ${
                    isSelected
                      ? 'border-cyan-600 bg-cyan-50 shadow-sm'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-900">{mod.name}</p>
                      <p className="mt-1 text-sm leading-5 text-neutral-500">{mod.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-semibold text-neutral-900">
                        ${(mod.priceMonthly / 100).toFixed(0)}
                      </p>
                      <p className="text-xs text-neutral-400">/mo</p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-cyan-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                      ✓ Selected
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-5">
          <div>
            <p className="text-sm text-neutral-500">{selected.size} module{selected.size !== 1 ? 's' : ''} selected</p>
            <p className="mt-0.5 text-2xl font-semibold text-neutral-900">
              ${(totalCents / 100).toFixed(0)}<span className="text-base font-normal text-neutral-400">/mo</span>
            </p>
          </div>
          <button
            onClick={handleCheckout}
            disabled={!selected.size || submitting}
            className="rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-40"
          >
            {submitting ? 'Redirecting…' : 'Continue to payment →'}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-neutral-400">
          Powered by Stripe. Cancel anytime. Prices in USD.{' '}
          <Link href="/" className="underline">Back to home</Link>
        </p>
      </div>
    </main>
  )
}
