'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AuthoritySentimentPatternsProps {
  dateRange: { from: string; to: string };
  onExport?: () => void;
}

export default function AuthoritySentimentPatterns({ dateRange, onExport }: AuthoritySentimentPatternsProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/authority-sentiment`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to,
          top_k: 5
        }
      });
      setData(res.data.data);
    } catch (error) {
      console.error('Error fetching authority sentiment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="h-96 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }
  return (
    <div id="authority-sentiment-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Authority Sentiment Patterns
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
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis 
            dataKey="authority" 
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fill: '#6b7280', fontSize: 11 }}
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
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar dataKey="highlyNegative" name="Highly Negative" fill="#0891b2" radius={[4, 4, 0, 0]} />
          <Bar dataKey="negative" name="Negative" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="slightlyNegative" name="Slightly Negative" fill="#dc2626" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
