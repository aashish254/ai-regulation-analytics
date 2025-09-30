'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const COLORS = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#6b7280'
}

interface Props {
  dateRange: { from: string; to: string }
}

export default function SentimentDistribution({ dateRange }: Props) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/sentiment-distribution`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to
        }
      })
      setData(res.data.data)
    } catch (error) {
      console.error('Error fetching sentiment distribution:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="h-80 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ sentiment, percent }) => `${sentiment}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="count"
            nameKey="sentiment"
          >
            {data.map((entry: any, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.sentiment as keyof typeof COLORS] || '#6b7280'} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
