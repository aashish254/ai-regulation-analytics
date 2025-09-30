from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
from datetime import datetime
import os
import nltk
import tempfile
import PyPDF2
import docx

# Configure NLTK data path
nltk_data_path = os.path.expanduser('~/nltk_data')
if nltk_data_path not in nltk.data.path:
    nltk.data.path.append(nltk_data_path)

# NLP imports
from nltk.sentiment import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer
import pycountry

# Intelligent Assistant
from intelligent_assistant import IntelligentAssistant
from hybrid_llm_assistant import HybridLLMAssistant

app = FastAPI(title="AI Regulation Analytics API", version="1.0.0")

# Initialize intelligent assistants
assistant = None  # Original assistant
hybrid_assistant = None  # Hybrid LLM assistant

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load data
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "agora", "clean_dataset.csv")
df_global = None

def load_data():
    global df_global
    if df_global is None:
        df = pd.read_csv(DATA_PATH)
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df["year"] = df["date"].dt.year
        df["month"] = df["date"].dt.month
        df["ym"] = df["date"].dt.to_period("M").astype(str)
        df["quarter"] = df["date"].dt.to_period("Q").astype(str)
        
        # Fill NaN
        for col in ["country", "region", "topic", "authority", "document_type"]:
            if col in df.columns:
                df[col] = df[col].fillna("Unknown")
        
        df["text"] = df.get("content", df.get("title", "")).fillna("")
        df_global = df
    return df_global

# Pydantic models
class FilterRequest(BaseModel):
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    countries: Optional[List[str]] = None
    topics: Optional[List[str]] = None

class ChatRequest(BaseModel):
    query: str
    filters: Optional[Dict[str, Any]] = None

@app.on_event("startup")
async def startup_event():
    global assistant, hybrid_assistant
    load_data()
    # Initialize intelligent assistant
    assistant = IntelligentAssistant(DATA_PATH)
    
    # Initialize hybrid LLM assistant
    # Supports: Gemini (free), OpenAI (paid), or rule-based (no API key)
    # Configure via .env file or environment variables
    try:
        hybrid_assistant = HybridLLMAssistant(DATA_PATH)
        print("✅ Hybrid LLM Assistant initialized successfully!")
    except Exception as e:
        print(f"⚠️  Hybrid assistant initialization failed: {e}")
        print("   Falling back to basic assistant only")
        hybrid_assistant = None

@app.get("/")
def root():
    return {"message": "AI Regulation Analytics API", "version": "1.0.0"}

@app.get("/api/overview")
def get_overview(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get overview statistics"""
    df_all = load_data().copy()
    df = df_all.copy()
    
    # Apply filters for current period
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    # Calculate previous period for comparison
    prev_stats = None
    if date_from and date_to:
        date_from_dt = pd.to_datetime(date_from)
        date_to_dt = pd.to_datetime(date_to)
        period_length = (date_to_dt - date_from_dt).days
        
        # Calculate previous period dates
        prev_date_to = date_from_dt - pd.Timedelta(days=1)
        prev_date_from = prev_date_to - pd.Timedelta(days=period_length)
        
        # Get previous period data
        df_prev = df_all[
            (df_all["date"] >= prev_date_from) & 
            (df_all["date"] <= prev_date_to)
        ]
        
        if len(df_prev) > 0:
            prev_stats = {
                "total_documents": int(df_prev.shape[0]),
                "num_authorities": int(df_prev["authority"].nunique()),
                "num_countries": int(df_prev["country"].nunique())
            }
    
    # Compute sentiment with VADER
    avg_sentiment = 0.0
    try:
        sia = SentimentIntensityAnalyzer()
        sentiments = []
        for text in df["text"].head(100):  # Sample for speed
            if isinstance(text, str) and text:
                comp = sia.polarity_scores(text).get("compound", 0.0)
                sentiments.append(comp)
        
        avg_sentiment = float(np.mean(sentiments)) if sentiments else 0.0
    except Exception as e:
        print(f"Warning: Sentiment analysis failed: {e}")
        # Use a simple fallback sentiment calculation
        avg_sentiment = 0.0
    
    # Calculate changes
    current_stats = {
        "total_documents": int(df.shape[0]),
        "num_authorities": int(df["authority"].nunique()),
        "num_countries": int(df["country"].nunique()),
        "avg_sentiment": round(avg_sentiment, 3)
    }
    
    changes = {}
    if prev_stats:
        for key in ["total_documents", "num_authorities", "num_countries"]:
            if prev_stats[key] > 0:
                change_pct = ((current_stats[key] - prev_stats[key]) / prev_stats[key]) * 100
                changes[f"{key}_change"] = round(change_pct, 1)
                changes[f"{key}_change_abs"] = current_stats[key] - prev_stats[key]
            else:
                changes[f"{key}_change"] = 0
                changes[f"{key}_change_abs"] = current_stats[key]
    
    return {
        **current_stats,
        **changes,
        "date_range": {
            "min": df["date"].min().isoformat() if pd.notna(df["date"].min()) else None,
            "max": df["date"].max().isoformat() if pd.notna(df["date"].max()) else None
        }
    }

@app.get("/api/document-volume")
def get_document_volume(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    period: str = Query("month")
):
    """Get document volume over time"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    time_col = "ym" if period == "month" else "quarter"
    volume = df.groupby(time_col).size().reset_index(name="count")
    
    return {
        "data": volume.to_dict(orient="records")
    }

@app.get("/api/sentiment-distribution")
def get_sentiment_distribution(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get sentiment distribution"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    # Use existing sentiment column if available
    if "sentiment" in df.columns:
        sentiment_counts = df["sentiment"].value_counts().to_dict()
        return {
            "data": [{"sentiment": k, "count": int(v)} for k, v in sentiment_counts.items()]
        }
    
    # Fallback to VADER sentiment
    sia = SentimentIntensityAnalyzer()
    labels = []
    for text in df["text"].head(1000):
        if isinstance(text, str) and text:
            comp = sia.polarity_scores(text).get("compound", 0.0)
            if comp >= 0.6:
                labels.append("Highly Positive")
            elif comp >= 0.2:
                labels.append("Positive")
            elif comp > 0:
                labels.append("Slightly Positive")
            elif comp == 0:
                labels.append("Neutral")
            elif comp > -0.2:
                labels.append("Slightly Negative")
            elif comp > -0.6:
                labels.append("Negative")
            else:
                labels.append("Highly Negative")
        else:
            labels.append("Neutral")
    
    sentiment_counts = pd.Series(labels).value_counts().to_dict()
    
    return {
        "data": [{"sentiment": k, "count": int(v)} for k, v in sentiment_counts.items()]
    }

@app.get("/api/sentiment-trend")
def get_sentiment_trend(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    period: str = Query("month")
):
    """Get sentiment trend over time by sentiment category"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    time_col = "ym" if period == "month" else "quarter"
    
    # Use sentiment column if available
    if "sentiment" in df.columns:
        # Group by time period and sentiment
        sentiment_counts = df.groupby([time_col, "sentiment"]).size().reset_index(name="count")
        
        # Pivot to get sentiments as columns
        pivot = sentiment_counts.pivot(index=time_col, columns="sentiment", values="count").fillna(0)
        pivot = pivot.reset_index()
        pivot.columns.name = None
        
        # Rename columns to match expected format
        column_mapping = {
            "highly negative": "highlyNegative",
            "negative": "negative",
            "slightly negative": "slightlyNegative",
            "neutral": "neutral",
            "slightly positive": "slightlyPositive",
            "positive": "positive",
            "highly positive": "highlyPositive"
        }
        
        for old_col, new_col in column_mapping.items():
            if old_col in pivot.columns:
                pivot.rename(columns={old_col: new_col}, inplace=True)
        
        # Rename time column to 'period'
        pivot.rename(columns={time_col: "period"}, inplace=True)
        
        return {"data": pivot.to_dict(orient="records")}
    
    # Fallback to VADER
    df_sample = df.sample(min(1000, len(df)))
    
    sia = SentimentIntensityAnalyzer()
    results = []
    
    for _, row in df_sample.iterrows():
        text = row.get("text", "")
        if isinstance(text, str) and text:
            comp = sia.polarity_scores(text).get("compound", 0.0)
            period = row[time_col]
            
            # Categorize sentiment
            if comp <= -0.6:
                sentiment = "highlyNegative"
            elif comp <= -0.2:
                sentiment = "negative"
            elif comp < 0:
                sentiment = "slightlyNegative"
            elif comp == 0:
                sentiment = "neutral"
            elif comp < 0.2:
                sentiment = "slightlyPositive"
            elif comp < 0.6:
                sentiment = "positive"
            else:
                sentiment = "highlyPositive"
            
            results.append({"period": period, "sentiment": sentiment})
    
    result_df = pd.DataFrame(results)
    sentiment_counts = result_df.groupby(["period", "sentiment"]).size().reset_index(name="count")
    pivot = sentiment_counts.pivot(index="period", columns="sentiment", values="count").fillna(0)
    pivot = pivot.reset_index()
    pivot.columns.name = None
    
    return {
        "data": pivot.to_dict(orient="records")
    }

@app.get("/api/top-keywords")
def get_top_keywords(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    top_k: int = Query(15)
):
    """Get top TF-IDF keywords"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    # Sample for performance
    texts = df["text"].dropna().head(500).tolist()
    
    try:
        vectorizer = TfidfVectorizer(
            stop_words='english',
            max_df=0.85,
            min_df=2,
            ngram_range=(1, 2),
            max_features=top_k
        )
        X = vectorizer.fit_transform(texts)
        scores = np.asarray(X.sum(axis=0)).ravel()
        terms = np.array(vectorizer.get_feature_names_out())
        
        keywords = [{"keyword": term, "score": float(score)} 
                   for term, score in zip(terms, scores)]
        keywords.sort(key=lambda x: x["score"], reverse=True)
        
        return {"data": keywords[:top_k]}
    except:
        return {"data": []}

@app.get("/api/geographic-data")
def get_geographic_data(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get document counts by country"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    # Filter out Unknown and empty values
    df = df[df["country"].notna()]
    df = df[df["country"] != "Unknown"]
    df = df[df["country"] != ""]
    
    geo = df.groupby("country").size().reset_index(name="count")
    geo = geo.sort_values("count", ascending=False)
    
    # Add ISO3 codes
    def to_iso3(name):
        try:
            return pycountry.countries.lookup(name).alpha_3
        except:
            return None
    
    geo["iso3"] = geo["country"].apply(to_iso3)
    
    return {
        "data": geo.to_dict(orient="records")
    }

@app.get("/api/topic-trends")
def get_topic_trends(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    period: str = Query("month")
):
    """Get topic frequency over time"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    time_col = "ym" if period == "month" else "quarter"
    
    if "topic" in df.columns:
        topic_counts = df.groupby([time_col, "topic"]).size().reset_index(name="count")
        top_topics = topic_counts.groupby("topic")["count"].sum().sort_values(ascending=False).head(10).index.tolist()
        filtered = topic_counts[topic_counts["topic"].isin(top_topics)]
        
        return {"data": filtered.to_dict(orient="records")}
    
    return {"data": []}

@app.post("/api/chat")
def chat_assistant(request: ChatRequest):
    """Intelligent AI assistant endpoint with natural language understanding"""
    global assistant, hybrid_assistant
    
    # Try hybrid assistant first, fallback to basic assistant
    active_assistant = hybrid_assistant if hybrid_assistant else assistant
    
    if active_assistant is None:
        return {"answer": "Assistant is initializing. Please try again in a moment."}
    
    try:
        # Use hybrid assistant if available
        if hybrid_assistant:
            result = hybrid_assistant.query(request.query, request.filters)
            
            return {
                "answer": result.get("answer", "I've analyzed the data for you."),
                "data": result.get("data"),
                "documents": result.get("documents", []),
                "chart_suggestion": result.get("metadata", {}).get("chart_suggestion"),
                "query_type": result.get("query_type", "general"),
                "source": result.get("metadata", {}).get("source", "hybrid"),
                "assistant_type": "hybrid_llm"
            }
        else:
            # Fallback to basic assistant
            result = assistant.natural_language_query(request.query)
            
            if "error" in result:
                return {"answer": f"I encountered an issue: {result['error']}"}
            
            # Format response
            answer = result.get("explanation", "I've analyzed the data for you.")
            
            return {
                "answer": answer,
                "data": result.get("data"),
                "chart_suggestion": result.get("chart_suggestion"),
                "query_type": result.get("query_type", "general"),
                "assistant_type": "basic"
            }
    
    except Exception as e:
        return {"answer": f"I apologize, but I encountered an error processing your question: {str(e)}"}

@app.get("/api/authority-sentiment")
def get_authority_sentiment(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    top_k: int = Query(10)
):
    """Get sentiment patterns by authority"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    # Filter out Unknown authorities
    df = df[df["authority"].notna()]
    df = df[df["authority"] != "Unknown"]
    df = df[df["authority"] != ""]
    
    # Get top authorities by document count
    top_authorities = df["authority"].value_counts().head(top_k).index.tolist()
    df_filtered = df[df["authority"].isin(top_authorities)]
    
    # Use existing sentiment column if available
    results = []
    
    if "sentiment" in df.columns:
        for authority in top_authorities:
            auth_df = df_filtered[df_filtered["authority"] == authority]
            sentiment_counts = auth_df["sentiment"].value_counts().to_dict()
            
            results.append({
                "authority": authority,
                "highlyNegative": sentiment_counts.get("highly negative", 0),
                "negative": sentiment_counts.get("negative", 0),
                "slightlyNegative": sentiment_counts.get("slightly negative", 0),
                "neutral": sentiment_counts.get("neutral", 0),
                "slightlyPositive": sentiment_counts.get("slightly positive", 0),
                "positive": sentiment_counts.get("positive", 0),
                "highlyPositive": sentiment_counts.get("highly positive", 0)
            })
    else:
        # Fallback to VADER
        sia = SentimentIntensityAnalyzer()
        for authority in top_authorities:
            auth_df = df_filtered[df_filtered["authority"] == authority]
            sentiments = {"highlyNegative": 0, "negative": 0, "slightlyNegative": 0, 
                         "neutral": 0, "slightlyPositive": 0, "positive": 0, "highlyPositive": 0}
            
            for text in auth_df["text"].head(100):
                if isinstance(text, str) and text:
                    comp = sia.polarity_scores(text).get("compound", 0.0)
                    if comp <= -0.6:
                        sentiments["highlyNegative"] += 1
                    elif comp <= -0.2:
                        sentiments["negative"] += 1
                    elif comp < 0:
                        sentiments["slightlyNegative"] += 1
                    elif comp == 0:
                        sentiments["neutral"] += 1
                    elif comp < 0.2:
                        sentiments["slightlyPositive"] += 1
                    elif comp < 0.6:
                        sentiments["positive"] += 1
                    else:
                        sentiments["highlyPositive"] += 1
            
            results.append({
                "authority": authority,
                **sentiments
            })
    
    return {"data": results}

@app.get("/api/authority-volume")
def get_authority_volume(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    top_k: int = Query(10)
):
    """Get document volume by authority"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    volume = df.groupby("authority").size().reset_index(name="documents")
    volume = volume.sort_values("documents", ascending=False).head(top_k)
    
    return {"data": volume.to_dict(orient="records")}

@app.get("/api/risk-levels")
def get_risk_levels(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    period: str = Query("month")
):
    """Get risk level progression over time"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    time_col = "ym" if period == "month" else "quarter"
    
    if "risk_level" in df.columns:
        risk_counts = df.groupby([time_col, "risk_level"]).size().reset_index(name="count")
        # Pivot to get risk levels as columns
        pivot = risk_counts.pivot(index=time_col, columns="risk_level", values="count").fillna(0)
        pivot = pivot.reset_index()
        pivot.columns.name = None
        
        # Rename time column to 'period' for consistency
        pivot.rename(columns={time_col: "period"}, inplace=True)
        
        # Ensure all risk level columns exist with proper naming
        risk_level_mapping = {
            "very low": "very low",
            "low": "low", 
            "medium": "medium",
            "high": "high"
        }
        
        for col in risk_level_mapping.values():
            if col not in pivot.columns:
                pivot[col] = 0
        
        return {"data": pivot.to_dict(orient="records")}
    
    return {"data": []}

@app.get("/api/authority-activity")
def get_authority_activity(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    top_k: int = Query(5),
    period: str = Query("month")
):
    """Get authority activity over time"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    time_col = "ym" if period == "month" else "quarter"
    
    # Get top authorities
    top_authorities = df["authority"].value_counts().head(top_k).index.tolist()
    df_filtered = df[df["authority"].isin(top_authorities)]
    
    # Group by time and authority
    activity = df_filtered.groupby([time_col, "authority"]).size().reset_index(name="count")
    
    # Pivot to get authorities as columns
    pivot = activity.pivot(index=time_col, columns="authority", values="count").fillna(0)
    pivot = pivot.reset_index()
    pivot.columns.name = None
    
    return {"data": pivot.to_dict(orient="records")}

@app.get("/api/document-types")
def get_document_types(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get document type distribution"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    if "document_type" in df.columns:
        df = df[df["document_type"].notna()]
        df = df[df["document_type"] != "Unknown"]
        df = df[df["document_type"] != ""]
        
        doc_types = df.groupby("document_type").size().reset_index(name="count")
        doc_types = doc_types.sort_values("count", ascending=False)
        
        return {"data": doc_types.to_dict(orient="records")}
    
    return {"data": []}

@app.get("/api/filters")
def get_filter_options():
    """Get available filter options"""
    df = load_data()
    
    return {
        "countries": sorted(df["country"].dropna().unique().tolist()),
        "topics": sorted(df["topic"].dropna().unique().tolist()) if "topic" in df.columns else [],
        "authorities": sorted(df["authority"].dropna().unique().tolist()),
        "date_range": {
            "min": df["date"].min().isoformat() if pd.notna(df["date"].min()) else None,
            "max": df["date"].max().isoformat() if pd.notna(df["date"].max()) else None
        }
    }

@app.get("/api/document-types")
def get_document_types(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get document type distribution"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    if "document_type" in df.columns:
        df = df[df["document_type"].notna()]
        df = df[df["document_type"] != "Unknown"]
        df = df[df["document_type"] != ""]
        
        doc_types = df.groupby("document_type").size().reset_index(name="count")
        doc_types = doc_types.sort_values("count", ascending=False)
        
        return {"data": doc_types.to_dict(orient="records")}
    
    return {"data": []}

@app.get("/api/risk-over-time")
def get_risk_over_time(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    period: str = Query("month")
):
    """Get risk level distribution over time"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    time_col = "ym" if period == "month" else "quarter"
    
    if "risk_level" in df.columns:
        risk_counts = df.groupby([time_col, "risk_level"]).size().reset_index(name="count")
        pivot = risk_counts.pivot(index=time_col, columns="risk_level", values="count").fillna(0)
        pivot = pivot.reset_index()
        pivot.columns.name = None
        pivot.rename(columns={time_col: "period"}, inplace=True)
        
        return {"data": pivot.to_dict(orient="records")}
    
    return {"data": []}

@app.get("/api/language-distribution")
def get_language_distribution(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get language distribution"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    if "language" in df.columns:
        df = df[df["language"].notna()]
        df = df[df["language"] != ""]
        
        lang_dist = df.groupby("language").size().reset_index(name="count")
        lang_dist = lang_dist.sort_values("count", ascending=False)
        
        return {"data": lang_dist.to_dict(orient="records")}
    
    return {"data": []}

@app.get("/api/status-distribution")
def get_status_distribution(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get document status distribution"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    if "status" in df.columns:
        df = df[df["status"].notna()]
        df = df[df["status"] != "Unknown"]
        df = df[df["status"] != ""]
        
        status_dist = df.groupby("status").size().reset_index(name="count")
        status_dist = status_dist.sort_values("count", ascending=False)
        
        return {"data": status_dist.to_dict(orient="records")}
    
    return {"data": []}

@app.get("/api/regional-comparison")
def get_regional_comparison(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get regional document volume comparison"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    if "region" in df.columns:
        df = df[df["region"].notna()]
        df = df[df["region"] != "Unknown"]
        df = df[df["region"] != ""]
        
        regional = df.groupby("region").size().reset_index(name="documents")
        regional = regional.sort_values("documents", ascending=False)
        
        return {"data": regional.to_dict(orient="records")}
    
    return {"data": []}

@app.get("/api/sentiment-risk-correlation")
def get_sentiment_risk_correlation(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get sentiment vs risk correlation data"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    if "sentiment_score" in df.columns and "risk_score" in df.columns:
        # Sample for performance
        df_sample = df[["sentiment_score", "risk_score", "title"]].dropna().sample(min(500, len(df)))
        
        return {"data": df_sample.to_dict(orient="records")}
    
    return {"data": []}

@app.get("/api/document-length-distribution")
def get_document_length_distribution(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get document length distribution"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    if "document_length" in df.columns:
        df = df[df["document_length"].notna()]
        
        # Create bins for document length
        bins = [0, 100, 200, 300, 400, 500, 1000, 5000, 10000]
        labels = ["0-100", "100-200", "200-300", "300-400", "400-500", "500-1K", "1K-5K", "5K+"]
        
        df["length_category"] = pd.cut(df["document_length"], bins=bins, labels=labels, include_lowest=True)
        length_dist = df.groupby("length_category", observed=True).size().reset_index(name="count")
        
        return {"data": length_dist.to_dict(orient="records")}
    
    return {"data": []}

@app.get("/api/confidence-metrics")
def get_confidence_metrics(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get confidence score metrics"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    if "confidence_score" in df.columns:
        df = df[df["confidence_score"].notna()]
        
        avg_confidence = float(df["confidence_score"].mean())
        min_confidence = float(df["confidence_score"].min())
        max_confidence = float(df["confidence_score"].max())
        
        # Distribution by ranges
        bins = [0, 0.5, 0.7, 0.85, 0.95, 1.0]
        labels = ["Low (0-0.5)", "Medium (0.5-0.7)", "Good (0.7-0.85)", "High (0.85-0.95)", "Excellent (0.95-1.0)"]
        
        df["confidence_category"] = pd.cut(df["confidence_score"], bins=bins, labels=labels, include_lowest=True)
        conf_dist = df.groupby("confidence_category", observed=True).size().reset_index(name="count")
        
        return {
            "average": round(avg_confidence, 3),
            "min": round(min_confidence, 3),
            "max": round(max_confidence, 3),
            "distribution": conf_dist.to_dict(orient="records")
        }
    
    return {"average": 0, "min": 0, "max": 0, "distribution": []}

@app.get("/api/topic-wordcloud")
def get_topic_wordcloud(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    top_k: int = Query(50)
):
    """Get topic and tags data for word cloud"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    words = []
    
    # Extract from topics
    if "topic" in df.columns:
        topics = df["topic"].dropna().tolist()
        for topic in topics:
            if isinstance(topic, str):
                words.extend(topic.split())
    
    # Extract from tags
    if "tags" in df.columns:
        tags = df["tags"].dropna().tolist()
        for tag in tags:
            if isinstance(tag, str):
                words.extend(tag.split(","))
    
    # Count word frequencies
    word_counts = pd.Series([w.strip().lower() for w in words if w.strip()]).value_counts().head(top_k)
    
    return {
        "data": [{"text": word, "value": int(count)} for word, count in word_counts.items()]
    }

@app.get("/api/authority-network")
def get_authority_network(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    top_k: int = Query(20)
):
    """Get authority-country network data"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    if "authority" in df.columns and "country" in df.columns:
        df = df[df["authority"].notna() & df["country"].notna()]
        df = df[(df["authority"] != "Unknown") & (df["country"] != "Unknown")]
        
        # Get top authorities
        top_authorities = df["authority"].value_counts().head(top_k).index.tolist()
        df_filtered = df[df["authority"].isin(top_authorities)]
        
        # Create network data
        network = df_filtered.groupby(["authority", "country"]).size().reset_index(name="documents")
        
        return {"data": network.to_dict(orient="records")}
    
    return {"data": []}

@app.get("/api/quarterly-comparison")
def get_quarterly_comparison(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get year-over-year quarterly comparison"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    if "year" in df.columns and "quarter" in df.columns:
        quarterly = df.groupby(["year", "quarter"]).size().reset_index(name="documents")
        
        return {"data": quarterly.to_dict(orient="records")}
    
    return {"data": []}

@app.get("/api/tags-trends")
def get_tags_trends(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    top_k: int = Query(15)
):
    """Get trending tags over time"""
    df = load_data().copy()
    
    if date_from:
        df = df[df["date"] >= pd.to_datetime(date_from)]
    if date_to:
        df = df[df["date"] <= pd.to_datetime(date_to)]
    
    if "tags" in df.columns and "ym" in df.columns:
        # Extract individual tags
        tag_data = []
        for _, row in df.iterrows():
            if pd.notna(row["tags"]) and isinstance(row["tags"], str):
                tags = [t.strip() for t in row["tags"].split(",")]
                for tag in tags[:3]:  # Take first 3 tags
                    if tag:
                        tag_data.append({"period": row["ym"], "tag": tag})
        
        if tag_data:
            tag_df = pd.DataFrame(tag_data)
            tag_counts = tag_df.groupby("tag").size().sort_values(ascending=False).head(top_k).index.tolist()
            
            # Filter to top tags and count by period
            filtered = tag_df[tag_df["tag"].isin(tag_counts)]
            trend_data = filtered.groupby(["period", "tag"]).size().reset_index(name="count")
            
            return {"data": trend_data.to_dict(orient="records")}
    
    return {"data": []}

@app.post("/api/intelligent-query")
def intelligent_query(request: Dict[str, Any]):
    """
    Execute intelligent queries with specific query types
    Supports: sentiment_by_country, top_authorities, document_trends, etc.
    """
    global assistant
    
    if assistant is None:
        return {"error": "Assistant not initialized"}
    
    query_type = request.get("query_type", "summary_stats")
    filters = request.get("filters", {})
    
    try:
        result = assistant.query_data(query_type, filters)
        return result
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/example-questions")
def get_example_questions():
    """Get example questions users can ask the Hybrid LLM Assistant"""
    return {
        "assistant_type": "hybrid_llm" if hybrid_assistant else "basic",
        "examples": [
            {
                "category": "📊 Analytical Queries (Pandas)",
                "description": "Statistical analysis and aggregations",
                "questions": [
                    "How many documents are in the dataset?",
                    "What's the average sentiment by country?",
                    "Compare US vs EU sentiment scores",
                    "Which authority publishes the most documents?",
                    "Show me document trends over time",
                    "What is the sentiment trend from 2023 to 2025?",
                    "Which regions have the highest document count?"
                ]
            },
            {
                "category": "📄 Document Retrieval (RAG)",
                "description": "Find and retrieve specific documents",
                "questions": [
                    "Show me documents about AI ethics",
                    "Find regulations from the European Commission",
                    "What documents discuss AI safety?",
                    "Retrieve documents with negative sentiment",
                    "Tell me about the National Defense Authorization Act",
                    "Show me documents about AI governance in the US",
                    "Find reports about AI risk assessment"
                ]
            },
            {
                "category": "🔄 Hybrid Queries (Both)",
                "description": "Combines analytics with document content",
                "questions": [
                    "Summarize US AI regulations and their sentiment",
                    "What are the main topics in high-risk documents?",
                    "Compare document content between US and EU",
                    "Analyze sentiment trends and show example documents",
                    "What do positive sentiment documents say about AI?",
                    "Show me statistics and documents about AI Act"
                ]
            },
            {
                "category": "🌍 Geographic Analysis",
                "description": "Country and regional comparisons",
                "questions": [
                    "Which countries are covered in the dataset?",
                    "Compare sentiment between US and China",
                    "What regions have the most positive outlook?",
                    "Show me European vs Asian AI regulations",
                    "Which country has the most documents?"
                ]
            },
            {
                "category": "🏢 Authority Analysis",
                "description": "Analyze regulatory authorities",
                "questions": [
                    "What authorities are in this dataset?",
                    "Which authority has the most negative outlook?",
                    "Compare US Congress vs European Commission",
                    "List top 5 authorities by document count"
                ]
            },
            {
                "category": "📈 Trend & Topic Analysis",
                "description": "Temporal patterns and themes",
                "questions": [
                    "What are the main topics discussed in 2024?",
                    "Show me how AI Safety was trending over time",
                    "What topics are associated with high-risk scores?",
                    "Which tags are most frequent?",
                    "How has AI regulation evolved over time?"
                ]
            },
            {
                "category": "⚠️ Risk Analysis",
                "description": "Risk level assessment",
                "questions": [
                    "What is the risk level distribution?",
                    "How many high-risk regulations exist?",
                    "Analyze risk patterns"
                ]
            },
            {
                "category": "🕐 Recent Activity",
                "description": "Latest documents and updates",
                "questions": [
                    "What's the latest activity?",
                    "Show me recent documents",
                    "What happened recently?",
                    "What are the newest regulations?"
                ]
            },
            {
                "category": "📋 Summary & Overview",
                "description": "Dataset overview and key statistics",
                "questions": [
                    "Give me an overview of the dataset",
                    "Summarize the key statistics",
                    "What are the main insights?",
                    "Provide a comprehensive summary"
                ]
            }
        ],
        "tips": [
            "💡 Ask specific questions for better results",
            "🔍 Use keywords like 'compare', 'show', 'analyze' for targeted queries",
            "📊 Analytical queries return statistics and charts",
            "📄 Document queries return actual regulation content",
            "🔄 Hybrid queries combine both approaches for comprehensive answers"
        ]
    }

@app.post("/api/generate-chart-insights")
async def generate_chart_insights(request: Dict[str, Any]):
    """
    Generate AI-powered insights for charts in the report
    """
    global hybrid_assistant
    
    try:
        chart_type = request.get("chart_type", "Chart")
        tab_name = request.get("tab_name", "")
        date_from = request.get("date_from")
        date_to = request.get("date_to")
        
        # Load relevant data
        df = load_data().copy()
        if date_from:
            df = df[df["date"] >= pd.to_datetime(date_from)]
        if date_to:
            df = df[df["date"] <= pd.to_datetime(date_to)]
        
        # Generate detailed context
        total_docs = len(df)
        countries = df["country"].nunique()
        authorities = df["authority"].nunique()
        date_range_str = f"from {date_from} to {date_to}" if date_from and date_to else "all time"
        
        # Get specific data based on chart type
        context_data = ""
        if "sentiment" in chart_type.lower():
            if "sentiment_score" in df.columns:
                avg_sentiment = df["sentiment_score"].mean()
                context_data = f"Average sentiment: {avg_sentiment:.3f}"
        elif "volume" in chart_type.lower() or "document" in chart_type.lower():
            recent_count = len(df[df["date"] >= pd.to_datetime(date_from) if date_from else df["date"].max() - pd.Timedelta(days=90)])
            context_data = f"Recent documents: {recent_count}"
        elif "authority" in chart_type.lower():
            top_auth = df["authority"].value_counts().head(3)
            context_data = f"Top authorities: {', '.join([f'{k} ({v})' for k, v in top_auth.items()])}"
        
        # Create detailed prompt for AI insights
        if hybrid_assistant and hybrid_assistant.llm:
            try:
                prompt = f"""You are a senior business analyst writing a professional report. Generate a detailed analysis for this chart.

CONTEXT:
Chart: {chart_type}
Section: {tab_name}
Period: {date_range_str}
Dataset: {total_docs:,} documents, {countries} countries, {authorities} authorities
Additional: {context_data}

INSTRUCTIONS:
Write a professional analysis following this EXACT structure. Do NOT use asterisks, bullet points, or markdown. Write in plain text paragraphs with proper capitalization and punctuation.

FORMAT:

Based on the {chart_type} chart covering {date_range_str}, analyzing {total_docs:,} documents across {countries} countries and {authorities} authorities, the following insights were identified:

Dominant Trends:
Write 2-3 complete sentences describing the main trend or pattern visible in the chart. Include specific percentages or numbers from the data. Explain what this trend indicates for stakeholders and why it matters.

Key Findings:
Write 2-3 complete sentences identifying notable observations, anomalies, or significant changes in the data. Reference specific time periods, categories, or data points. Explain the likely causes or business implications of these findings.

Comparative Analysis:
Write 2-3 complete sentences comparing different segments such as countries, time periods, or categories. Highlight any outliers or significant differences. Provide potential explanations such as policy changes, economic factors, or market dynamics.

Strategic Implications:
Write 2-3 complete sentences explaining how these insights can inform decision-making, risk management, and strategic planning. Provide specific, actionable recommendations for stakeholders to consider implementing.

CRITICAL RULES:
- NO asterisks (**), NO bullet points, NO markdown
- Write in complete sentences with proper grammar
- Start each section header with a capital letter and end with a colon
- Use professional business language
- Include specific numbers and data points
- Total length: 200-250 words
- Write as if for an executive audience

Generate the analysis now:"""

                if hasattr(hybrid_assistant, 'llm_type') and hybrid_assistant.llm_type == "native":
                    response = hybrid_assistant.llm.generate_content(prompt)
                    insights = response.text
                else:
                    response = hybrid_assistant.llm.invoke(prompt)
                    insights = response.content if hasattr(response, 'content') else str(response)
                
                return {
                    "insights": insights,
                    "source": "gemini_ai"
                }
            
            except Exception as e:
                # Detailed fallback insights with proper formatting
                return {
                    "insights": f"""Based on the {chart_type} chart covering {date_range_str}, analyzing {total_docs:,} documents across {countries} countries and {authorities} authorities, the following insights were identified:

Dominant Trends:
The analysis reveals consistent patterns in regulatory activity throughout the specified period. The dataset encompasses {total_docs:,} documents, providing a comprehensive view of AI regulation developments. This substantial volume indicates sustained interest and active engagement from regulatory bodies worldwide.

Key Findings:
Coverage spans {countries} distinct countries and {authorities} regulatory authorities, demonstrating the global nature of AI regulation efforts. {context_data}. The temporal distribution shows evolving regulatory approaches as jurisdictions adapt to emerging AI technologies and their societal implications.

Comparative Analysis:
Geographic distribution highlights varying levels of regulatory maturity across different regions. Some jurisdictions demonstrate more proactive approaches with higher document volumes, while others show emerging interest. These variations reflect different policy priorities, technological adoption rates, and governance frameworks.

Strategic Implications:
Organizations operating across multiple jurisdictions must maintain awareness of these regulatory developments to ensure compliance. The insights support informed decision-making regarding resource allocation for compliance monitoring, risk assessment, and strategic planning. Stakeholders should prioritize monitoring key jurisdictions and anticipate regulatory convergence trends.""",
                    "source": "fallback"
                }
        else:
            return {
                "insights": f"""**Analysis Period:** {date_range_str}
**Documents Analyzed:** {total_docs:,}
**Geographic Coverage:** {countries} countries
**Regulatory Bodies:** {authorities} authorities

This chart provides insights into AI regulation trends and patterns. For detailed AI-powered analysis, please configure your Gemini API key.""",
                "source": "basic"
            }
    
    except Exception as e:
        return {
            "insights": "Unable to generate insights at this time. Please try again.",
            "source": "error",
            "error": str(e)
        }

@app.post("/api/chat-with-document")
async def chat_with_document(request: Dict[str, Any]):
    """
    Chat with an uploaded document - answer questions about the document
    """
    global hybrid_assistant
    
    try:
        query = request.get("query", "")
        document = request.get("document", {})
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        if not document or not document.get("content"):
            raise HTTPException(status_code=400, detail="Document content is required")
        
        filename = document.get("filename", "document")
        doc_content = document.get("content", "")
        
        # Generate response using Gemini with document context
        if hybrid_assistant and hybrid_assistant.llm:
            try:
                prompt = f"""You are a professional AI Regulation & Compliance Assistant. Answer the user's question based on the uploaded document.

**Document:** {filename}

**Document Content:**
{doc_content[:20000]}

**User Question:** {query}

**Instructions:**
- Answer directly and professionally
- Cite specific sections from the document when relevant
- Use clear formatting with headings and bullet points
- If the answer isn't in the document, say so clearly

**Your Answer:**"""

                # Check if using native Gemini SDK or LangChain
                if hasattr(hybrid_assistant, 'llm_type') and hybrid_assistant.llm_type == "native":
                    response = hybrid_assistant.llm.generate_content(prompt)
                    answer = response.text
                else:
                    response = hybrid_assistant.llm.invoke(prompt)
                    answer = response.content if hasattr(response, 'content') else str(response)
                
                return {
                    "answer": answer,
                    "source": "gemini_ai",
                    "document": filename
                }
            
            except Exception as e:
                return {
                    "answer": f"I apologize, but I encountered an error processing your question: {str(e)}",
                    "source": "error"
                }
        else:
            return {
                "answer": "AI assistant is not available. Please check your API configuration.",
                "source": "unavailable"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

@app.post("/api/upload-document")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a legal/regulatory document and get AI-powered analysis
    Supports PDF, DOCX, and TXT files
    """
    global hybrid_assistant
    
    try:
        # Validate file type
        allowed_extensions = ['.pdf', '.docx', '.txt']
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type. Please upload PDF, DOCX, or TXT files."
            )
        
        # Read file content
        content = await file.read()
        
        # Extract text based on file type
        text_content = ""
        
        if file_ext == '.pdf':
            # Extract text from PDF
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                tmp_file.write(content)
                tmp_file_path = tmp_file.name
            
            try:
                with open(tmp_file_path, 'rb') as pdf_file:
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    for page in pdf_reader.pages:
                        text_content += page.extract_text() + "\n"
            finally:
                os.unlink(tmp_file_path)
        
        elif file_ext == '.docx':
            # Extract text from DOCX
            with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp_file:
                tmp_file.write(content)
                tmp_file_path = tmp_file.name
            
            try:
                doc = docx.Document(tmp_file_path)
                text_content = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            finally:
                os.unlink(tmp_file_path)
        
        elif file_ext == '.txt':
            # Read text file
            text_content = content.decode('utf-8', errors='ignore')
        
        # Limit text length for API
        max_chars = 30000  # Gemini has token limits
        if len(text_content) > max_chars:
            text_content = text_content[:max_chars] + "\n\n[Document truncated due to length...]"
        
        # Generate analysis using Gemini
        if hybrid_assistant and hybrid_assistant.llm:
            try:
                analysis_prompt = f"""You are a professional AI Regulation & Compliance Analyst. Analyze the following legal/regulatory document and provide a comprehensive, well-structured report.

**Document:** {file.filename}

**Analysis Requirements:**

# 📋 Executive Summary
Provide a 2-3 sentence overview of the document's purpose and significance.

# 🎯 Key Regulations & Guidelines
List the main regulatory requirements and compliance guidelines with specific references.

# ✅ Compliance Requirements
Detail specific actions, standards, or obligations that organizations must follow:
- Use bullet points for clarity
- Include specific requirements
- Note any deadlines or timelines

# ⚠️ Risk Assessment
Identify potential compliance risks and areas of concern:
- High-risk areas
- Common pitfalls
- Recommended mitigation strategies

# 🤖 Relevant AI/ML Technologies
List AI/ML technologies or systems mentioned:
- Facial recognition
- Computer vision
- Natural language processing
- Machine learning models
- Other relevant technologies

# 🌍 Geographic Scope
Specify jurisdictions, regions, or countries covered by this regulation.

# 💡 Key Takeaways
Provide 5-7 actionable bullet points summarizing the most critical information for compliance officers and AI developers.

---

**Document Content:**
{text_content}

---

**Provide your professional analysis below:**"""

                # Check if using native Gemini SDK or LangChain
                if hasattr(hybrid_assistant, 'llm_type') and hybrid_assistant.llm_type == "native":
                    # Native Google Generative AI SDK
                    response = hybrid_assistant.llm.generate_content(analysis_prompt)
                    analysis = response.text
                else:
                    # LangChain wrapper
                    response = hybrid_assistant.llm.invoke(analysis_prompt)
                    if hasattr(response, 'content'):
                        analysis = response.content
                    else:
                        analysis = str(response)
                
                return {
                    "success": True,
                    "filename": file.filename,
                    "file_type": file_ext,
                    "document_length": len(text_content),
                    "document_content": text_content,  # Return content for follow-up questions
                    "analysis": analysis,
                    "source": "gemini_ai",
                    "message": "Document analyzed successfully using Gemini AI"
                }
            
            except Exception as e:
                # Fallback to basic analysis
                return {
                    "success": True,
                    "filename": file.filename,
                    "file_type": file_ext,
                    "document_length": len(text_content),
                    "document_content": text_content,
                    "analysis": f"**Document Summary**\n\nFilename: {file.filename}\nType: {file_ext}\nLength: {len(text_content)} characters\n\n**Content Preview**:\n{text_content[:1000]}...\n\n*Note: AI analysis unavailable. Please check your API configuration.*",
                    "source": "basic",
                    "message": f"Document uploaded but AI analysis failed: {str(e)}"
                }
        else:
            # No LLM available - return basic info
            return {
                "success": True,
                "filename": file.filename,
                "file_type": file_ext,
                "document_length": len(text_content),
                "document_content": text_content,
                "analysis": f"**Document Uploaded**\n\nFilename: {file.filename}\nType: {file_ext}\nLength: {len(text_content)} characters\n\n**Content Preview**:\n{text_content[:1000]}...\n\n*Note: AI analysis requires Gemini API key. Please configure your API key to enable intelligent document analysis.*",
                "source": "basic",
                "message": "Document uploaded successfully (AI analysis unavailable)"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
