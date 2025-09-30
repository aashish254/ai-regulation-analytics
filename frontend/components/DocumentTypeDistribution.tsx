'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { FileType } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

interface DocumentTypeDistributionProps {
  dateRange: { from: string; to: string };
  onExport?: () => void;
}

export default function DocumentTypeDistribution({ dateRange, onExport }: DocumentTypeDistributionProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/document-types`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to
        }
      });
      
      const transformed = res.data.data.map((item: any) => ({
        name: item.document_type,
        value: item.count
      }));
      
      setData(transformed);
    } catch (error) {
      console.error('Error fetching document types:', error);
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
    <div id="document-type-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <FileType className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Document Type Distribution</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Breakdown by document type</p>
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
        <PieChart>
          <Pie
            data={data}
            cx="35%"
            cy="50%"
            labelLine={false}
            label={false}
            outerRadius={100}
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
            formatter={(value: any, name: any) => [`${value} documents`, name]}
          />
          <Legend 
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value, entry: any) => {
              const percent = ((entry.payload.value / data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(0);
              return `${value}: ${percent}%`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
