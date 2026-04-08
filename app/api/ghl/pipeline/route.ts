import { NextRequest, NextResponse } from 'next/server'
import { getPipelineSummary } from '@/lib/ghl'

export async function GET(req: NextRequest) {
  const startDate = req.nextUrl.searchParams.get('startDate') ?? undefined
  const endDate = req.nextUrl.searchParams.get('endDate') ?? undefined

  try {
    const data = await getPipelineSummary(
      startDate || endDate ? { startDate, endDate } : undefined
    )
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
