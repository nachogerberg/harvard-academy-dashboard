import { NextRequest, NextResponse } from 'next/server'
import { getCampaignInsights, getAdsetInsights, getAccountSummary, DatePreset } from '@/lib/meta'

export async function GET(req: NextRequest) {
  const preset = (req.nextUrl.searchParams.get('preset') ?? 'last_30d') as DatePreset
  const level = req.nextUrl.searchParams.get('level') ?? 'campaign'

  try {
    if (level === 'account') {
      const data = await getAccountSummary(preset)
      return NextResponse.json(data)
    }
    if (level === 'adset') {
      const data = await getAdsetInsights(preset)
      return NextResponse.json(data)
    }
    const data = await getCampaignInsights(preset)
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
