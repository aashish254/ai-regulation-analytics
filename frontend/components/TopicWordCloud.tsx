'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cloud } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface TopicWordCloudProps {
  dateRange: { from: string; to: string };
  onExport?: () => void;
}

export default function TopicWordCloud({ dateRange, onExport }: TopicWordCloudProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/topic-wordcloud`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to,
          top_k: 50
        }
      });
      
      setData(res.data.data);
    } catch (error) {
      console.error('Error fetching topic word cloud:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWordSize = (value: number, maxValue: number) => {
    const minSize = 12;
    const maxSize = 48;
    return minSize + ((value / maxValue) * (maxSize - minSize));
  };

  const getColor = (index: number) => {
    const colors = [
      '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B',
      '#14B8A6', '#6366F1', '#EF4444', '#06B6D4', '#84CC16'
    ];
    return colors[index % colors.length];
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

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div id="topic-wordcloud-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
            <Cloud className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Topic Word Cloud</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Most common topics and tags</p>
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

      <div className="flex flex-wrap items-center justify-center gap-3 p-6 min-h-[350px]">
        {data.map((word, index) => (
          <span
            key={index}
            style={{
              fontSize: `${getWordSize(word.value, maxValue)}px`,
              color: getColor(index),
              fontWeight: word.value > maxValue * 0.7 ? 'bold' : 'normal'
            }}
            className="hover:opacity-70 transition-opacity cursor-pointer"
            title={`${word.text}: ${word.value} occurrences`}
          >
            {word.text}
          </span>
        ))}
      </div>
    </div>
  );
}
