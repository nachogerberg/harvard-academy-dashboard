export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'

const META_TOKEN = process.env.META_ACCESS_TOKEN!
const META_ACCOUNT = process.env.META_AD_ACCOUNT_ID!
const META_BASE = 'https://graph.facebook.com/v21.0'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function extractLeads(actions: { action_type: string; value: string }[] = []) {
  return parseInt(actions.find((a) => a.action_type === 'lead')?.value ?? '0')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')
  const startDate = searchParams.get('start') || daysAgo(days)
  const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0]

  try {
    const url = new URL(`${META_BASE}/act_${META_ACCOUNT}/insights`)
    url.searchParams.set('fields', 'spend,impressions,clicks,actions,date_start,date_stop')
    url.searchParams.set('level', 'account')
    url.searchParams.set('time_increment', '1') // daily breakdown
    url.searchParams.set('time_range', JSON.stringify({ since: startDate, until: endDate }))
    url.searchParams.set('limit', '200')
    url.searchParams.set('access_token', META_TOKEN)

    const res = await fetch(url.toString())
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Meta API error: ${res.status} ${err}`)
    }
    const data = await res.json()
    const rows = data.data || []

    const timeline = rows
      .map((row: any) => {
        const leads = extractLeads(row.actions || [])
        const spend = parseFloat(row.spend || '0')
        const cpl = leads > 0 ? parseFloat((spend / leads).toFixed(2)) : 0
        return {
          date: row.date_start,
          leads,
          spend: parseFloat(spend.toFixed(2)),
          clicks: parseInt(row.clicks || '0'),
          impressions: parseInt(row.impressions || '0'),
          cpl,
        }
      })
      .sort((a: any, b: any) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      dateRange: { start: startDate, end: endDate },
      timeline,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
