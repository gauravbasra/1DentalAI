'use client'

import { useEffect, useState } from 'react'

type Module = {
  id: string; slug: string; name: string; description: string
  priceMonthly: number; stripePriceId: string | null; active: boolean; sortOrder: number
}

const emptyForm = { slug: '', name: '', description: '', priceMonthly: '', sortOrder: '0' }

export default function AdminModulesPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [editing, setEditing] = useState<Module | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    const res = await fetch('/api/admin/modules')
    if (res.ok) setModules(await res.json())
  }

  useEffect(() => {
    fetch('/api/admin/modules')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: Module[]) => setModules(data))
      .catch(() => {})
  }, [])

  function startEdit(mod: Module) {
    setEditing(mod); setFormOpen(true)
    setForm({
      slug: mod.slug, name: mod.name, description: mod.description,
      priceMonthly: String(mod.priceMonthly / 100),
      sortOrder: String(mod.sortOrder),
    })
    setMsg('')
  }

  function startNew() {
    setEditing(null); setFormOpen(true)
    setForm(emptyForm)
    setMsg('')
  }

  async function save() {
    setSaving(true); setMsg('')
    const payload = {
      ...(editing ? { id: editing.id } : {}),
      slug: form.slug,
      name: form.name,
      description: form.description,
      priceMonthly: Math.round(parseFloat(form.priceMonthly) * 100),
      sortOrder: parseInt(form.sortOrder),
    }
    const res = await fetch('/api/admin/modules', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) { setMsg('Saved!'); setEditing(null); setFormOpen(false); setForm(emptyForm); void load() }
    else { setMsg('Error saving') }
  }

  async function deactivate(id: string) {
    if (!confirm('Deactivate this module?')) return
    await fetch('/api/admin/modules', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">Module Pricing</h1>
          <button onClick={startNew} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
            + New Module
          </button>
        </div>

        {/* Form */}
        {formOpen && (
          <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">{editing ? `Edit: ${editing.name}` : 'New Module'}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Slug', key: 'slug', placeholder: 'e.g. scheduler' },
                { label: 'Name', key: 'name', placeholder: 'e.g. Smart Scheduler' },
                { label: 'Price (USD/mo)', key: 'priceMonthly', placeholder: '99' },
                { label: 'Sort Order', key: 'sortOrder', placeholder: '0' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">{label}</label>
                  <input
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    value={form[key as keyof typeof form]}
                    placeholder={placeholder}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600">Description</label>
                <textarea
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={save} disabled={saving} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditing(null); setFormOpen(false); setForm(emptyForm) }} className="text-sm text-neutral-500 hover:text-neutral-800">
                Cancel
              </button>
              {msg && <span className={`text-sm ${msg === 'Saved!' ? 'text-green-600' : 'text-red-600'}`}>{msg}</span>}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                {['Name', 'Slug', 'Price/mo', 'Stripe Price ID', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {modules.map(mod => (
                <tr key={mod.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-900">{mod.name}</td>
                  <td className="px-4 py-3 font-mono text-neutral-500">{mod.slug}</td>
                  <td className="px-4 py-3 font-semibold text-neutral-900">${(mod.priceMonthly / 100).toFixed(0)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-400">{mod.stripePriceId ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${mod.active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-400'}`}>
                      {mod.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(mod)} className="text-xs font-medium text-cyan-700 hover:underline">Edit</button>
                      {mod.active && (
                        <button onClick={() => deactivate(mod.id)} className="text-xs font-medium text-red-500 hover:underline">Deactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!modules.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">No modules yet. Create one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
