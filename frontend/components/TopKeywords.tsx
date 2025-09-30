'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Props {
  dateRange: { from: string; to: string }
}

export default function TopKeywords({ dateRange }: Props) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/top-keywords`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to,
          top_k: 15
        }
      })
      setData(res.data.data)
    } catch (error) {
      console.error('Error fetching keywords:', error)
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top TF-IDF Keywords</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="keyword" type="category" width={150} />
          <Tooltip />
          <Bar dataKey="score" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
