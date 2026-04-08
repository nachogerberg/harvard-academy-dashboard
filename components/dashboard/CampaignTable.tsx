'use client'

import { useState } from 'react'

interface CampaignRow {
  campaign_name: string
  spend: number
  impressions: number
  clicks: number
  leads: number
  cpl: number
}

type SortKey = keyof CampaignRow

export default function CampaignTable({ data }: { data: CampaignRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'desc' ? bv - av : av - bv
    }
    return sortDir === 'desc'
      ? String(bv).localeCompare(String(av))
      : String(av).localeCompare(String(bv))
  })

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const cols: { key: SortKey; label: string; fmt: (v: any) => string }[] = [
    { key: 'campaign_name', label: 'Campaign', fmt: (v) => v },
    { key: 'spend', label: 'Spend', fmt: (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { key: 'impressions', label: 'Impressions', fmt: (v) => v.toLocaleString() },
    { key: 'clicks', label: 'Clicks', fmt: (v) => v.toLocaleString() },
    { key: 'leads', label: 'Leads', fmt: (v) => v.toLocaleString() },
    { key: 'cpl', label: 'CPL', fmt: (v) => v > 0 ? `$${v.toFixed(2)}` : '—' },
  ]

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400">
        Campaign Performance
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {cols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => handleSort(c.key)}
                  className="cursor-pointer pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400 hover:text-white"
                >
                  {c.label} {sortKey === c.key ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                {cols.map((c) => (
                  <td key={c.key} className={`py-3 pr-4 ${c.key === 'campaign_name' ? 'font-medium text-white' : 'text-gray-300'}`}>
                    {c.fmt(row[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
