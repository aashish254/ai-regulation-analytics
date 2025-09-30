# AI Regulation Analytics Dashboard

A professional, modern dashboard for analyzing AI regulation trends and sentiment patterns with comprehensive data visualization and an AI-powered assistant.

## ✨ Features

### 🎨 Professional UI/UX
- **Day/Night Mode**: Seamless theme switching with smooth transitions
- **Responsive Design**: Optimized for all screen sizes
- **Modern Interface**: Clean, professional design following best UX practices
- **Live Data Indicator**: Real-time status display

### 📊 Comprehensive Analytics
- **Overview Tab**: Document volume trends and sentiment distribution
- **Sentiment Analysis**: Multi-dimensional sentiment patterns across authorities
- **Trend Analysis**: Risk level progression and monthly document volumes
- **Authority Analysis**: Document volume comparison and activity timelines
- **Topic Analysis**: Topic evolution over time and sentiment by topic
- **Geographic Analysis**: Country-wise regulation activity and regional sentiment distribution

### 📈 Advanced Visualizations
- Line charts for trends and time-series data
- Donut charts for sentiment distribution
- Bar charts for comparisons
- Radar charts for regional analysis
- Scatter plots for topic-sentiment correlation
- All charts support dark mode

### 💾 Export Capabilities
- **Export Individual Charts**: Download any chart as PNG
- **Export Full Report**: Generate comprehensive PDF reports with all visualizations
- **Export Data**: Download raw data as CSV or JSON

### 🤖 AI Assistant (XISS)
- **Interactive Chat Interface**: Professional chat UI with message history
- **Context-Aware**: Understands your data and filters
- **Real-time Responses**: Powered by your backend API
- **Minimizable**: Floating assistant that doesn't obstruct your view
- **Quick Actions**: Pre-defined queries for common questions

### 📊 Enhanced KPI Cards
- Total Documents with trend indicators
- Number of Authorities tracked
- Countries covered
- Average Sentiment score
- All with visual icons and color coding

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Backend API running (FastAPI server)

### Installation

1. **Install dependencies**:
```bash
cd frontend
npm install
```

2. **Install additional required packages**:
```bash
npm install html2canvas jspdf
```

3. **Configure environment variables**:
Create a `.env.local` file in the frontend directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. **Run the development server**:
```bash
npm run dev
```

5. **Open your browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## 🏗️ Project Structure

```
frontend/
├── app/
│   ├── globals.css          # Global styles with dark mode support
│   ├── layout.tsx            # Root layout with theme provider
│   └── page.tsx              # Main dashboard page
├── components/
│   ├── EnhancedKPICard.tsx                  # KPI cards with icons
│   ├── ProfessionalAssistant.tsx            # AI chat assistant
│   ├── EnhancedSentimentDistribution.tsx    # Donut chart
│   ├── DocumentVolumeChart.tsx              # Line chart
│   ├── SentimentTrendChart.tsx              # Multi-line chart
│   ├── AuthoritySentimentPatterns.tsx       # Grouped bar chart
│   ├── RiskLevelProgression.tsx             # Risk trend chart
│   ├── MonthlyDocumentVolume.tsx            # Bar chart
│   ├── AuthorityVolumeComparison.tsx        # Horizontal bar chart
│   ├── AuthorityActivityTimeline.tsx        # Multi-line timeline
│   ├── TopicEvolution.tsx                   # Topic trends
│   ├── SentimentByTopic.tsx                 # Scatter plot
│   ├── CountryRegulationActivity.tsx        # Country bar chart
│   └── RegionalSentimentRadar.tsx           # Radar chart
├── contexts/
│   └── ThemeContext.tsx      # Theme management
├── utils/
│   └── exportUtils.ts        # Export functions (PNG, PDF, CSV)
└── package.json
```

## 🎨 Theme System

The dashboard includes a comprehensive dark mode implementation:

- **Automatic Detection**: Respects system preferences
- **Manual Toggle**: Sun/Moon icon in header
- **Persistent**: Saves preference to localStorage
- **Smooth Transitions**: All elements transition smoothly
- **Chart Support**: All visualizations adapt to theme

## 📤 Export Features

### Export Individual Charts
Click the "Export" button on any chart to download it as PNG.

### Export Full Report
Click "Export Report" in the header to generate a comprehensive PDF including:
- All visible charts
- Metadata (date range, document count)
- Professional formatting

### Export Data
Use the export utilities to download:
- CSV format for spreadsheet analysis
- JSON format for programmatic access

## 🤖 AI Assistant Integration

The XISS AI Assistant connects to your backend API:

### Backend Requirements
Your FastAPI backend should have an endpoint:
```python
@app.post("/api/chat")
def chat_assistant(request: ChatRequest):
    return {"answer": "Your AI response here"}
```

### Customization
Edit `ProfessionalAssistant.tsx` to:
- Change welcome message
- Add quick action buttons
- Customize appearance
- Modify API integration

## 🎯 Key Components

### Enhanced KPI Cards
```tsx
<EnhancedKPICard
  title="Total Documents"
  value="5,200"
  subtitle="+16.2%"
  icon={FileText}
  iconColor="text-blue-600"
  iconBgColor="bg-blue-100"
  trend={{ value: 16.2, isPositive: true }}
/>
```

### Chart with Export
```tsx
<DocumentVolumeChart 
  dateRange={dateRange} 
  onExport={() => exportChartAsPNG('chart-id', 'filename')} 
/>
```

## 🔧 Configuration

### API URL
Set in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://your-api-url:8000
```

### Theme Colors
Modify in `tailwind.config.js` and component files.

### Chart Colors
Update color schemes in individual chart components.

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px
- **Wide**: > 1600px (optimized layout)

## 🐛 Troubleshooting

### Charts not displaying
- Ensure backend API is running
- Check browser console for errors
- Verify API_URL in environment variables

### Theme not switching
- Clear localStorage
- Check browser compatibility
- Ensure ThemeProvider is wrapping app

### Export not working
- Verify html2canvas and jspdf are installed
- Check browser console for errors
- Ensure chart IDs are unique

## 🚀 Performance Tips

1. **Lazy Loading**: Components load on demand
2. **Memoization**: Use React.memo for heavy components
3. **Data Pagination**: Limit API responses
4. **Image Optimization**: Use Next.js Image component
5. **Code Splitting**: Automatic with Next.js

## 📄 License

This project is part of the AI Regulation Analytics system.

## 🤝 Contributing

1. Follow the existing code style
2. Test in both light and dark modes
3. Ensure responsive design
4. Add TypeScript types
5. Update documentation

## 📞 Support

For issues or questions:
- Check the troubleshooting section
- Review component documentation
- Contact the development team

---

**Built with**: Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts, and ❤️
