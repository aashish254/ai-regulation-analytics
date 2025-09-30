'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, Globe, Building2, TrendingUp, Sun, Moon,
  Download, FileDown, Smile
} from 'lucide-react';

import { useTheme } from '@/contexts/ThemeContext';
import EnhancedKPICard from '@/components/EnhancedKPICard';
import DocumentVolumeChart from '@/components/DocumentVolumeChart';
import EnhancedSentimentDistribution from '@/components/EnhancedSentimentDistribution';
import SentimentTrendChart from '@/components/SentimentTrendChart';
import AuthoritySentimentPatterns from '@/components/AuthoritySentimentPatterns';
import RiskLevelProgression from '@/components/RiskLevelProgression';
import MonthlyDocumentVolume from '@/components/MonthlyDocumentVolume';
import AuthorityVolumeComparison from '@/components/AuthorityVolumeComparison';
import AuthorityActivityTimeline from '@/components/AuthorityActivityTimeline';
import CountryRegulationActivity from '@/components/CountryRegulationActivity';
import ProfessionalAssistant from '@/components/ProfessionalAssistant';
import DocumentTypeDistribution from '@/components/DocumentTypeDistribution';
import RiskOverTime from '@/components/RiskOverTime';
import LanguageDistribution from '@/components/LanguageDistribution';
import StatusDistribution from '@/components/StatusDistribution';
import RegionalComparison from '@/components/RegionalComparison';
import SentimentRiskCorrelation from '@/components/SentimentRiskCorrelation';
import DocumentLengthDistribution from '@/components/DocumentLengthDistribution';
import ConfidenceMetrics from '@/components/ConfidenceMetrics';
import TopicWordCloud from '@/components/TopicWordCloud';
import AuthorityNetwork from '@/components/AuthorityNetwork';
import QuarterlyComparison from '@/components/QuarterlyComparison';
import TagsTrends from '@/components/TagsTrends';
import { exportChartAsPNG, generatePDFReport } from '@/utils/exportUtils';
import ExportReport from '@/components/ExportReport';
import SavedViewsManager from '@/components/SavedViewsManager';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState<any>(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [liveDataStatus, setLiveDataStatus] = useState(true);

  // Initialize date range from API
  useEffect(() => {
    const initializeDateRange = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/overview`);
        if (response.data.date_range) {
          const minDate = response.data.date_range.min?.split('T')[0] || '2023-01-01';
          const today = new Date().toISOString().split('T')[0];
          setDateRange({ from: minDate, to: today });
        }
      } catch (error) {
        console.error('Failed to initialize date range:', error);
        // Fallback to default dates
        const today = new Date().toISOString().split('T')[0];
        setDateRange({ from: '2016-01-01', to: today });
      }
    };
    initializeDateRange();
  }, []);

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchOverview();
    }
  }, [dateRange]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/overview`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to
        }
      });
      console.log('Overview API Response:', res.data);
      setOverview(res.data);
      setLiveDataStatus(true);
    } catch (error) {
      console.error('Error fetching overview:', error);
      setLiveDataStatus(false);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    // Export charts based on active tab
    let sections: { id: string; title: string }[] = [];
    
    switch (activeTab) {
      case 'overview':
        sections = [
          { id: 'document-volume-chart', title: 'Document Volume Over Time' },
          { id: 'sentiment-distribution-chart', title: 'Sentiment Distribution' },
        ];
        break;
      case 'sentiment':
        sections = [
          { id: 'sentiment-trend-chart', title: 'Sentiment Trends Over Time' },
          { id: 'authority-sentiment-chart', title: 'Authority Sentiment Patterns' },
        ];
        break;
      case 'trend':
        sections = [
          { id: 'risk-level-chart', title: 'Risk Level Progression' },
          { id: 'monthly-volume-chart', title: 'Monthly Document Volume' },
        ];
        break;
      case 'authority':
        sections = [
          { id: 'authority-volume-chart', title: 'Authority Volume Comparison' },
          { id: 'authority-activity-chart', title: 'Authority Activity Timeline' },
        ];
        break;
      case 'geographic':
        sections = [
          { id: 'country-activity-chart', title: 'Country Regulation Activity' },
          { id: 'regional-comparison-chart', title: 'Regional Comparison' },
        ];
        break;
      case 'document':
        sections = [
          { id: 'document-type-chart', title: 'Document Type Distribution' },
          { id: 'status-distribution-chart', title: 'Status Distribution' },
          { id: 'document-length-chart', title: 'Document Length Distribution' },
          { id: 'language-distribution-chart', title: 'Language Distribution' },
        ];
        break;
      case 'advanced':
        sections = [
          { id: 'risk-over-time-chart', title: 'Risk Over Time' },
          { id: 'sentiment-risk-correlation-chart', title: 'Sentiment-Risk Correlation' },
          { id: 'confidence-metrics-chart', title: 'Confidence Metrics' },
          { id: 'quarterly-comparison-chart', title: 'Quarterly Comparison' },
          { id: 'topic-wordcloud-chart', title: 'Topic Word Cloud' },
          { id: 'tags-trends-chart', title: 'Tags Trends' },
          { id: 'authority-network-chart', title: 'Authority Network' },
        ];
        break;
      default:
        sections = [
          { id: 'document-volume-chart', title: 'Document Volume Over Time' },
          { id: 'sentiment-distribution-chart', title: 'Sentiment Distribution' },
        ];
    }
    const result = await generatePDFReport(
      `AI Regulation Analytics - ${tabs.find(t => t.id === activeTab)?.label || 'Report'}`,
      sections,
      {
        dateRange: `${dateRange.from} to ${dateRange.to}`,
        totalDocuments: overview?.total_documents || 0,
      }
    );
    if (result.success) {
      alert(`PDF report generated successfully! Captured ${result.capturedCount} charts.`);
    }
  };

  const handleLoadView = (view: any) => {
    setDateRange({ from: view.dateFrom, to: view.dateTo });
    setActiveTab(view.activeTab);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sentiment', label: 'Sentiment Analysis' },
    { id: 'trend', label: 'Trend Analysis' },
    { id: 'authority', label: 'Authority Analysis' },
    { id: 'geographic', label: 'Geographic Analysis' },
    { id: 'document', label: 'Document Analytics' },
    { id: 'advanced', label: 'Advanced Analytics' },
  ]

  const [sentimentData, setSentimentData] = useState<any[]>([]);

  useEffect(() => {
    fetchSentimentData();
  }, [dateRange]);

  const fetchSentimentData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sentiment-distribution`, {
        params: {
          date_from: dateRange.from,
          date_to: dateRange.to
        }
      });
      // Transform API data to match chart format
      const transformed = res.data.data.map((item: any) => ({
        name: item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1),
        value: item.count
      }));
      setSentimentData(transformed);
    } catch (error) {
      console.error('Error fetching sentiment data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                AI Regulation Analytics Dashboard
              </h1>
              <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                liveDataStatus 
                  ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                  : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  liveDataStatus ? 'bg-teal-500 animate-pulse' : 'bg-red-500'
                }`}></span>
                {liveDataStatus ? 'Live Data' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">From:</label>
                <input
                  type="text"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="2023-01-01"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">To:</label>
                <input
                  type="text"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="2025-07-26"
                />
              </div>
              <button 
                onClick={() => {
                  fetchOverview();
                  fetchSentimentData();
                }}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Apply
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {theme === 'light' ? <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <Sun className="w-5 h-5 text-gray-300" />}
              </button>
              <SavedViewsManager
                currentView={{
                  dateFrom: dateRange.from,
                  dateTo: dateRange.to,
                  activeTab: activeTab
                }}
                onLoadView={handleLoadView}
              />
              <ExportReport 
                apiUrl={API_URL}
                dateFrom={dateRange.from}
                dateTo={dateRange.to}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="bg-white dark:bg-gray-800 rounded-t-xl border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-1 px-4" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-3 px-4 font-medium text-sm transition-all
                  ${activeTab === tab.id
                    ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-b-xl shadow-sm p-6 mb-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <EnhancedKPICard
                    title="Total Documents"
                    value={overview?.total_documents?.toLocaleString() || '0'}
                    subtitle={`From ${dateRange.from}`}
                    icon={FileText}
                    iconColor="text-blue-600 dark:text-blue-400"
                    iconBgColor="bg-blue-100 dark:bg-blue-900/30"
                    trend={overview?.total_documents_change !== undefined ? {
                      value: overview.total_documents_change,
                      isPositive: overview.total_documents_change >= 0,
                      isPercentage: true
                    } : undefined}
                  />
                  <EnhancedKPICard
                    title="Authorities"
                    value={overview?.num_authorities?.toString() || '0'}
                    subtitle="Unique authorities"
                    icon={Building2}
                    iconColor="text-purple-600 dark:text-purple-400"
                    iconBgColor="bg-purple-100 dark:bg-purple-900/30"
                    trend={overview?.num_authorities_change_abs !== undefined ? {
                      value: overview.num_authorities_change_abs,
                      isPositive: overview.num_authorities_change_abs >= 0,
                      isPercentage: false
                    } : undefined}
                  />
                  <EnhancedKPICard
                    title="Countries"
                    value={overview?.num_countries?.toString() || '0'}
                    subtitle="Global coverage"
                    icon={Globe}
                    iconColor="text-teal-600 dark:text-teal-400"
                    iconBgColor="bg-teal-100 dark:bg-teal-900/30"
                    trend={overview?.num_countries_change_abs !== undefined ? {
                      value: overview.num_countries_change_abs,
                      isPositive: overview.num_countries_change_abs >= 0,
                      isPercentage: false
                    } : undefined}
                  />
                  <EnhancedKPICard
                    title="Avg Sentiment"
                    value={overview?.avg_sentiment?.toFixed(3) || '0.000'}
                    subtitle={overview?.avg_sentiment !== undefined && overview.avg_sentiment >= 0 ? 'Positive trend' : 'Negative trend'}
                    icon={Smile}
                    iconColor={overview?.avg_sentiment !== undefined && overview.avg_sentiment >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                    iconBgColor={overview?.avg_sentiment !== undefined && overview.avg_sentiment >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}
                  />
                </div>
              )}

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DocumentVolumeChart dateRange={dateRange} onExport={() => exportChartAsPNG('document-volume-chart', 'document_volume')} />
                <EnhancedSentimentDistribution data={sentimentData} onExport={() => exportChartAsPNG('sentiment-distribution-chart', 'sentiment_distribution')} />
              </div>
            </div>
          )}

          {activeTab === 'sentiment' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SentimentTrendChart dateRange={dateRange} onExport={() => exportChartAsPNG('sentiment-trend-chart', 'sentiment_trend')} />
                <AuthoritySentimentPatterns 
                  dateRange={dateRange}
                  onExport={() => exportChartAsPNG('authority-sentiment-chart', 'authority_sentiment')}
                />
              </div>
            </div>
          )}

          {activeTab === 'trend' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RiskLevelProgression 
                  dateRange={dateRange}
                  onExport={() => exportChartAsPNG('risk-level-chart', 'risk_level')}
                />
                <MonthlyDocumentVolume 
                  dateRange={dateRange}
                  onExport={() => exportChartAsPNG('monthly-volume-chart', 'monthly_volume')}
                />
              </div>
            </div>
          )}

          {activeTab === 'authority' && (
            <div className="space-y-6">
              <AuthorityVolumeComparison 
                dateRange={dateRange}
                onExport={() => exportChartAsPNG('authority-volume-chart', 'authority_volume')}
              />
              <AuthorityActivityTimeline 
                dateRange={dateRange}
                onExport={() => exportChartAsPNG('authority-activity-chart', 'authority_activity')}
              />
            </div>
          )}

          {activeTab === 'geographic' && (
            <div className="space-y-6">
              <CountryRegulationActivity 
                dateRange={dateRange}
                onExport={() => exportChartAsPNG('country-activity-chart', 'country_activity')}
              />
              <RegionalComparison 
                dateRange={dateRange}
                onExport={() => exportChartAsPNG('regional-comparison-chart', 'regional_comparison')}
              />
            </div>
          )}

          {activeTab === 'document' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DocumentTypeDistribution 
                  dateRange={dateRange}
                  onExport={() => exportChartAsPNG('document-type-chart', 'document_type')}
                />
                <StatusDistribution 
                  dateRange={dateRange}
                  onExport={() => exportChartAsPNG('status-distribution-chart', 'status_distribution')}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DocumentLengthDistribution 
                  dateRange={dateRange}
                  onExport={() => exportChartAsPNG('document-length-chart', 'document_length')}
                />
                <LanguageDistribution 
                  dateRange={dateRange}
                  onExport={() => exportChartAsPNG('language-distribution-chart', 'language_distribution')}
                />
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RiskOverTime 
                  dateRange={dateRange}
                  onExport={() => exportChartAsPNG('risk-over-time-chart', 'risk_over_time')}
                />
                <SentimentRiskCorrelation 
                  dateRange={dateRange}
                  onExport={() => exportChartAsPNG('sentiment-risk-correlation-chart', 'sentiment_risk_correlation')}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ConfidenceMetrics 
                  dateRange={dateRange}
                  onExport={() => exportChartAsPNG('confidence-metrics-chart', 'confidence_metrics')}
                />
                <QuarterlyComparison 
                  dateRange={dateRange}
                  onExport={() => exportChartAsPNG('quarterly-comparison-chart', 'quarterly_comparison')}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopicWordCloud 
                  dateRange={dateRange}
                  onExport={() => exportChartAsPNG('topic-wordcloud-chart', 'topic_wordcloud')}
                />
                <TagsTrends 
                  dateRange={dateRange}
                  onExport={() => exportChartAsPNG('tags-trends-chart', 'tags_trends')}
                />
              </div>
              <AuthorityNetwork 
                dateRange={dateRange}
                onExport={() => exportChartAsPNG('authority-network-chart', 'authority_network')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Professional Assistant */}
      <ProfessionalAssistant apiUrl={API_URL} />
    </div>
  );
}
