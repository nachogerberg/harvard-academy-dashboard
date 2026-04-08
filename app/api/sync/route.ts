import { NextResponse } from 'next/server'
import { getAccountSummary, getCampaignInsights, getAdLevelInsights, getAllAds } from '@/lib/meta'
import { getPipelineSummary, getAttributionMap } from '@/lib/ghl'
import { setCacheEntry } from '@/lib/supabase'

export async function POST() {
  try {
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - 30)
    const startStr = start.toISOString().slice(0, 10)
    const endStr = now.toISOString().slice(0, 10)
    const range = {
      startDate: start.toISOString(),
      endDate: new Date(endStr + 'T23:59:59.000Z').toISOString(),
    }

    const [metaSummary, campaigns, pipeline, attrCampaigns, adStatuses, ghlAttr] = await Promise.all([
      getAccountSummary('last_30d'),
      getCampaignInsights('last_30d'),
      getPipelineSummary(range),
      getAdLevelInsights(startStr, endStr),
      getAllAds(),
      getAttributionMap(range),
    ])

    // Build attribution
    const statusMap = new Map(adStatuses.map((a) => [a.id, a.status]))
    let bestCps: number | null = null
    let bestAdId: string | null = null

    const merged = attrCampaigns.map((campaign) => {
      const cGhl = ghlAttr.byCampaignId[campaign.campaign_id]
      const adsets = campaign.adsets.map((adset) => {
        let adsetGhlLeads = 0, adsetGhlClosed = 0, adsetGhlHighIntent = 0
        const ads = adset.ads.map((ad) => {
          const aGhl = ghlAttr.byAdId[ad.ad_id]
          const ghlLeads = aGhl?.leads ?? 0
          const ghlClosed = aGhl?.closed ?? 0
          const ghlHighIntent = aGhl?.highIntent ?? 0
          adsetGhlLeads += ghlLeads; adsetGhlClosed += ghlClosed; adsetGhlHighIntent += ghlHighIntent
          const costPerClosed = ghlClosed > 0 ? ad.spend / ghlClosed : null
          if (costPerClosed !== null && (bestCps === null || costPerClosed < bestCps)) {
            bestCps = costPerClosed; bestAdId = ad.ad_id
          }
          return { ...ad, status: statusMap.get(ad.ad_id), ghl_leads: ghlLeads, ghl_closed: ghlClosed, ghl_high_intent: ghlHighIntent, cost_per_closed: costPerClosed }
        })
        return { ...adset, ads, ghl_leads: adsetGhlLeads, ghl_closed: adsetGhlClosed, ghl_high_intent: adsetGhlHighIntent, cost_per_closed: adsetGhlClosed > 0 ? adset.spend / adsetGhlClosed : null }
      })
      return { ...campaign, adsets, ghl_leads: cGhl?.leads ?? 0, ghl_closed: cGhl?.closed ?? 0, ghl_high_intent: cGhl?.highIntent ?? 0, cost_per_closed: (cGhl?.closed ?? 0) > 0 ? campaign.spend / cGhl!.closed : null }
    })

    const attribution = { campaigns: merged, bestAdId }

    // Store in Supabase cache
    await Promise.all([
      setCacheEntry('ha:meta:summary', { ...metaSummary, campaigns }, 24),
      setCacheEntry('ha:meta:campaigns', campaigns, 24),
      setCacheEntry('ha:ghl:pipeline', pipeline, 24),
      setCacheEntry('ha:meta:attribution', attribution, 24),
    ])

    return NextResponse.json({
      success: true,
      cached: ['ha:meta:summary', 'ha:meta:campaigns', 'ha:ghl:pipeline', 'ha:meta:attribution'],
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
