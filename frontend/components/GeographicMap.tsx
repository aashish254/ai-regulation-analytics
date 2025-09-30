'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Props {
  dateRange: { from: string; to: string }
}

export default function GeographicMap({ dateRange }: Props) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/geographic-data`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to
        }
      })
      setData(res.data.data.slice(0, 20))
    } catch (error) {
      console.error('Error fetching geographic data:', error)
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents by Country (Top 20)</h3>
      <ResponsiveContainer width="100%" height={500}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="country" angle={-45} textAnchor="end" height={120} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#10b981" name="Document Count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
