import { NextRequest, NextResponse } from 'next/server'
import { getAdLevelInsights, getAllAds, type AttributionCampaign } from '@/lib/meta'
import { getAttributionMap } from '@/lib/ghl'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const preset = sp.get('preset') ?? 'last_30d'

  // Determine date range
  let startDate = sp.get('startDate') ?? ''
  let endDate = sp.get('endDate') ?? ''

  if (!startDate || !endDate) {
    // Fall back from preset
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const presetDays: Record<string, number> = {
      today: 0, last_7d: 7, last_14d: 14, last_30d: 30,
    }
    const days = presetDays[preset] ?? 30
    const s = new Date(now)
    s.setDate(s.getDate() - days)
    startDate = s.toISOString().slice(0, 10)
    endDate = todayStr
  }

  try {
    const [campaigns, adStatuses, ghlMap] = await Promise.all([
      getAdLevelInsights(startDate, endDate),
      getAllAds(),
      getAttributionMap({
        startDate: `${startDate}T00:00:00.000Z`,
        endDate: `${endDate}T23:59:59.000Z`,
      }),
    ])

    // Build ad status lookup
    const statusMap = new Map<string, string>()
    for (const ad of adStatuses) {
      statusMap.set(ad.id, ad.status)
    }

    // Merge GHL data into the tree
    let bestCps: number | null = null
    let bestAdId: string | null = null

    const merged: AttributionCampaign[] = campaigns.map((campaign) => {
      const cGhl = ghlMap.byCampaignId[campaign.campaign_id]
      const campaignGhlLeads = cGhl?.leads ?? 0
      const campaignGhlClosed = cGhl?.closed ?? 0
      const campaignGhlHighIntent = cGhl?.highIntent ?? 0

      const adsets = campaign.adsets.map((adset) => {
        let adsetGhlLeads = 0
        let adsetGhlClosed = 0
        let adsetGhlHighIntent = 0

        const ads = adset.ads.map((ad) => {
          const aGhl = ghlMap.byAdId[ad.ad_id]
          const ghlLeads = aGhl?.leads ?? 0
          const ghlClosed = aGhl?.closed ?? 0
          const ghlHighIntent = aGhl?.highIntent ?? 0

          adsetGhlLeads += ghlLeads
          adsetGhlClosed += ghlClosed
          adsetGhlHighIntent += ghlHighIntent

          const costPerClosed = ghlClosed > 0 ? ad.spend / ghlClosed : null
          if (costPerClosed !== null && (bestCps === null || costPerClosed < bestCps)) {
            bestCps = costPerClosed
            bestAdId = ad.ad_id
          }

          return {
            ...ad,
            status: statusMap.get(ad.ad_id),
            ghl_leads: ghlLeads,
            ghl_closed: ghlClosed,
            ghl_high_intent: ghlHighIntent,
            cost_per_closed: costPerClosed,
          }
        })

        return {
          ...adset,
          ads,
          ghl_leads: adsetGhlLeads,
          ghl_closed: adsetGhlClosed,
          ghl_high_intent: adsetGhlHighIntent,
          cost_per_closed: adsetGhlClosed > 0 ? adset.spend / adsetGhlClosed : null,
        }
      })

      return {
        ...campaign,
        adsets,
        ghl_leads: campaignGhlLeads,
        ghl_closed: campaignGhlClosed,
        ghl_high_intent: campaignGhlHighIntent,
        cost_per_closed: campaignGhlClosed > 0 ? campaign.spend / campaignGhlClosed : null,
      }
    })

    // Compute totals
    const totals = {
      spend: merged.reduce((s, c) => s + c.spend, 0),
      impressions: merged.reduce((s, c) => s + c.impressions, 0),
      clicks: merged.reduce((s, c) => s + c.clicks, 0),
      meta_leads: merged.reduce((s, c) => s + c.leads, 0),
      ghl_leads: merged.reduce((s, c) => s + (c.ghl_leads ?? 0), 0),
      ghl_closed: merged.reduce((s, c) => s + (c.ghl_closed ?? 0), 0),
      ghl_high_intent: merged.reduce((s, c) => s + (c.ghl_high_intent ?? 0), 0),
    }

    return NextResponse.json({ campaigns: merged, totals, bestAdId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
