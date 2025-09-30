"""
Intelligent AI Assistant with LangChain + Pandas
Provides natural language querying and analysis of AI regulation data
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
import os
from datetime import datetime

class IntelligentAssistant:
    """AI Assistant that can query and analyze the dataset"""
    
    def __init__(self, data_path: str):
        """Initialize the assistant with dataset"""
        self.df = pd.read_csv(data_path)
        self.df["date"] = pd.to_datetime(self.df["date"], errors="coerce")
        self._preprocess_data()
        
    def _preprocess_data(self):
        """Preprocess data for efficient querying"""
        # Fill NaN values
        for col in ["country", "region", "topic", "authority", "document_type", "status"]:
            if col in self.df.columns:
                self.df[col] = self.df[col].fillna("Unknown")
        
        # Create time-based columns
        self.df["year"] = self.df["date"].dt.year
        self.df["month"] = self.df["date"].dt.month
        self.df["quarter"] = self.df["date"].dt.quarter
        
    def query_data(self, query_type: str, filters: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Execute data queries based on query type
        
        Args:
            query_type: Type of query (sentiment_by_country, top_authorities, etc.)
            filters: Optional filters (date_from, date_to, country, etc.)
        
        Returns:
            Dictionary with query results and natural language explanation
        """
        df = self.df.copy()
        
        # Apply filters
        if filters:
            if filters.get('date_from'):
                df = df[df["date"] >= pd.to_datetime(filters['date_from'])]
            if filters.get('date_to'):
                df = df[df["date"] <= pd.to_datetime(filters['date_to'])]
            if filters.get('country'):
                df = df[df["country"] == filters['country']]
            if filters.get('region'):
                df = df[df["region"] == filters['region']]
        
        # Execute query based on type
        if query_type == "sentiment_by_country":
            return self._sentiment_by_country(df)
        elif query_type == "top_authorities":
            return self._top_authorities(df)
        elif query_type == "document_trends":
            return self._document_trends(df)
        elif query_type == "risk_analysis":
            return self._risk_analysis(df)
        elif query_type == "compare_regions":
            return self._compare_regions(df)
        elif query_type == "topic_analysis":
            return self._topic_analysis(df)
        elif query_type == "recent_activity":
            return self._recent_activity(df)
        elif query_type == "summary_stats":
            return self._summary_stats(df)
        else:
            return {"error": "Unknown query type"}
    
    def _sentiment_by_country(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze sentiment by country"""
        if "sentiment_score" not in df.columns:
            return {"error": "Sentiment data not available"}
        
        sentiment_by_country = df.groupby("country").agg({
            "sentiment_score": "mean",
            "id": "count"
        }).round(3)
        sentiment_by_country.columns = ["avg_sentiment", "document_count"]
        sentiment_by_country = sentiment_by_country.sort_values("avg_sentiment", ascending=False)
        
        top_country = sentiment_by_country.index[0]
        top_sentiment = sentiment_by_country.iloc[0]["avg_sentiment"]
        
        explanation = f"Based on {len(df)} documents, {top_country} has the most positive sentiment " \
                     f"towards AI regulation with an average score of {top_sentiment:.3f}. "
        
        if len(sentiment_by_country) > 1:
            bottom_country = sentiment_by_country.index[-1]
            bottom_sentiment = sentiment_by_country.iloc[-1]["avg_sentiment"]
            explanation += f"{bottom_country} has the lowest sentiment at {bottom_sentiment:.3f}."
        
        return {
            "data": sentiment_by_country.head(10).to_dict(),
            "explanation": explanation,
            "chart_suggestion": "bar_chart"
        }
    
    def _top_authorities(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Find most active authorities"""
        top_auth = df["authority"].value_counts().head(10)
        
        most_active = top_auth.index[0]
        doc_count = top_auth.iloc[0]
        
        explanation = f"The most active authority is {most_active} with {doc_count} documents. "
        explanation += f"The top 10 authorities account for {top_auth.sum()} documents out of {len(df)} total."
        
        return {
            "data": top_auth.to_dict(),
            "explanation": explanation,
            "chart_suggestion": "horizontal_bar"
        }
    
    def _document_trends(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze document volume trends over time"""
        df["year_month"] = df["date"].dt.to_period("M").astype(str)
        trends = df.groupby("year_month").size()
        
        avg_per_month = trends.mean()
        max_month = trends.idxmax()
        max_count = trends.max()
        
        # Calculate growth
        if len(trends) > 1:
            recent_avg = trends.tail(6).mean()
            older_avg = trends.head(6).mean()
            growth = ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0
            
            explanation = f"Document volume shows a {growth:.1f}% change comparing recent months to earlier periods. "
        else:
            explanation = ""
        
        explanation += f"Peak activity was in {max_month} with {max_count} documents. "
        explanation += f"Average monthly volume is {avg_per_month:.0f} documents."
        
        return {
            "data": trends.to_dict(),
            "explanation": explanation,
            "chart_suggestion": "line_chart"
        }
    
    def _risk_analysis(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze risk levels"""
        if "risk_level" not in df.columns:
            return {"error": "Risk level data not available"}
        
        risk_dist = df["risk_level"].value_counts()
        total = len(df)
        
        explanation = "Risk level distribution: "
        for level, count in risk_dist.items():
            pct = (count / total * 100)
            explanation += f"{level} ({pct:.1f}%), "
        
        explanation = explanation.rstrip(", ") + ". "
        
        if "high" in risk_dist.index:
            high_pct = (risk_dist["high"] / total * 100)
            explanation += f"High-risk regulations account for {high_pct:.1f}% of all documents."
        
        return {
            "data": risk_dist.to_dict(),
            "explanation": explanation,
            "chart_suggestion": "pie_chart"
        }
    
    def _compare_regions(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Compare different regions"""
        if "region" not in df.columns:
            return {"error": "Region data not available"}
        
        region_stats = df.groupby("region").agg({
            "id": "count",
            "sentiment_score": "mean" if "sentiment_score" in df.columns else "count"
        }).round(3)
        
        region_stats.columns = ["document_count", "avg_sentiment" if "sentiment_score" in df.columns else "metric"]
        region_stats = region_stats.sort_values("document_count", ascending=False)
        
        top_region = region_stats.index[0]
        top_count = region_stats.iloc[0]["document_count"]
        
        explanation = f"{top_region} leads with {top_count} documents. "
        
        if "sentiment_score" in df.columns:
            most_positive = region_stats["avg_sentiment"].idxmax()
            explanation += f"{most_positive} has the most positive sentiment towards AI regulation."
        
        return {
            "data": region_stats.to_dict(),
            "explanation": explanation,
            "chart_suggestion": "grouped_bar"
        }
    
    def _topic_analysis(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze topics"""
        if "topic" not in df.columns:
            return {"error": "Topic data not available"}
        
        topics = df["topic"].value_counts().head(10)
        
        explanation = f"The most discussed topic is '{topics.index[0]}' with {topics.iloc[0]} documents. "
        explanation += f"Top 10 topics cover {topics.sum()} documents."
        
        return {
            "data": topics.to_dict(),
            "explanation": explanation,
            "chart_suggestion": "word_cloud"
        }
    
    def _recent_activity(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Show recent activity"""
        df_sorted = df.sort_values("date", ascending=False)
        recent = df_sorted.head(10)
        
        latest_date = recent["date"].max()
        countries = recent["country"].unique()
        
        explanation = f"Most recent activity as of {latest_date.strftime('%Y-%m-%d')}. "
        explanation += f"Recent documents from: {', '.join(countries[:5])}."
        
        return {
            "data": recent[["date", "title", "country", "authority"]].to_dict(orient="records"),
            "explanation": explanation,
            "chart_suggestion": "timeline"
        }
    
    def _summary_stats(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get summary statistics"""
        stats = {
            "total_documents": len(df),
            "countries": df["country"].nunique(),
            "authorities": df["authority"].nunique(),
            "date_range": {
                "start": df["date"].min().strftime("%Y-%m-%d") if pd.notna(df["date"].min()) else None,
                "end": df["date"].max().strftime("%Y-%m-%d") if pd.notna(df["date"].max()) else None
            }
        }
        
        if "sentiment_score" in df.columns:
            stats["avg_sentiment"] = round(df["sentiment_score"].mean(), 3)
        
        explanation = f"Dataset contains {stats['total_documents']} documents from {stats['countries']} countries "
        explanation += f"and {stats['authorities']} authorities. "
        
        if stats["date_range"]["start"]:
            explanation += f"Data spans from {stats['date_range']['start']} to {stats['date_range']['end']}."
        
        return {
            "data": stats,
            "explanation": explanation,
            "chart_suggestion": "kpi_cards"
        }
    
    def dataset_exploration(self, query_type: str) -> Dict[str, Any]:
        """Explore dataset metadata and structure"""
        if query_type == "authorities":
            authorities = self.df["authority"].value_counts()
            explanation = f"The dataset contains {len(authorities)} unique authorities. "
            explanation += f"Top 5: {', '.join(authorities.head(5).index.tolist())}."
            return {
                "data": authorities.head(20).to_dict(),
                "explanation": explanation,
                "total": len(authorities)
            }
        
        elif query_type == "countries":
            countries = self.df["country"].value_counts()
            explanation = f"The dataset covers {len(countries)} countries/regions. "
            explanation += f"Most represented: {', '.join(countries.head(5).index.tolist())}."
            return {
                "data": countries.head(20).to_dict(),
                "explanation": explanation,
                "total": len(countries)
            }
        
        elif query_type == "document_types":
            doc_types = self.df["document_type"].value_counts()
            explanation = f"Document types include: {', '.join(doc_types.index.tolist())}. "
            explanation += f"Most common: {doc_types.index[0]} ({doc_types.iloc[0]} documents)."
            return {
                "data": doc_types.to_dict(),
                "explanation": explanation
            }
        
        elif query_type == "regions":
            regions = self.df["region"].value_counts()
            explanation = f"Regions covered: {', '.join(regions.index.tolist())}."
            return {
                "data": regions.to_dict(),
                "explanation": explanation
            }
        
        elif query_type == "total_documents":
            total = len(self.df)
            date_range = f"{self.df['date'].min().strftime('%Y-%m-%d')} to {self.df['date'].max().strftime('%Y-%m-%d')}"
            explanation = f"The dataset contains {total:,} documents spanning from {date_range}."
            return {
                "data": {"total": total, "date_range": date_range},
                "explanation": explanation
            }
        
        return {"error": "Unknown exploration query"}
    
    def retrieve_documents(self, filters: Dict[str, Any], limit: int = 5) -> Dict[str, Any]:
        """Retrieve specific documents based on filters"""
        df = self.df.copy()
        
        # Apply filters
        if filters.get("country"):
            df = df[df["country"].str.contains(filters["country"], case=False, na=False)]
        if filters.get("authority"):
            df = df[df["authority"].str.contains(filters["authority"], case=False, na=False)]
        if filters.get("sentiment"):
            if filters["sentiment"] == "positive":
                df = df[df["sentiment_score"] > 0.5] if "sentiment_score" in df.columns else df[df["sentiment"] == "positive"]
            elif filters["sentiment"] == "negative":
                df = df[df["sentiment_score"] < -0.5] if "sentiment_score" in df.columns else df[df["sentiment"] == "negative"]
        if filters.get("year"):
            df = df[df["year"] == int(filters["year"])]
        if filters.get("topic"):
            df = df[df["topic"].str.contains(filters["topic"], case=False, na=False)]
        
        # Sort by date (most recent first)
        df = df.sort_values("date", ascending=False).head(limit)
        
        # Prepare results
        results = []
        for _, row in df.iterrows():
            doc = {
                "title": row.get("title", "Untitled"),
                "authority": row.get("authority", "Unknown"),
                "country": row.get("country", "Unknown"),
                "date": row["date"].strftime("%Y-%m-%d") if pd.notna(row["date"]) else "Unknown",
                "sentiment": row.get("sentiment", "Unknown"),
                "content_preview": str(row.get("content", ""))[:200] + "..." if pd.notna(row.get("content")) else "No content available"
            }
            results.append(doc)
        
        explanation = f"Found {len(df)} documents matching your criteria. Showing top {len(results)}."
        
        return {
            "data": results,
            "explanation": explanation,
            "total_found": len(df)
        }
    
    def compare_entities(self, entity1: str, entity2: str, entity_type: str = "country") -> Dict[str, Any]:
        """Compare two entities (countries, authorities, regions)"""
        df = self.df.copy()
        
        if entity_type == "country":
            col = "country"
        elif entity_type == "authority":
            col = "authority"
        elif entity_type == "region":
            col = "region"
        else:
            return {"error": "Invalid entity type"}
        
        # Filter for both entities
        df1 = df[df[col].str.contains(entity1, case=False, na=False)]
        df2 = df[df[col].str.contains(entity2, case=False, na=False)]
        
        comparison = {
            entity1: {
                "documents": len(df1),
                "avg_sentiment": round(df1["sentiment_score"].mean(), 3) if "sentiment_score" in df1.columns else None,
                "authorities": df1["authority"].nunique() if entity_type != "authority" else None,
                "date_range": f"{df1['date'].min().strftime('%Y-%m-%d')} to {df1['date'].max().strftime('%Y-%m-%d')}" if len(df1) > 0 else None
            },
            entity2: {
                "documents": len(df2),
                "avg_sentiment": round(df2["sentiment_score"].mean(), 3) if "sentiment_score" in df2.columns else None,
                "authorities": df2["authority"].nunique() if entity_type != "authority" else None,
                "date_range": f"{df2['date'].min().strftime('%Y-%m-%d')} to {df2['date'].max().strftime('%Y-%m-%d')}" if len(df2) > 0 else None
            }
        }
        
        explanation = f"Comparison between {entity1} and {entity2}:\n"
        explanation += f"• {entity1}: {comparison[entity1]['documents']} documents"
        if comparison[entity1]['avg_sentiment']:
            explanation += f", avg sentiment: {comparison[entity1]['avg_sentiment']}"
        explanation += f"\n• {entity2}: {comparison[entity2]['documents']} documents"
        if comparison[entity2]['avg_sentiment']:
            explanation += f", avg sentiment: {comparison[entity2]['avg_sentiment']}"
        
        return {
            "data": comparison,
            "explanation": explanation
        }
    
    def natural_language_query(self, question: str) -> Dict[str, Any]:
        """
        Process natural language questions and route to appropriate query
        
        Args:
            question: User's question in natural language
        
        Returns:
            Query results with explanation
        """
        question_lower = question.lower()
        
        # Dataset exploration queries
        if any(word in question_lower for word in ["what authorities", "list authorities", "which authorities", "authorities are"]):
            return self.dataset_exploration("authorities")
        
        if any(word in question_lower for word in ["what countries", "which countries", "countries are", "list countries"]):
            return self.dataset_exploration("countries")
        
        if any(word in question_lower for word in ["document types", "types of documents", "what types"]):
            return self.dataset_exploration("document_types")
        
        if any(word in question_lower for word in ["what regions", "which regions", "regions are"]):
            return self.dataset_exploration("regions")
        
        if any(word in question_lower for word in ["how many documents", "total documents", "number of documents"]):
            return self.dataset_exploration("total_documents")
        
        # Comparison queries (US vs EU, etc.)
        if "vs" in question_lower or "versus" in question_lower or ("compare" in question_lower and "and" in question_lower):
            # Extract entities to compare
            if "us" in question_lower and ("eu" in question_lower or "europe" in question_lower):
                return self.compare_entities("United States", "Europe", "country")
            elif "china" in question_lower and "us" in question_lower:
                return self.compare_entities("China", "United States", "country")
            elif "compare" in question_lower:
                return self.query_data("compare_regions")
        
        # Document retrieval queries
        if any(word in question_lower for word in ["show me", "give me", "find", "retrieve", "get"]) and \
           any(word in question_lower for word in ["document", "report", "summary"]):
            filters = {}
            if "us" in question_lower or "united states" in question_lower:
                filters["country"] = "United States"
            if "eu" in question_lower or "europe" in question_lower:
                filters["country"] = "Europe"
            if "positive" in question_lower:
                filters["sentiment"] = "positive"
            if "negative" in question_lower:
                filters["sentiment"] = "negative"
            if "2024" in question_lower:
                filters["year"] = "2024"
            if "2023" in question_lower:
                filters["year"] = "2023"
            
            return self.retrieve_documents(filters)
        
        # Sentiment queries
        if any(word in question_lower for word in ["sentiment", "positive", "negative", "opinion"]):
            if any(word in question_lower for word in ["country", "countries", "nation"]):
                return self.query_data("sentiment_by_country")
            elif any(word in question_lower for word in ["region", "regional"]):
                return self.query_data("compare_regions")
            elif any(word in question_lower for word in ["trend", "over time"]):
                return self.query_data("document_trends")
        
        # Authority queries
        if any(word in question_lower for word in ["authority", "authorities", "organization", "who"]):
            if any(word in question_lower for word in ["most", "top", "active", "leading"]):
                return self.query_data("top_authorities")
        
        # Trend queries
        if any(word in question_lower for word in ["trend", "over time", "growth", "increase", "decrease"]):
            return self.query_data("document_trends")
        
        # Risk queries
        if any(word in question_lower for word in ["risk", "danger", "threat", "concern"]):
            return self.query_data("risk_analysis")
        
        # Topic queries
        if any(word in question_lower for word in ["topic", "theme", "subject", "about", "tags"]):
            return self.query_data("topic_analysis")
        
        # Recent activity
        if any(word in question_lower for word in ["recent", "latest", "new", "current"]):
            return self.query_data("recent_activity")
        
        # Default to summary
        return self.query_data("summary_stats")
    
    def explain_chart(self, chart_type: str, data_summary: Dict) -> str:
        """
        Generate natural language explanation for a chart
        
        Args:
            chart_type: Type of chart (line, bar, pie, etc.)
            data_summary: Summary of the data being visualized
        
        Returns:
            Natural language explanation
        """
        explanations = {
            "line": "This line chart shows trends over time, revealing patterns in document volume and regulatory activity.",
            "bar": "This bar chart compares different categories, making it easy to identify leaders and outliers.",
            "pie": "This pie chart shows the distribution across categories as percentages of the whole.",
            "scatter": "This scatter plot reveals correlations between two variables, helping identify relationships.",
            "area": "This area chart emphasizes cumulative trends and volume changes over time.",
        }
        
        base_explanation = explanations.get(chart_type, "This visualization presents the data in an intuitive format.")
        
        if data_summary:
            base_explanation += f" Key insight: {data_summary.get('key_insight', 'Multiple patterns are visible.')}"
        
        return base_explanation
