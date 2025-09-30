'use client';

import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface SentimentByTopicProps {
  data: any[];
  onExport?: () => void;
}

export default function SentimentByTopic({ data, onExport }: SentimentByTopicProps) {
  return (
    <div id="sentiment-topic-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sentiment by Topic
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
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Topic ID" 
            tick={{ fill: '#6b7280' }}
            label={{ value: 'Topics', position: 'insideBottom', offset: -10, fill: '#6b7280' }}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Sentiment" 
            tick={{ fill: '#6b7280' }}
            label={{ value: 'Sentiment Score', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Scatter 
            name="Topics" 
            data={data} 
            fill="#0891b2"
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
