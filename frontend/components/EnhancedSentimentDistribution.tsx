'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Download } from 'lucide-react';

interface EnhancedSentimentDistributionProps {
  data: any[];
  onExport?: () => void;
}

const COLORS = {
  'Highly Negative': '#0891b2',
  'Negative': '#f59e0b',
  'Slightly Negative': '#dc2626',
  'Neutral': '#d1d5db',
  'Slightly Positive': '#0d9488',
  'Positive': '#fbbf24',
  'Highly Positive': '#10b981'
};

export default function EnhancedSentimentDistribution({ data, onExport }: EnhancedSentimentDistributionProps) {
  return (
    <div id="sentiment-distribution-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sentiment Distribution
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
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            fill="#8884d8"
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#6b7280'} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend 
            verticalAlign="middle" 
            align="right"
            layout="vertical"
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
