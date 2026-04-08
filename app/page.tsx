import { getCampaignInsights, getAccountSummary, getAdLevelInsights, getAllAds, type AttributionCampaign } from '@/lib/meta'
import { getPipelineSummary, getAttributionMap } from '@/lib/ghl'
import DashboardClient from '@/components/dashboard/DashboardClient'

export const dynamic = 'force-dynamic'

function last30dRange() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 30)
  return {
    startDate: start.toISOString(),
    endDate: new Date(now.toISOString().slice(0, 10) + 'T23:59:59.000Z').toISOString(),
  }
}

const EMPTY_SUMMARY = { spend: 0, impressions: 0, clicks: 0, leads: 0, cpl: 0 }
const EMPTY_PIPELINE = { total: 0, funnel: [], closed: 0, qualificationRate: 0, closedValue: 0 }

export default async function Dashboard() {
  const range = last30dRange()

  const startDateStr = range.startDate.slice(0, 10)
  const endDateStr = range.endDate.slice(0, 10)

  const [metaSummaryRes, campaignsRes, pipelineRes, attrCampaignsRes, attrAdsRes, attrGhlRes] = await Promise.allSettled([
    getAccountSummary('last_30d'),
    getCampaignInsights('last_30d'),
    getPipelineSummary(range),
    getAdLevelInsights(startDateStr, endDateStr),
    getAllAds(),
    getAttributionMap(range),
  ])

  const metaSummary = metaSummaryRes.status === 'fulfilled' ? metaSummaryRes.value : EMPTY_SUMMARY
  const campaigns = campaignsRes.status === 'fulfilled' ? campaignsRes.value : []
  const pipeline = pipelineRes.status === 'fulfilled' ? pipelineRes.value : EMPTY_PIPELINE

  // Build attribution data
  let attribution: { campaigns: AttributionCampaign[]; bestAdId?: string | null } = { campaigns: [] }
  try {
    if (attrCampaignsRes.status === 'fulfilled' && attrGhlRes.status === 'fulfilled') {
      const attrCampaigns = attrCampaignsRes.value
      const ghlMap = attrGhlRes.value
      const adStatuses = attrAdsRes.status === 'fulfilled' ? attrAdsRes.value : []
      const statusMap = new Map(adStatuses.map((a) => [a.id, a.status]))

      let bestCps: number | null = null
      let bestAdId: string | null = null

      const merged = attrCampaigns.map((campaign) => {
        const cGhl = ghlMap.byCampaignId[campaign.campaign_id]
        const adsets = campaign.adsets.map((adset) => {
          let adsetGhlLeads = 0, adsetGhlClosed = 0, adsetGhlHighIntent = 0
          const ads = adset.ads.map((ad) => {
            const aGhl = ghlMap.byAdId[ad.ad_id]
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

      attribution = { campaigns: merged, bestAdId }
    }
  } catch {
    // attribution stays empty on error
  }

  const metaError = metaSummaryRes.status === 'rejected'
    ? (metaSummaryRes.reason?.message ?? 'Meta API error')
    : null

  return (
    <DashboardClient
      initialSummary={metaSummary}
      initialCampaigns={campaigns}
      initialPipeline={pipeline}
      initialAttribution={attribution}
      metaError={metaError}
    />
  )
}
