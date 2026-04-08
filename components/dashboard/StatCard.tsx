'use client'

interface StatCardProps {
  title: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}

const colorMap = {
  blue: 'border-blue-500 bg-blue-950/40',
  green: 'border-green-500 bg-green-950/40',
  yellow: 'border-yellow-500 bg-yellow-950/40',
  red: 'border-red-500 bg-red-950/40',
  purple: 'border-purple-500 bg-purple-950/40',
}

export default function StatCard({ title, value, sub, icon, color = 'blue' }: StatCardProps) {
  return (
    <div className={`rounded-xl border-l-4 p-5 ${colorMap[color]} backdrop-blur-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">{title}</p>
          <p className="mt-1 text-3xl font-bold text-white">{value}</p>
          {sub && <p className="mt-1 text-sm text-gray-400">{sub}</p>}
        </div>
        {icon && <div className="text-gray-500">{icon}</div>}
      </div>
    </div>
  )
}
