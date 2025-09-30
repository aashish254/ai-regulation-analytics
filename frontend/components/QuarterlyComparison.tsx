'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface QuarterlyComparisonProps {
  dateRange: { from: string; to: string };
  onExport?: () => void;
}

export default function QuarterlyComparison({ dateRange, onExport }: QuarterlyComparisonProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/quarterly-comparison`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to
        }
      });
      
      // Transform data to group by quarter across years
      const rawData = res.data.data;
      const quarterMap: any = {};
      
      rawData.forEach((item: any) => {
        // Handle quarter format - could be "2024-Q1" or just "Q1"
        let quarter = item.quarter;
        if (typeof quarter === 'string' && quarter.includes('-')) {
          quarter = quarter.split('-')[1]; // Extract Q1, Q2, etc.
        } else if (typeof quarter === 'number') {
          quarter = `Q${quarter}`;
        }
        
        if (!quarterMap[quarter]) {
          quarterMap[quarter] = { quarter };
        }
        quarterMap[quarter][`${item.year}`] = item.documents;
      });
      
      const transformed = Object.values(quarterMap).sort((a: any, b: any) => {
        const qOrder = { 'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4 };
        return qOrder[a.quarter as keyof typeof qOrder] - qOrder[b.quarter as keyof typeof qOrder];
      });
      setData(transformed);
    } catch (error) {
      console.error('Error fetching quarterly comparison:', error);
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

  // Extract years from data
  const years = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'quarter') : [];
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div id="quarterly-comparison-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Year-over-Year Quarterly Comparison</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Compare quarters across different years
              {years.length === 1 && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">
                  (Expand date range to see multiple years)
                </span>
              )}
            </p>
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

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[350px] text-gray-500 dark:text-gray-400">
          No quarterly data available for the selected date range
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis 
              dataKey="quarter" 
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
            {years.map((year, index) => (
              <Line
                key={year}
                type="monotone"
                dataKey={year}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                name={year}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
