'use client'

import { useState } from 'react'

interface AdsetRow {
  campaign_name: string
  adset_name: string
  spend: number
  leads: number
  cpl: number
  clicks: number
}

type SortKey = keyof AdsetRow

export default function AdsetTable({ data }: { data: AdsetRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('cpl')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sorted = [...data]
    .filter((r) => r.leads > 0)
    .sort((a, b) => {
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
    else { setSortKey(key); setSortDir('asc') }
  }

  const cols: { key: SortKey; label: string; fmt: (v: any) => string }[] = [
    { key: 'adset_name', label: 'Ad Set', fmt: (v) => v },
    { key: 'campaign_name', label: 'Campaign', fmt: (v) => v },
    { key: 'spend', label: 'Spend', fmt: (v) => `$${v.toFixed(2)}` },
    { key: 'clicks', label: 'Clicks', fmt: (v) => v.toLocaleString() },
    { key: 'leads', label: 'Leads', fmt: (v) => v },
    { key: 'cpl', label: 'CPL', fmt: (v) => `$${v.toFixed(2)}` },
  ]

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400">
        Ad Set Breakdown <span className="ml-2 text-xs text-gray-500">(sorted by CPL — best first)</span>
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
                  {c.label} {sortKey === c.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${i === 0 ? 'bg-green-950/20' : ''}`}
              >
                {cols.map((c) => (
                  <td key={c.key} className={`py-3 pr-4 ${c.key === 'adset_name' ? 'font-medium text-white' : c.key === 'cpl' && i === 0 ? 'font-bold text-green-400' : 'text-gray-300'}`}>
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
