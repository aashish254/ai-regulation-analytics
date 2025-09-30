import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportChartAsPNG = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found');
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2,
    });
    
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Error exporting chart:', error);
  }
};

export const exportChartAsSVG = (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found');
    return;
  }

  const svgElement = element.querySelector('svg');
  if (!svgElement) {
    console.error('SVG element not found');
    return;
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.download = `${filename}.svg`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
};

export const exportDataAsCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

export const generatePDFReport = async (
  title: string,
  sections: { id: string; title: string }[],
  metadata?: { dateRange?: string; totalDocs?: number }
) => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Metadata
    if (metadata) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      if (metadata.dateRange) {
        pdf.text(`Date Range: ${metadata.dateRange}`, 20, yPosition);
        yPosition += 7;
      }
      if (metadata.totalDocs) {
        pdf.text(`Total Documents: ${metadata.totalDocs.toLocaleString()}`, 20, yPosition);
        yPosition += 7;
      }
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition);
      yPosition += 10;
    }

    let capturedCount = 0;

    // Add each section as an image
    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (!element) {
        console.warn(`Element not found: ${section.id}`);
        continue;
      }

      // Check if element is visible
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.warn(`Element not visible: ${section.id}`);
        continue;
      }

      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true,
          allowTaint: true,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Check if we need a new page
        if (yPosition + imgHeight + 20 > pageHeight) {
          pdf.addPage();
          yPosition = 20;
        }

        // Section title
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(section.title, 20, yPosition);
        yPosition += 10;

        // Add image
        pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 15;
        capturedCount++;

      } catch (error) {
        console.error(`Error adding section ${section.title}:`, error);
        // Add error note to PDF
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(200, 0, 0);
        pdf.text(`[Chart could not be captured: ${section.title}]`, 20, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 10;
      }
    }

    if (capturedCount === 0) {
      // No charts captured, add message
      pdf.setFontSize(12);
      pdf.text('No charts available to export.', 20, yPosition);
      pdf.text('Please ensure charts are loaded and visible.', 20, yPosition + 10);
    }

    // Save PDF
    const filename = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
    
    return { success: true, capturedCount };
  } catch (error) {
    console.error('Error generating PDF report:', error);
    alert('Failed to generate PDF report. Please try again.');
    return { success: false, error };
  }
};

export const exportDataAsJSON = (data: any, filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.json`;
  link.click();
};
