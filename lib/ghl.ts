const BASE = 'https://services.leadconnectorhq.com'
const TOKEN = process.env.GHL_PIT_TOKEN!
const LOCATION_ID = process.env.GHL_LOCATION_ID!
const PIPELINE_ID = process.env.GHL_PIPELINE_ID!
const CLOSED_STAGE_ID = process.env.GHL_CLOSED_STAGE_ID!

export const STAGE_MAP: Record<string, string> = {
  'cf1e8b49-db77-43c1-8ddd-f164ee74a14f': 'New Lead',
  '87e7eeae-f12e-471d-9cb6-770f75fde1f4': 'Contacted',
  '8669a19c-0694-47d0-93a8-f9d5913dbdeb': 'Proposal Sent',
  'dbc240e6-2100-47d6-829f-9324bd807079': 'Closed',
}

export const STAGE_ORDER = [
  'New Lead',
  'Contacted',
  'Proposal Sent',
  'Closed',
]

async function fetchGHL(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE}/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Version: '2021-07-28',
    },
    cache: 'no-store',
  })
  return res.json()
}

export interface Opportunity {
  id: string
  name: string
  status: string
  stageId: string
  stageName: string
  monetaryValue: number
  contactId: string
  createdAt: string
  source?: string
}

export interface DateRange {
  startDate?: string // ISO string
  endDate?: string   // ISO string
}

export async function getAllOpportunities(range?: DateRange): Promise<Opportunity[]> {
  const all: Opportunity[] = []
  let startAfter: string | null = null
  let startAfterId: string | null = null

  for (let page = 0; page < 20; page++) {
    const params: Record<string, string> = {
      location_id: LOCATION_ID,
      pipeline_id: PIPELINE_ID,
      limit: '100',
    }
    if (startAfter) params.startAfter = startAfter
    if (startAfterId) params.startAfterId = startAfterId

    const data = await fetchGHL('opportunities/search', params)
    const opps: Opportunity[] = (data.opportunities ?? []).map((o: any) => ({
      id: o.id,
      name: o.name,
      status: o.status,
      stageId: o.pipelineStageId ?? '',
      stageName: STAGE_MAP[o.pipelineStageId ?? ''] ?? 'Unknown',
      monetaryValue: parseFloat(o.monetaryValue ?? '0') || 0,
      contactId: o.contactId,
      createdAt: o.createdAt,
      source: o.source,
    }))

    all.push(...opps)

    const meta = data.meta ?? {}
    if (!meta.nextPageUrl || opps.length === 0) break
    startAfter = String(meta.startAfter ?? '')
    startAfterId = meta.startAfterId ?? null
  }

  // Filter by date range on createdAt if provided
  if (!range?.startDate && !range?.endDate) return all

  const start = range.startDate ? new Date(range.startDate).getTime() : 0
  const end = range.endDate ? new Date(range.endDate).getTime() : Infinity

  return all.filter((o) => {
    const t = new Date(o.createdAt).getTime()
    return t >= start && t <= end
  })
}

export interface AttributionStats {
  leads: number
  closed: number
  highIntent: number
}

export interface AttributionMap {
  byCampaignId: Record<string, AttributionStats>
  byAdId: Record<string, AttributionStats>
}

const HIGH_INTENT_STAGES = new Set([
  '8669a19c-0694-47d0-93a8-f9d5913dbdeb', // Proposal Sent
  'dbc240e6-2100-47d6-829f-9324bd807079', // Closed
])

const CLOSED_ID = 'dbc240e6-2100-47d6-829f-9324bd807079'

export async function getAttributionMap(range?: DateRange): Promise<AttributionMap> {
  // Fetch raw opps with attribution data
  const all: any[] = []
  let startAfter: string | null = null
  let startAfterId: string | null = null

  for (let page = 0; page < 20; page++) {
    const params: Record<string, string> = {
      location_id: LOCATION_ID,
      pipeline_id: PIPELINE_ID,
      limit: '100',
    }
    if (startAfter) params.startAfter = startAfter
    if (startAfterId) params.startAfterId = startAfterId

    const data = await fetchGHL('opportunities/search', params)
    const opps = data.opportunities ?? []
    all.push(...opps)

    const meta = data.meta ?? {}
    if (!meta.nextPageUrl || opps.length === 0) break
    startAfter = String(meta.startAfter ?? '')
    startAfterId = meta.startAfterId ?? null
  }

  // Filter by date range
  let filtered = all
  if (range?.startDate || range?.endDate) {
    const start = range.startDate ? new Date(range.startDate).getTime() : 0
    const end = range.endDate ? new Date(range.endDate).getTime() : Infinity
    filtered = all.filter((o) => {
      const t = new Date(o.createdAt).getTime()
      return t >= start && t <= end
    })
  }

  const byCampaignId: Record<string, AttributionStats> = {}
  const byAdId: Record<string, AttributionStats> = {}

  for (const opp of filtered) {
    const stageId = opp.pipelineStageId ?? ''
    const isClosed = stageId === CLOSED_ID
    const isHighIntent = HIGH_INTENT_STAGES.has(stageId)

    const attributions: any[] = opp.attributions ?? []
    const attr = attributions.find((a: any) => a.isFirst === true) ?? attributions[0]
    if (!attr) continue

    const campaignId = attr.utmCampaignId ?? attr.campaignId ?? attr.campaign_id ?? ''
    const adId = attr.utmAdId ?? attr.adId ?? attr.ad_id ?? ''

    if (campaignId) {
      if (!byCampaignId[campaignId]) byCampaignId[campaignId] = { leads: 0, closed: 0, highIntent: 0 }
      byCampaignId[campaignId].leads++
      if (isClosed) byCampaignId[campaignId].closed++
      if (isHighIntent) byCampaignId[campaignId].highIntent++
    }

    if (adId) {
      if (!byAdId[adId]) byAdId[adId] = { leads: 0, closed: 0, highIntent: 0 }
      byAdId[adId].leads++
      if (isClosed) byAdId[adId].closed++
      if (isHighIntent) byAdId[adId].highIntent++
    }
  }

  return { byCampaignId, byAdId }
}

export interface FunnelStage {
  name: string
  count: number
}

export interface PipelineSummary {
  total: number
  funnel: FunnelStage[]
  closed: number
  qualificationRate: number
  closedValue: number
}

export async function getPipelineSummary(range?: DateRange): Promise<PipelineSummary> {
  const opps = await getAllOpportunities(range)

  const stageCounts: Record<string, number> = {}
  for (const stage of STAGE_ORDER) stageCounts[stage] = 0
  for (const o of opps) {
    if (stageCounts[o.stageName] !== undefined) stageCounts[o.stageName]++
  }

  const closed = opps.filter((o) => o.stageId === CLOSED_STAGE_ID)

  const qualifiedStages = ['Proposal Sent', 'Closed']
  const qualifiedCount = qualifiedStages.reduce((sum, s) => sum + (stageCounts[s] ?? 0), 0)

  return {
    total: opps.length,
    funnel: STAGE_ORDER.map((name) => ({ name, count: stageCounts[name] ?? 0 })),
    closed: closed.length,
    qualificationRate: opps.length > 0 ? (qualifiedCount / opps.length) * 100 : 0,
    closedValue: closed.reduce((sum, o) => sum + o.monetaryValue, 0),
  }
}
