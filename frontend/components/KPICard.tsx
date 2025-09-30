import { LucideIcon } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
}

export default function KPICard({ title, value, icon: Icon, trend, trendUp }: KPICardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`mt-2 text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${trendUp ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <Icon className={`w-6 h-6 ${trendUp ? 'text-blue-600' : 'text-gray-600'}`} />
        </div>
      </div>
    </div>
  )
}
