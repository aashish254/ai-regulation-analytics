'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

interface Props {
  dateRange: { from: string; to: string }
}

export default function TopicTrends({ dateRange }: Props) {
  const [data, setData] = useState([])
  const [topics, setTopics] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/topic-trends`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to,
          period: 'month'
        }
      })
      
      const rawData = res.data.data
      const uniqueTopics = [...new Set(rawData.map((d: any) => d.topic))]
      setTopics(uniqueTopics)
      
      // Transform data for recharts
      const periods = [...new Set(rawData.map((d: any) => d.ym || d.quarter))]
      const transformed = periods.map(period => {
        const entry: any = { period }
        rawData.filter((d: any) => (d.ym || d.quarter) === period).forEach((d: any) => {
          entry[d.topic] = d.count
        })
        return entry
      })
      
      setData(transformed)
    } catch (error) {
      console.error('Error fetching topic trends:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="h-96 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Topic Frequency Over Time</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" angle={-45} textAnchor="end" height={80} />
          <YAxis />
          <Tooltip />
          <Legend />
          {topics.map((topic, idx) => (
            <Line 
              key={topic} 
              type="monotone" 
              dataKey={topic} 
              stroke={COLORS[idx % COLORS.length]} 
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
