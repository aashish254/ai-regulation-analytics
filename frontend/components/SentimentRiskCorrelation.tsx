'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface SentimentRiskCorrelationProps {
  dateRange: { from: string; to: string };
  onExport?: () => void;
}

export default function SentimentRiskCorrelation({ dateRange, onExport }: SentimentRiskCorrelationProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/sentiment-risk-correlation`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to
        }
      });
      
      // Transform data for scatter plot
      const transformed = res.data.data.map((item: any) => ({
        x: item.sentiment_score,
        y: item.risk_score,
        title: item.title?.substring(0, 50) + '...'
      }));
      
      setData(transformed);
    } catch (error) {
      console.error('Error fetching sentiment-risk correlation:', error);
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
    <div id="sentiment-risk-correlation-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sentiment vs Risk Correlation</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Relationship between sentiment and risk scores</p>
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
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Sentiment Score"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            label={{ value: 'Sentiment Score', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Risk Score"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            label={{ value: 'Risk Score', angle: -90, position: 'insideLeft' }}
          />
          <ZAxis range={[100, 100]} />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
            content={({ payload }) => {
              if (payload && payload.length > 0) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{data.title}</p>
                    <p className="text-sm"><span className="font-semibold">Sentiment:</span> {data.x?.toFixed(3)}</p>
                    <p className="text-sm"><span className="font-semibold">Risk:</span> {data.y?.toFixed(3)}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter 
            name="Documents" 
            data={data} 
            fill="#8B5CF6"
            fillOpacity={0.7}
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
