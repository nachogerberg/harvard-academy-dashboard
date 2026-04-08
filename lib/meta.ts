const BASE = 'https://graph.facebook.com/v21.0'
const TOKEN = process.env.META_ACCESS_TOKEN!
const ACCOUNT = process.env.META_AD_ACCOUNT_ID!

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last_7d'
  | 'last_14d'
  | 'last_30d'
  | 'last_month'
  | 'this_month'

export interface CampaignInsight {
  campaign_id: string
  campaign_name: string
  spend: number
  impressions: number
  clicks: number
  leads: number
  cpl: number
}

export interface AdsetInsight {
  campaign_name: string
  adset_id: string
  adset_name: string
  spend: number
  impressions: number
  clicks: number
  leads: number
  cpl: number
}

export interface AdInsight {
  campaign_id: string
  campaign_name: string
  adset_id: string
  adset_name: string
  ad_id: string
  ad_name: string
  spend: number
  impressions: number
  clicks: number
  leads: number
  cpl: number
  ctr: number
}

export interface AdStatus {
  id: string
  name: string
  status: string
  adset_id: string
  campaign_id: string
}

export interface AttributionAd {
  ad_id: string
  ad_name: string
  spend: number
  impressions: number
  clicks: number
  leads: number
  cpl: number
  ctr: number
  status?: string
  ghl_leads?: number
  ghl_closed?: number
  ghl_high_intent?: number
  cost_per_closed?: number | null
}

export interface AttributionAdset {
  adset_id: string
  adset_name: string
  spend: number
  impressions: number
  clicks: number
  leads: number
  cpl: number
  ctr: number
  ads: AttributionAd[]
  ghl_leads?: number
  ghl_closed?: number
  ghl_high_intent?: number
  cost_per_closed?: number | null
}

export interface AttributionCampaign {
  campaign_id: string
  campaign_name: string
  spend: number
  impressions: number
  clicks: number
  leads: number
  cpl: number
  ctr: number
  adsets: AttributionAdset[]
  ghl_leads?: number
  ghl_closed?: number
  ghl_high_intent?: number
  cost_per_closed?: number | null
}

async function fetchMeta(path: string, params: Record<string, string> = {}, noCache = false) {
  const url = new URL(`${BASE}/${path}`)
  url.searchParams.set('access_token', TOKEN)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), noCache ? { cache: 'no-store' } : { next: { revalidate: 300 } })
  const json = await res.json()
  if (json.error) throw new Error(`Meta API: ${json.error.message}`)
  return json
}

function extractLeads(actions: { action_type: string; value: string }[] = []) {
  return parseInt(actions.find((a) => a.action_type === 'lead')?.value ?? '0')
}

export async function getCampaignInsights(
  datePreset: DatePreset = 'last_30d'
): Promise<CampaignInsight[]> {
  const data = await fetchMeta(`act_${ACCOUNT}/insights`, {
    level: 'campaign',
    fields: 'campaign_id,campaign_name,spend,impressions,clicks,actions',
    date_preset: datePreset,
    limit: '50',
  })
  return (data.data ?? []).map((r: any) => {
    const spend = parseFloat(r.spend ?? '0')
    const leads = extractLeads(r.actions)
    return {
      campaign_id: r.campaign_id,
      campaign_name: r.campaign_name,
      spend,
      impressions: parseInt(r.impressions ?? '0'),
      clicks: parseInt(r.clicks ?? '0'),
      leads,
      cpl: leads > 0 ? spend / leads : 0,
    }
  })
}

export async function getAdsetInsights(
  datePreset: DatePreset = 'last_30d'
): Promise<AdsetInsight[]> {
  const data = await fetchMeta(`act_${ACCOUNT}/insights`, {
    level: 'adset',
    fields: 'campaign_name,adset_id,adset_name,spend,impressions,clicks,actions',
    date_preset: datePreset,
    limit: '100',
  })
  return (data.data ?? []).map((r: any) => {
    const spend = parseFloat(r.spend ?? '0')
    const leads = extractLeads(r.actions)
    return {
      campaign_name: r.campaign_name,
      adset_id: r.adset_id,
      adset_name: r.adset_name,
      spend,
      impressions: parseInt(r.impressions ?? '0'),
      clicks: parseInt(r.clicks ?? '0'),
      leads,
      cpl: leads > 0 ? spend / leads : 0,
    }
  })
}

export async function getAdLevelInsights(
  startDate: string,
  endDate: string
): Promise<AttributionCampaign[]> {
  const data = await fetchMeta(`act_${ACCOUNT}/insights`, {
    level: 'ad',
    fields: 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,actions',
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    limit: '200',
  }, true)

  const rows: AdInsight[] = (data.data ?? []).map((r: any) => {
    const spend = parseFloat(r.spend ?? '0')
    const impressions = parseInt(r.impressions ?? '0')
    const clicks = parseInt(r.clicks ?? '0')
    const leads = extractLeads(r.actions)
    return {
      campaign_id: r.campaign_id,
      campaign_name: r.campaign_name,
      adset_id: r.adset_id,
      adset_name: r.adset_name,
      ad_id: r.ad_id,
      ad_name: r.ad_name,
      spend,
      impressions,
      clicks,
      leads,
      cpl: leads > 0 ? spend / leads : 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    }
  })

  // Group into Campaign → Adset → Ad tree
  const campaignMap = new Map<string, AttributionCampaign>()

  for (const row of rows) {
    if (!campaignMap.has(row.campaign_id)) {
      campaignMap.set(row.campaign_id, {
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        spend: 0, impressions: 0, clicks: 0, leads: 0, cpl: 0, ctr: 0,
        adsets: [],
      })
    }
    const campaign = campaignMap.get(row.campaign_id)!

    let adset = campaign.adsets.find((a) => a.adset_id === row.adset_id)
    if (!adset) {
      adset = {
        adset_id: row.adset_id,
        adset_name: row.adset_name,
        spend: 0, impressions: 0, clicks: 0, leads: 0, cpl: 0, ctr: 0,
        ads: [],
      }
      campaign.adsets.push(adset)
    }

    adset.ads.push({
      ad_id: row.ad_id,
      ad_name: row.ad_name,
      spend: row.spend,
      impressions: row.impressions,
      clicks: row.clicks,
      leads: row.leads,
      cpl: row.cpl,
      ctr: row.ctr,
    })
  }

  // Roll up adset and campaign totals
  for (const campaign of campaignMap.values()) {
    for (const adset of campaign.adsets) {
      adset.spend = adset.ads.reduce((s, a) => s + a.spend, 0)
      adset.impressions = adset.ads.reduce((s, a) => s + a.impressions, 0)
      adset.clicks = adset.ads.reduce((s, a) => s + a.clicks, 0)
      adset.leads = adset.ads.reduce((s, a) => s + a.leads, 0)
      adset.cpl = adset.leads > 0 ? adset.spend / adset.leads : 0
      adset.ctr = adset.impressions > 0 ? (adset.clicks / adset.impressions) * 100 : 0
    }
    campaign.spend = campaign.adsets.reduce((s, a) => s + a.spend, 0)
    campaign.impressions = campaign.adsets.reduce((s, a) => s + a.impressions, 0)
    campaign.clicks = campaign.adsets.reduce((s, a) => s + a.clicks, 0)
    campaign.leads = campaign.adsets.reduce((s, a) => s + a.leads, 0)
    campaign.cpl = campaign.leads > 0 ? campaign.spend / campaign.leads : 0
    campaign.ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0
  }

  return Array.from(campaignMap.values())
}

export async function getAllAds(): Promise<AdStatus[]> {
  const data = await fetchMeta(`act_${ACCOUNT}/ads`, {
    fields: 'id,name,status,adset_id,campaign_id',
    limit: '200',
  }, true)
  return (data.data ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    status: a.status,
    adset_id: a.adset_id,
    campaign_id: a.campaign_id,
  }))
}

export async function getAccountSummary(datePreset: DatePreset = 'last_30d') {
  const data = await fetchMeta(`act_${ACCOUNT}/insights`, {
    fields: 'spend,impressions,clicks,actions',
    date_preset: datePreset,
  })
  const r = data.data?.[0] ?? {}
  const spend = parseFloat(r.spend ?? '0')
  const leads = extractLeads(r.actions)
  return {
    spend,
    impressions: parseInt(r.impressions ?? '0'),
    clicks: parseInt(r.clicks ?? '0'),
    leads,
    cpl: leads > 0 ? spend / leads : 0,
  }
}
