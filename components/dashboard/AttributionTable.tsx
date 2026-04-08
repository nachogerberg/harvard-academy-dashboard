'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Ad {
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

interface Adset {
  adset_id: string
  adset_name: string
  spend: number
  impressions: number
  clicks: number
  leads: number
  cpl: number
  ctr: number
  ads: Ad[]
  ghl_leads?: number
  ghl_closed?: number
  ghl_high_intent?: number
  cost_per_closed?: number | null
}

interface Campaign {
  campaign_id: string
  campaign_name: string
  spend: number
  impressions: number
  clicks: number
  leads: number
  cpl: number
  ctr: number
  adsets: Adset[]
  ghl_leads?: number
  ghl_closed?: number
  ghl_high_intent?: number
  cost_per_closed?: number | null
}

function fmt$(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function cplColor(cpl: number): string {
  if (cpl <= 0) return 'text-gray-500'
  if (cpl <= 25) return 'text-green-400'
  if (cpl <= 40) return 'text-yellow-400'
  return 'text-red-400'
}

function cpsColor(cps: number | null | undefined): string {
  if (cps == null || cps <= 0) return 'text-gray-500'
  if (cps < 500) return 'text-green-400'
  if (cps < 1000) return 'text-yellow-400'
  return 'text-red-400'
}

function statusBadge(status?: string) {
  if (!status) return null
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-900/50 text-green-400 border-green-800',
    PAUSED: 'bg-yellow-900/50 text-yellow-400 border-yellow-800',
    DELETED: 'bg-red-900/50 text-red-400 border-red-800',
    ARCHIVED: 'bg-gray-800 text-gray-500 border-gray-700',
  }
  const c = colors[status] ?? 'bg-gray-800 text-gray-400 border-gray-700'
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium border ${c}`}>
      {status}
    </span>
  )
}

const COLS = ['Name', 'Spend', 'Impressions', 'Clicks', 'Leads', 'Closed', 'CPL', 'Cost/Closed', '']

export default function AttributionTable({
  data,
  bestAdId,
}: {
  data: Campaign[]
  bestAdId?: string | null
}) {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [expandedAdsets, setExpandedAdsets] = useState<Set<string>>(new Set())

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAdset = (id: string) => {
    setExpandedAdsets((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (!data.length) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 text-center text-sm text-gray-500">
        No attribution data available for this date range.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {COLS.map((col) => (
                <th
                  key={col}
                  className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((campaign) => {
              const cExpanded = expandedCampaigns.has(campaign.campaign_id)
              return (
                <CampaignBlock
                  key={campaign.campaign_id}
                  campaign={campaign}
                  expanded={cExpanded}
                  onToggle={() => toggleCampaign(campaign.campaign_id)}
                  expandedAdsets={expandedAdsets}
                  onToggleAdset={toggleAdset}
                  bestAdId={bestAdId}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CampaignBlock({
  campaign,
  expanded,
  onToggle,
  expandedAdsets,
  onToggleAdset,
  bestAdId,
}: {
  campaign: Campaign
  expanded: boolean
  onToggle: () => void
  expandedAdsets: Set<string>
  onToggleAdset: (id: string) => void
  bestAdId?: string | null
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-gray-800/50 bg-gray-900/80 hover:bg-gray-800/40 transition-colors"
      >
        <td className="py-3 pr-4 font-medium text-white">
          <span className="inline-flex items-center gap-1.5">
            {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
            {campaign.campaign_name}
          </span>
        </td>
        <td className="py-3 pr-4 text-gray-300">{fmt$(campaign.spend)}</td>
        <td className="py-3 pr-4 text-gray-300">{campaign.impressions.toLocaleString()}</td>
        <td className="py-3 pr-4 text-gray-300">{campaign.clicks.toLocaleString()}</td>
        <td className="py-3 pr-4 text-gray-300">{campaign.leads}</td>
        <td className="py-3 pr-4">
          <ClosedBadge count={campaign.ghl_closed ?? 0} />
        </td>
        <td className={`py-3 pr-4 ${cplColor(campaign.cpl)}`}>
          {campaign.cpl > 0 ? fmt$(campaign.cpl) : '—'}
        </td>
        <td className={`py-3 pr-4 ${cpsColor(campaign.cost_per_closed)}`}>
          {campaign.cost_per_closed != null ? fmt$(campaign.cost_per_closed) : '—'}
        </td>
        <td />
      </tr>
      {expanded &&
        campaign.adsets.map((adset) => {
          const aExpanded = expandedAdsets.has(adset.adset_id)
          return (
            <AdsetBlock
              key={adset.adset_id}
              adset={adset}
              expanded={aExpanded}
              onToggle={() => onToggleAdset(adset.adset_id)}
              bestAdId={bestAdId}
            />
          )
        })}
    </>
  )
}

function AdsetBlock({
  adset,
  expanded,
  onToggle,
  bestAdId,
}: {
  adset: Adset
  expanded: boolean
  onToggle: () => void
  bestAdId?: string | null
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-gray-800/30 bg-gray-950/40 hover:bg-gray-800/30 transition-colors"
      >
        <td className="py-2.5 pr-4 pl-8 font-medium text-gray-200">
          <span className="inline-flex items-center gap-1.5">
            {expanded ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
            {adset.adset_name}
          </span>
        </td>
        <td className="py-2.5 pr-4 text-gray-400">{fmt$(adset.spend)}</td>
        <td className="py-2.5 pr-4 text-gray-400">{adset.impressions.toLocaleString()}</td>
        <td className="py-2.5 pr-4 text-gray-400">{adset.clicks.toLocaleString()}</td>
        <td className="py-2.5 pr-4 text-gray-400">{adset.leads}</td>
        <td className="py-2.5 pr-4">
          <ClosedBadge count={adset.ghl_closed ?? 0} />
        </td>
        <td className={`py-2.5 pr-4 ${cplColor(adset.cpl)}`}>
          {adset.cpl > 0 ? fmt$(adset.cpl) : '—'}
        </td>
        <td className={`py-2.5 pr-4 ${cpsColor(adset.cost_per_closed)}`}>
          {adset.cost_per_closed != null ? fmt$(adset.cost_per_closed) : '—'}
        </td>
        <td />
      </tr>
      {expanded &&
        adset.ads.map((ad) => (
          <tr
            key={ad.ad_id}
            className={`border-b border-gray-800/20 hover:bg-gray-800/20 transition-colors ${
              ad.ad_id === bestAdId ? 'border-l-2 border-l-green-500/60' : ''
            }`}
          >
            <td className="py-2 pr-4 pl-14 text-gray-300">{ad.ad_name}</td>
            <td className="py-2 pr-4 text-gray-400">{fmt$(ad.spend)}</td>
            <td className="py-2 pr-4 text-gray-400">{ad.impressions.toLocaleString()}</td>
            <td className="py-2 pr-4 text-gray-400">{ad.clicks.toLocaleString()}</td>
            <td className="py-2 pr-4 text-gray-400">{ad.leads}</td>
            <td className="py-2 pr-4">
              <ClosedBadge count={ad.ghl_closed ?? 0} />
            </td>
            <td className={`py-2 pr-4 ${cplColor(ad.cpl)}`}>
              {ad.cpl > 0 ? fmt$(ad.cpl) : '—'}
            </td>
            <td className={`py-2 pr-4 ${cpsColor(ad.cost_per_closed)}`}>
              {ad.cost_per_closed != null ? fmt$(ad.cost_per_closed) : '—'}
            </td>
            <td className="py-2 pr-4">{statusBadge(ad.status)}</td>
          </tr>
        ))}
    </>
  )
}

function ClosedBadge({ count }: { count: number }) {
  if (count > 0) {
    return (
      <span className="inline-block rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-semibold text-green-400 border border-green-800/50">
        {count}
      </span>
    )
  }
  return <span className="text-gray-600">0</span>
}
