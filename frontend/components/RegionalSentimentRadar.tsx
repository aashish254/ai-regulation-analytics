'use client';

import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download } from 'lucide-react';

interface RegionalSentimentRadarProps {
  data: any[];
  onExport?: () => void;
}

export default function RegionalSentimentRadar({ data, onExport }: RegionalSentimentRadarProps) {
  return (
    <div id="regional-sentiment-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Regional Sentiment Distribution
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
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <PolarAngleAxis 
            dataKey="region" 
            tick={{ fill: '#6b7280', fontSize: 11 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[-1, 1]} 
            tick={{ fill: '#6b7280' }}
          />
          <Radar 
            name="Average Sentiment" 
            dataKey="sentiment" 
            stroke="#0891b2" 
            fill="#0891b2" 
            fillOpacity={0.6}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend iconType="circle" />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
