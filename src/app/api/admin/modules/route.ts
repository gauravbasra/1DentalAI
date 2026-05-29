import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/prisma'
import { currentSession } from '@/lib/auth'

async function requireAdmin(req: NextRequest) {
  const session = await currentSession()
  if (!session || session.roleKey !== 'super_admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error
  const modules = await db.productModule.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json(modules)
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error
  const body = await req.json()
  const mod = await db.productModule.create({
    data: {
      slug: body.slug,
      name: body.name,
      description: body.description,
      priceMonthly: Number(body.priceMonthly),
      active: body.active ?? true,
      sortOrder: body.sortOrder ?? 0,
    },
  })
  return NextResponse.json(mod, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error
  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (data.priceMonthly) data.priceMonthly = Number(data.priceMonthly)
  const mod = await db.productModule.update({ where: { id }, data })
  return NextResponse.json(mod)
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error
  const { id } = await req.json()
  await db.productModule.update({ where: { id }, data: { active: false } })
  return NextResponse.json({ ok: true })
}
