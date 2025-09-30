'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface DocumentLengthDistributionProps {
  dateRange: { from: string; to: string };
  onExport?: () => void;
}

export default function DocumentLengthDistribution({ dateRange, onExport }: DocumentLengthDistributionProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/document-length-distribution`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to
        }
      });
      
      // Transform to have proper labels
      const transformed = res.data.data.map((item: any) => ({
        category: item.length_category,
        count: item.count
      }));
      
      setData(transformed);
    } catch (error) {
      console.error('Error fetching document length distribution:', error);
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
    <div id="document-length-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
            <FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Document Length Distribution</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Distribution by character count</p>
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
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis 
            dataKey="category" 
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            label={{ value: 'Character Count Range', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            label={{ value: 'Number of Documents', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar 
            dataKey="count" 
            fill="#06B6D4" 
            name="Documents"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
