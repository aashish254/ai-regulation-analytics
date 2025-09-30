'use client';

import React, { useState, useRef } from 'react';
import { FileDown, ChevronDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import axios from 'axios';

interface ExportReportProps {
  apiUrl?: string;
  dateFrom?: string;
  dateTo?: string;
}

export default function ExportReport({ apiUrl = 'http://localhost:8000', dateFrom, dateTo }: ExportReportProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const generateAIInsights = async (chartTitle: string, tabName: string) => {
    try {
      const response = await axios.post(`${apiUrl}/api/generate-chart-insights`, {
        chart_type: chartTitle,
        tab_name: tabName,
        date_from: dateFrom,
        date_to: dateTo
      });
      return response.data.insights || 'Analysis unavailable for this chart.';
    } catch (error) {
      console.error('Failed to generate insights:', error);
      return 'Unable to generate insights at this time.';
    }
  };

  const captureElement = async (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return null;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      return canvas;
    } catch (error) {
      console.error(`Failed to capture ${elementId}:`, error);
      return null;
    }
  };

  const exportCurrentPanel = async () => {
    setIsExporting(true);
    try {
      // Get the main content area
      const mainContent = document.querySelector('main') || document.body;
      
      // Find all visible chart containers (not hidden by conditional rendering)
      const allContainers = mainContent.querySelectorAll('.space-y-6, .grid');
      let activeContainer: Element | null = null;
      
      // Find the visible container (the one that's actually displayed)
      for (const container of Array.from(allContainers)) {
        const rect = container.getBoundingClientRect();
        if (rect.height > 0 && rect.width > 0) {
          activeContainer = container;
          break;
        }
      }

      if (!activeContainer) {
        alert('No active panel found. Please make sure you are viewing a tab with charts.');
        setIsExporting(false);
        setShowDropdown(false);
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Get active tab name
      const activeTabButton = document.querySelector('button[class*="border-b-2"]');
      const tabName = activeTabButton?.textContent?.trim() || 'Current Panel';

      // Add title
      pdf.setFontSize(20);
      pdf.setTextColor(20, 184, 166);
      pdf.text('AI Regulation Analytics Report', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text(tabName, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
      
      if (dateFrom && dateTo) {
        yPosition += 5;
        pdf.text(`Period: ${dateFrom} to ${dateTo}`, pageWidth / 2, yPosition, { align: 'center' });
      }

      yPosition += 15;

      // Find all chart elements (EXCLUDE KPI cards)
      const charts = activeContainer.querySelectorAll('.recharts-wrapper');
      const processedCharts = new Set();

      for (const chart of Array.from(charts)) {
        const chartElement = chart as HTMLElement;
        
        // Get the parent card/container for title
        let chartParent = chart.closest('.bg-white, .rounded-xl, [class*="shadow"]') as HTMLElement;
        
        // Skip if already processed or if it's a KPI card
        if (!chartParent || processedCharts.has(chartParent)) continue;
        
        // Skip KPI cards (they don't have recharts-wrapper children)
        const hasKPIClass = chartParent.querySelector('[class*="KPI"], .grid.grid-cols-1.md\\:grid-cols-2');
        if (hasKPIClass) continue;
        
        processedCharts.add(chartParent);

        // Get chart title from parent
        const titleElement = chartParent.querySelector('h3, h2, .font-semibold, .text-lg');
        const chartTitle = titleElement?.textContent?.trim() || 'Chart';

        // Add page break if needed
        if (yPosition > pageHeight - 120) {
          pdf.addPage();
          yPosition = 20;
        }

        // Add chart title with better formatting
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(20, 184, 166);
        pdf.text(chartTitle, 15, yPosition);
        yPosition += 10;

        // Capture chart
        try {
          // Hide export buttons
          const exportButtons = chartParent.querySelectorAll('button[title*="Export"], button:has(svg[class*="download"]), button:has(svg[class*="file"])');
          const hiddenElements: HTMLElement[] = [];
          
          exportButtons.forEach((btn) => {
            const element = btn as HTMLElement;
            if (element.style.display !== 'none') {
              hiddenElements.push(element);
              element.style.display = 'none';
            }
          });
          
          // Capture just the recharts-wrapper (the actual chart), not the whole card
          const canvas = await html2canvas(chartElement, {
            scale: 2.5,
            logging: false,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null, // Transparent background
            removeContainer: false,
            imageTimeout: 0,
            width: chartElement.offsetWidth,
            height: chartElement.offsetHeight
          });
          
          // Restore hidden elements
          hiddenElements.forEach((element) => {
            element.style.display = '';
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - 30;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const maxHeight = 120; // Limit chart height

          if (yPosition + Math.min(imgHeight, maxHeight) > pageHeight - 50) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.addImage(imgData, 'PNG', 15, yPosition, imgWidth, Math.min(imgHeight, maxHeight));
          yPosition += Math.min(imgHeight, maxHeight) + 10;

          // Add a light gray background box for insights section
          pdf.setFillColor(250, 250, 250);
          pdf.rect(10, yPosition - 3, pageWidth - 20, 5, 'F');
          
          // Generate AI insights with section header
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(20, 184, 166);
          pdf.text('KEY INSIGHTS & ANALYSIS', 15, yPosition);
          yPosition += 7;

          const insights = await generateAIInsights(chartTitle, tabName);
          
          // Clean up the insights text (remove any markdown artifacts)
          const cleanedInsights = insights
            .replace(/\*\*/g, '') // Remove bold markers
            .replace(/\*/g, '')   // Remove asterisks
            .trim();
          
          // Parse and format the insights properly
          const lines = cleanedInsights.split('\n');
          
          for (const line of lines) {
            if (yPosition > pageHeight - 15) {
              pdf.addPage();
              yPosition = 20;
            }
            
            const trimmedLine = line.trim();
            if (!trimmedLine) {
              yPosition += 2; // Empty line spacing
              continue;
            }
            
            // Check if it's a section header (ends with colon and is short)
            if (trimmedLine.endsWith(':') && trimmedLine.length < 50 && !trimmedLine.includes('.')) {
              pdf.setFontSize(10);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(60, 60, 60);
              pdf.text(trimmedLine, 15, yPosition);
              yPosition += 6;
            } else {
              // Regular paragraph text
              pdf.setFontSize(9.5);
              pdf.setFont('helvetica', 'normal');
              pdf.setTextColor(50, 50, 50);
              
              const wrappedText = pdf.splitTextToSize(trimmedLine, pageWidth - 30);
              for (const textLine of wrappedText) {
                if (yPosition > pageHeight - 15) {
                  pdf.addPage();
                  yPosition = 20;
                }
                pdf.text(textLine, 15, yPosition);
                yPosition += 5;
              }
              yPosition += 3;
            }
          }

          // Add separator line
          yPosition += 2;
          pdf.setDrawColor(230, 230, 230);
          pdf.setLineWidth(0.3);
          pdf.line(15, yPosition, pageWidth - 15, yPosition);
          yPosition += 10;
        } catch (err) {
          console.error('Failed to capture chart:', err);
        }
      }

      // Save PDF
      pdf.save(`AI_Regulation_${tabName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
      setShowDropdown(false);
    }
  };

  const exportWholeDashboard = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Add cover page
      pdf.setFontSize(24);
      pdf.setTextColor(20, 184, 166);
      pdf.text('AI Regulation Analytics', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
      
      pdf.setFontSize(18);
      pdf.text('Comprehensive Dashboard Report', pageWidth / 2, pageHeight / 2, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });
      
      if (dateFrom && dateTo) {
        pdf.text(`Period: ${dateFrom} to ${dateTo}`, pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });
      }

      // Get all tab buttons
      const tabButtons = document.querySelectorAll('nav[aria-label="Tabs"] button');
      
      for (const tabButton of Array.from(tabButtons)) {
        const button = tabButton as HTMLElement;
        const tabName = button.textContent?.trim() || 'Tab';
        
        // Click tab to activate it
        button.click();
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for render
        
        pdf.addPage();
        let yPosition = 20;

        // Add section title
        pdf.setFontSize(18);
        pdf.setTextColor(20, 184, 166);
        pdf.text(tabName, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;

        // Find visible content
        const mainContent = document.querySelector('main') || document.body;
        const allContainers = mainContent.querySelectorAll('.space-y-6, .grid');
        let activeContainer: Element | null = null;
        
        for (const container of Array.from(allContainers)) {
          const rect = container.getBoundingClientRect();
          if (rect.height > 0 && rect.width > 0) {
            activeContainer = container;
            break;
          }
        }

        if (!activeContainer) continue;

        // Find all charts (EXCLUDE KPI cards)
        const charts = activeContainer.querySelectorAll('.recharts-wrapper');
        const processedCharts = new Set();

        for (const chart of Array.from(charts)) {
          const chartElement = chart as HTMLElement;
          let chartParent = chart.closest('.bg-white, .rounded-xl, [class*="shadow"]') as HTMLElement;
          
          if (!chartParent || processedCharts.has(chartParent)) continue;
          
          // Skip KPI cards
          const hasKPIClass = chartParent.querySelector('[class*="KPI"], .grid.grid-cols-1.md\\:grid-cols-2');
          if (hasKPIClass) continue;
          
          processedCharts.add(chartParent);

          const titleElement = chartParent.querySelector('h3, h2, .font-semibold');
          const chartTitle = titleElement?.textContent?.trim() || 'Chart';

          if (yPosition > pageHeight - 100) {
            pdf.addPage();
            yPosition = 20;
          }

          // Add chart title with better formatting
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(20, 184, 166);
          pdf.text(chartTitle, 15, yPosition);
          yPosition += 8;

          try {
            // Hide export buttons
            const exportButtons = chartParent.querySelectorAll('button[title*="Export"], button:has(svg[class*="download"]), button:has(svg[class*="file"])');
            const hiddenElements: HTMLElement[] = [];
            
            exportButtons.forEach((btn) => {
              const element = btn as HTMLElement;
              if (element.style.display !== 'none') {
                hiddenElements.push(element);
                element.style.display = 'none';
              }
            });
            
            // Capture just the chart element
            const canvas = await html2canvas(chartElement, {
              scale: 2,
              logging: false,
              useCORS: true,
              allowTaint: true,
              backgroundColor: null,
              removeContainer: false,
              imageTimeout: 0,
              width: chartElement.offsetWidth,
              height: chartElement.offsetHeight
            });
            
            // Restore hidden elements
            hiddenElements.forEach((element) => {
              element.style.display = '';
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - 30;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const maxHeight = 100;

            if (yPosition + Math.min(imgHeight, maxHeight) > pageHeight - 50) {
              pdf.addPage();
              yPosition = 20;
            }

            pdf.addImage(imgData, 'PNG', 15, yPosition, imgWidth, Math.min(imgHeight, maxHeight));
            yPosition += Math.min(imgHeight, maxHeight) + 8;

            // Add insights section header with background
            pdf.setFillColor(250, 250, 250);
            pdf.rect(10, yPosition - 3, pageWidth - 20, 5, 'F');
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(20, 184, 166);
            pdf.text('KEY INSIGHTS & ANALYSIS', 15, yPosition);
            yPosition += 6;

            const insights = await generateAIInsights(chartTitle, tabName);
            
            // Clean up the insights text
            const cleanedInsights = insights
              .replace(/\*\*/g, '')
              .replace(/\*/g, '')
              .trim();
            
            const lines = cleanedInsights.split('\n');
            
            for (const line of lines) {
              if (yPosition > pageHeight - 15) {
                pdf.addPage();
                yPosition = 20;
              }
              
              const trimmedLine = line.trim();
              if (!trimmedLine) {
                yPosition += 2;
                continue;
              }
              
              // Section header
              if (trimmedLine.endsWith(':') && trimmedLine.length < 50 && !trimmedLine.includes('.')) {
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(60, 60, 60);
                pdf.text(trimmedLine, 15, yPosition);
                yPosition += 5;
              } else {
                // Regular text
                pdf.setFontSize(8.5);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(50, 50, 50);
                
                const wrappedText = pdf.splitTextToSize(trimmedLine, pageWidth - 30);
                for (const textLine of wrappedText) {
                  if (yPosition > pageHeight - 15) {
                    pdf.addPage();
                    yPosition = 20;
                  }
                  pdf.text(textLine, 15, yPosition);
                  yPosition += 4;
                }
                yPosition += 2;
              }
            }

            // Add separator line
            yPosition += 2;
            pdf.setDrawColor(230, 230, 230);
            pdf.setLineWidth(0.3);
            pdf.line(15, yPosition, pageWidth - 15, yPosition);
            yPosition += 8;
          } catch (err) {
            console.error('Failed to capture chart:', err);
          }
        }
      }

      pdf.save(`AI_Regulation_Complete_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export complete report. Please try again.');
    } finally {
      setIsExporting(false);
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileDown className="w-4 h-4" />
        <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && !isExporting && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
            <button
              onClick={exportCurrentPanel}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex flex-col gap-1"
            >
              <span className="font-medium text-gray-900 dark:text-white">Export Current Panel</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Export only the active tab with AI insights</span>
            </button>
            
            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            
            <button
              onClick={exportWholeDashboard}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex flex-col gap-1"
            >
              <span className="font-medium text-gray-900 dark:text-white">Export Whole Dashboard</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Export all panels with comprehensive AI analysis</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
