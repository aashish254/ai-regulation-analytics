'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface RiskOverTimeProps {
  dateRange: { from: string; to: string };
  onExport?: () => void;
}

export default function RiskOverTime({ dateRange, onExport }: RiskOverTimeProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/risk-over-time`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to,
          period: 'month'
        }
      });
      
      setData(res.data.data);
    } catch (error) {
      console.error('Error fetching risk over time:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div id="risk-over-time-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Risk Level Distribution Over Time</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Stacked area chart of risk levels</p>
          </div>
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            Export
          </button>
        )}
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis 
            dataKey="period" 
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="low" 
            stackId="1" 
            stroke="#10B981" 
            fill="#10B981" 
            fillOpacity={0.6}
            name="Low Risk"
          />
          <Area 
            type="monotone" 
            dataKey="medium" 
            stackId="1" 
            stroke="#F59E0B" 
            fill="#F59E0B" 
            fillOpacity={0.6}
            name="Medium Risk"
          />
          <Area 
            type="monotone" 
            dataKey="high" 
            stackId="1" 
            stroke="#EF4444" 
            fill="#EF4444" 
            fillOpacity={0.6}
            name="High Risk"
          />
          <Area 
            type="monotone" 
            dataKey="very low" 
            stackId="1" 
            stroke="#6EE7B7" 
            fill="#6EE7B7" 
            fillOpacity={0.6}
            name="Very Low Risk"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
