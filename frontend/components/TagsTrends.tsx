'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tag } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface TagsTrendsProps {
  dateRange: { from: string; to: string };
  onExport?: () => void;
}

export default function TagsTrends({ dateRange, onExport }: TagsTrendsProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/tags-trends`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to,
          top_k: 10
        }
      });
      
      // Transform data to have tags as columns
      const rawData = res.data.data;
      const periodMap: any = {};
      
      rawData.forEach((item: any) => {
        if (!periodMap[item.period]) {
          periodMap[item.period] = { period: item.period };
        }
        periodMap[item.period][item.tag] = item.count;
      });
      
      const transformed = Object.values(periodMap);
      setData(transformed);
    } catch (error) {
      console.error('Error fetching tags trends:', error);
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

  // Extract tags from data
  const tags = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'period') : [];
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
  ];

  return (
    <div id="tags-trends-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
            <Tag className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tags Trends Over Time</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Trending topics and keywords</p>
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
        <LineChart data={data}>
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
          <Legend 
            wrapperStyle={{ fontSize: '11px' }}
            iconSize={10}
          />
          {tags.slice(0, 10).map((tag, index) => (
            <Line
              key={tag}
              type="monotone"
              dataKey={tag}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              name={tag.length > 30 ? tag.substring(0, 30) + '...' : tag}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
