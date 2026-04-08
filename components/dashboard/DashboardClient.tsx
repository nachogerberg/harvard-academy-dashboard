'use client'

import { useState, useCallback } from 'react'
import StatCard from './StatCard'
import FunnelChart from './FunnelChart'
import CampaignTable from './CampaignTable'

import AttributionTable from './AttributionTable'
import DateFilter, { FilterState, getInitialFilter, presetToRange } from './DateFilter'

interface MetaSummary {
  spend: number
  impressions: number
  clicks: number
  leads: number
  cpl: number
}

interface FunnelStage {
  name: string
  count: number
}

interface Pipeline {
  total: number
  funnel: FunnelStage[]
  closed: number
  qualificationRate: number
  closedValue: number
}

interface Campaign {
  campaign_name: string
  spend: number
  impressions: number
  clicks: number
  leads: number
  cpl: number
}


function fmt$(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Convert our FilterState to Meta API preset string
function toMetaPreset(filter: FilterState): string {
  const map: Record<string, string> = {
    today: 'today',
    last_7d: 'last_7d',
    last_14d: 'last_14d',
    last_30d: 'last_30d',
    this_month: 'this_month',
    last_month: 'last_month',
  }
  return map[filter.preset] ?? 'last_30d'
}

interface AttributionData {
  campaigns: any[]
  bestAdId?: string | null
}

export default function DashboardClient({
  initialSummary,
  initialCampaigns,

  initialPipeline,
  initialAttribution,
  metaError,
}: {
  initialSummary: MetaSummary
  initialCampaigns: Campaign[]
  initialPipeline: Pipeline
  initialAttribution?: AttributionData
  metaError?: string | null
}) {
  const [apiError, setApiError] = useState<string | null>(metaError ?? null)
  const [filter, setFilter] = useState<FilterState>(getInitialFilter())
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(initialSummary)
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [pipeline, setPipeline] = useState(initialPipeline)
  const [attribution, setAttribution] = useState<AttributionData>(
    initialAttribution ?? { campaigns: [] }
  )
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const fetchAll = useCallback(async (f: FilterState) => {
    setLoading(true)
    try {
      setApiError(null)
      const metaPreset = toMetaPreset(f)
      const { startDate, endDate } = f.range

      const [sum, camp, pipe, attr] = await Promise.all([
        fetch(`/api/meta/insights?level=account&preset=${metaPreset}`).then((r) => r.json()),
        fetch(`/api/meta/insights?level=campaign&preset=${metaPreset}`).then((r) => r.json()),
        fetch(
          `/api/ghl/pipeline?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
        ).then((r) => r.json()),
        fetch(
          `/api/meta/attribution?startDate=${encodeURIComponent(startDate.slice(0, 10))}&endDate=${encodeURIComponent(endDate.slice(0, 10))}`
        ).then((r) => r.json()),
      ])

      setSummary(sum)
      setCampaigns(camp)
      setPipeline(pipe)
      if (attr && !attr.error) setAttribution(attr)
      setLastUpdated(new Date())
    } catch (e: any) {
      setApiError(e.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFilterChange = (f: FilterState) => {
    setFilter(f)
    fetchAll(f)
  }

  const costPerClosed = pipeline.closed > 0 ? summary.spend / pipeline.closed : 0
  const closeRate = pipeline.total > 0 ? (pipeline.closed / pipeline.total) * 100 : 0
  const ctr = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0

  // Date range label for display
  const rangeLabel = (() => {
    const s = filter.range.startDate.slice(0, 10)
    const e = filter.range.endDate.slice(0, 10)
    return `${s} → ${e}`
  })()

  return (
    <main className="min-h-screen bg-gray-950 p-6 text-white">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">🎓 Harvard Academy</h1>
            <p className="mt-0.5 text-sm text-gray-400">
              Performance Dashboard ·{' '}
              <span className="text-gray-500 font-mono text-xs">{rangeLabel}</span>
              {' '}·{' '}
              <span className="text-gray-600 text-xs">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            </p>
          </div>
        </div>
        <DateFilter value={filter} onChange={handleFilterChange} />
      </div>

      {/* Loading bar */}
      {loading && (
        <div className="mb-4 h-0.5 w-full overflow-hidden rounded-full bg-gray-800">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500" />
        </div>
      )}

      {/* Error banner */}
      {apiError && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          ⚠️ <strong>Meta API error:</strong> {apiError}
          {apiError.includes('token') || apiError.includes('OAuth') ? (
            <span className="ml-2 text-red-400">— Token may have expired. Please refresh it.</span>
          ) : null}
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Ad Spend"
          value={fmt$(summary.spend)}
          sub="Meta Ads"
          color="blue"
        />
        <StatCard
          title="Total Leads (Meta)"
          value={summary.leads.toLocaleString()}
          sub={`CPL avg: ${fmt$(summary.cpl)}`}
          color="purple"
        />
        <StatCard
          title="GHL Opps (period)"
          value={pipeline.total.toLocaleString()}
          sub={`By lead created date`}
          color="yellow"
        />
        <StatCard
          title="Closed Deals"
          value={pipeline.closed}
          sub={`Cost/closed: ${costPerClosed > 0 ? fmt$(costPerClosed) : '—'}`}
          color="green"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Impressions"
          value={summary.impressions.toLocaleString()}
          sub={`CTR: ${ctr.toFixed(2)}%`}
          color="blue"
        />
        <StatCard
          title="Clicks"
          value={summary.clicks.toLocaleString()}
          sub="Link clicks"
          color="purple"
        />
        <StatCard
          title="Qualification Rate"
          value={`${pipeline.qualificationRate.toFixed(1)}%`}
          sub={`${pipeline.total} total opps`}
          color="yellow"
        />
        <StatCard
          title="Not Qualified"
          value={pipeline.funnel.find((s) => s.name === 'Not Qualified')?.count ?? 0}
          sub={`Close rate: ${closeRate.toFixed(1)}%`}
          color="red"
        />
      </div>

      {/* Funnel + Campaign Table */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <FunnelChart data={pipeline.funnel} />
        <CampaignTable data={campaigns} />
      </div>

      {/* Attribution table */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
          Meta × GHL Attribution
        </h2>
        <AttributionTable data={attribution.campaigns} bestAdId={attribution.bestAdId} />
      </div>

      <p className="mt-8 text-center text-xs text-gray-700">
        GHL · ffz8gsS9LTjSOiT35Bbc · Meta · act_4539372202957860 · Built by FORGE / Engage OS
      </p>
    </main>
  )
}
