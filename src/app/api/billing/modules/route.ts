import { NextResponse } from 'next/server'
import { db } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const modules = await db.productModule.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, slug: true, name: true, description: true, priceMonthly: true },
  })
  return NextResponse.json(modules)
}
