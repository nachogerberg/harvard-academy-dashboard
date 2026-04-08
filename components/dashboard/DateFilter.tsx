'use client'

import { useState } from 'react'

export type MetaPreset =
  | 'today'
  | 'last_7d'
  | 'last_14d'
  | 'last_30d'
  | 'this_month'
  | 'last_month'
  | 'custom'

export interface DateRange {
  startDate: string
  endDate: string
}

export interface FilterState {
  preset: MetaPreset
  range: DateRange
}

const PRESETS: { value: MetaPreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'last_7d', label: '7 Days' },
  { value: 'last_14d', label: '14 Days' },
  { value: 'last_30d', label: '30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom' },
]

function toISO(dateStr: string, endOfDay = false) {
  if (!dateStr) return ''
  return endOfDay ? `${dateStr}T23:59:59.000Z` : `${dateStr}T00:00:00.000Z`
}

function presetToRange(preset: MetaPreset): DateRange {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  if (preset === 'today') {
    return { startDate: toISO(todayStr), endDate: toISO(todayStr, true) }
  }
  if (preset === 'last_7d') {
    const s = new Date(now); s.setDate(s.getDate() - 7)
    return { startDate: s.toISOString(), endDate: toISO(todayStr, true) }
  }
  if (preset === 'last_14d') {
    const s = new Date(now); s.setDate(s.getDate() - 14)
    return { startDate: s.toISOString(), endDate: toISO(todayStr, true) }
  }
  if (preset === 'last_30d') {
    const s = new Date(now); s.setDate(s.getDate() - 30)
    return { startDate: s.toISOString(), endDate: toISO(todayStr, true) }
  }
  if (preset === 'this_month') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1)
    return { startDate: s.toISOString(), endDate: toISO(todayStr, true) }
  }
  if (preset === 'last_month') {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const e = new Date(now.getFullYear(), now.getMonth(), 0)
    return { startDate: s.toISOString(), endDate: toISO(e.toISOString().slice(0, 10), true) }
  }
  // custom — return current 30d as default
  const s = new Date(now); s.setDate(s.getDate() - 30)
  return { startDate: s.toISOString(), endDate: toISO(todayStr, true) }
}

export function getInitialFilter(): FilterState {
  const range = presetToRange('last_30d')
  return { preset: 'last_30d', range }
}

export default function DateFilter({
  value,
  onChange,
}: {
  value: FilterState
  onChange: (f: FilterState) => void
}) {
  const [customStart, setCustomStart] = useState(
    value.range.startDate.slice(0, 10)
  )
  const [customEnd, setCustomEnd] = useState(
    value.range.endDate.slice(0, 10)
  )

  const handlePreset = (preset: MetaPreset) => {
    if (preset === 'custom') {
      onChange({ preset: 'custom', range: value.range })
      return
    }
    const range = presetToRange(preset)
    onChange({ preset, range })
  }

  const applyCustom = () => {
    onChange({
      preset: 'custom',
      range: {
        startDate: toISO(customStart),
        endDate: toISO(customEnd, true),
      },
    })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePreset(p.value)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              value.preset === p.value
                ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {value.preset === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
          />
          <span className="text-xs text-gray-500">→</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={applyCustom}
            className="rounded-lg border border-blue-500 bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/30"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}

export { presetToRange }
