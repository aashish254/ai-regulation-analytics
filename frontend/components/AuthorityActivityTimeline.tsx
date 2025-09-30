'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AuthorityActivityTimelineProps {
  dateRange: { from: string; to: string };
  onExport?: () => void;
}

export default function AuthorityActivityTimeline({ dateRange, onExport }: AuthorityActivityTimelineProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorities, setAuthorities] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/authority-activity`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to,
          top_k: 5,
          period: 'month'
        }
      });
      const responseData = res.data.data;
      if (responseData.length > 0) {
        // Get authority column names (exclude the time column)
        const cols = Object.keys(responseData[0]).filter(k => k !== 'ym' && k !== 'quarter');
        setAuthorities(cols);
      }
      setData(responseData);
    } catch (error) {
      console.error('Error fetching authority activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="h-96 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  const colors = ['#0891b2', '#f59e0b', '#dc2626', '#8b5cf6', '#10b981'];
  return (
    <div id="authority-activity-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Authority Activity Timeline
        </h3>
        {onExport && (
          <button
            onClick={onExport}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis 
            dataKey="ym" 
            tick={{ fill: '#6b7280', fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fill: '#6b7280' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="circle"
          />
          {authorities.map((auth, idx) => (
            <Line 
              key={auth}
              type="monotone" 
              dataKey={auth} 
              name={auth.length > 25 ? auth.substring(0, 22) + '...' : auth}
              stroke={colors[idx % colors.length]} 
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
