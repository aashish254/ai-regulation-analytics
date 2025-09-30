'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Network } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AuthorityNetworkProps {
  dateRange: { from: string; to: string };
  onExport?: () => void;
}

export default function AuthorityNetwork({ dateRange, onExport }: AuthorityNetworkProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/authority-network`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to,
          top_k: 15
        }
      });
      
      setData(res.data.data);
    } catch (error) {
      console.error('Error fetching authority network:', error);
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

  // Group by authority
  const authorityGroups = data.reduce((acc: any, item: any) => {
    if (!acc[item.authority]) {
      acc[item.authority] = [];
    }
    acc[item.authority].push(item);
    return acc;
  }, {});

  return (
    <div id="authority-network-chart" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
            <Network className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Authority-Country Network</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Relationships between authorities and countries</p>
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

      <div className="overflow-y-auto max-h-[400px] space-y-4">
        {Object.entries(authorityGroups).map(([authority, countries]: [string, any], index) => (
          <div key={index} className="border-l-4 border-violet-500 pl-4 py-2">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{authority}</h4>
            <div className="flex flex-wrap gap-2">
              {countries.map((item: any, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-sm"
                  title={`${item.documents} documents`}
                >
                  {item.country} ({item.documents})
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
