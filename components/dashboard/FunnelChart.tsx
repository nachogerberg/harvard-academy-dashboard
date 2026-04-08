'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface FunnelStage {
  name: string
  count: number
}

const STAGE_COLORS: Record<string, string> = {
  'New Lead': '#3b82f6',
  'Contacted': '#06b6d4',
  'Proposal Sent': '#eab308',
  'Closed': '#22c55e',
}

export default function FunnelChart({ data }: { data: FunnelStage[] }) {
  const active = data.filter((d) => d.count > 0)
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400">
        Pipeline Funnel
      </h2>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={active} layout="vertical" margin={{ left: 8, right: 32 }}>
          <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <YAxis
            dataKey="name"
            type="category"
            width={160}
            tick={{ fill: '#d1d5db', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#f9fafb', fontWeight: 600 }}
            itemStyle={{ color: '#d1d5db' }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {active.map((entry) => (
              <Cell key={entry.name} fill={STAGE_COLORS[entry.name] ?? '#6b7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
