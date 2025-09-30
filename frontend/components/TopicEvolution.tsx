'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface TopicEvolutionProps {
  data: any[];
  onExport?: () => void;
}

export default function TopicEvolution({ data, onExport }: TopicEvolutionProps) {
  return (
    <div id="topic-evolution-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Topic Evolution Over Time
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
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis 
            dataKey="period" 
            tick={{ fill: '#6b7280', fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fill: '#6b7280' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="circle"
          />
          <Line type="monotone" dataKey="aiRiskAssessment" name="AI Risk Assessment..." stroke="#0891b2" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="aiInnovation" name="AI Innovation P..." stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="crossBorderAI" name="Cross-border AI..." stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="aiGovernance" name="AI Governance F..." stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="aiIntellectual" name="AI Intellectual..." stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="aiEnvironmental" name="AI Environmental..." stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
