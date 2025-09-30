'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AuthorityVolumeComparisonProps {
  dateRange: { from: string; to: string };
  onExport?: () => void;
}

export default function AuthorityVolumeComparison({ dateRange, onExport }: AuthorityVolumeComparisonProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/authority-volume`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to,
          top_k: 10
        }
      });
      setData(res.data.data);
    } catch (error) {
      console.error('Error fetching authority volume:', error);
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
    <div id="authority-volume-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Authority Document Volume Comparison
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
      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={data} 
          layout="vertical"
          margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis type="number" tick={{ fill: '#6b7280' }} />
          <YAxis 
            dataKey="authority" 
            type="category" 
            tick={{ fill: '#6b7280', fontSize: 11 }}
            width={140}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Bar 
            dataKey="documents" 
            name="Documents" 
            fill="#b91c1c" 
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
