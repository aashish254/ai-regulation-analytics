'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Shield } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

interface ConfidenceMetricsProps {
  dateRange: { from: string; to: string };
  onExport?: () => void;
}

export default function ConfidenceMetrics({ dateRange, onExport }: ConfidenceMetricsProps) {
  const [data, setData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ average: 0, min: 0, max: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/confidence-metrics`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to
        }
      });
      
      setMetrics({
        average: res.data.average,
        min: res.data.min,
        max: res.data.max
      });
      
      const transformed = res.data.distribution.map((item: any) => ({
        name: item.confidence_category,
        value: item.count
      }));
      
      setData(transformed);
    } catch (error) {
      console.error('Error fetching confidence metrics:', error);
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
    <div id="confidence-metrics-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confidence Score Metrics</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Data quality indicators</p>
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

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Average</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.average.toFixed(3)}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Minimum</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.min.toFixed(3)}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Maximum</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.max.toFixed(3)}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={90}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
