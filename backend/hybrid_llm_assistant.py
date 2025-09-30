"""
Hybrid LLM Assistant - Combines RAG (document retrieval) with Pandas analytics
Provides intelligent querying of both structured data and document content
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
import os
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# LangChain imports
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.docstore.document import Document
from langchain.prompts import PromptTemplate

# Optional: LLM providers
# Try native SDK first (more reliable)
GEMINI_AVAILABLE = False
GEMINI_LANGCHAIN = False
genai = None

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
    GEMINI_LANGCHAIN = False
    print("📦 Using native Google Generative AI SDK")
except ImportError:
    # Try langchain version as fallback
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        GEMINI_AVAILABLE = True
        GEMINI_LANGCHAIN = True
        print("📦 Using LangChain Google Generative AI wrapper")
    except ImportError:
        print("⚠️  No Gemini SDK found")

try:
    from langchain_openai import ChatOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class HybridLLMAssistant:
    """
    Hybrid AI Assistant combining:
    1. RAG (Retrieval-Augmented Generation) for document-level queries
    2. Pandas/SQL analytics for structured data queries
    3. LLM-powered natural language understanding and response generation
    """
    
    def __init__(self, data_path: str, llm_provider: Optional[str] = None):
        """
        Initialize the hybrid assistant
        
        Args:
            data_path: Path to the CSV dataset
            llm_provider: LLM provider to use ('gemini', 'openai', 'none', or None for auto-detect)
        """
        print("🚀 Initializing Hybrid LLM Assistant...")
        
        # Load dataset
        self.df = pd.read_csv(data_path)
        self.df["date"] = pd.to_datetime(self.df["date"], errors="coerce")
        self._preprocess_data()
        
        # Initialize embeddings (using free HuggingFace model)
        print("📊 Loading embedding model...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'}
        )
        
        # Initialize LLM (Gemini → OpenAI → Rule-based fallback)
        self.llm = None
        self.llm_provider = llm_provider or os.getenv("LLM_PROVIDER", "gemini")
        
        if self.llm_provider == "gemini":
            self._init_gemini()
        elif self.llm_provider == "openai":
            self._init_openai()
        elif self.llm_provider == "none":
            print("🤖 Using rule-based responses (no LLM)")
        else:
            # Auto-detect: try Gemini first, then OpenAI, then fallback
            if not self._init_gemini():
                if not self._init_openai():
                    print("🤖 Using rule-based fallback (no LLM API keys found)")
        
        # Build vector store for RAG
        self.vector_store = None
        self._build_vector_store()
        
        print("✅ Hybrid LLM Assistant initialized successfully!")
    
    def _init_gemini(self) -> bool:
        """Initialize Google Gemini LLM"""
        gemini_key = os.getenv("GEMINI_API_KEY")
        if GEMINI_AVAILABLE and gemini_key:
            try:
                if GEMINI_LANGCHAIN:
                    # Use LangChain wrapper (old method)
                    from langchain_google_genai import ChatGoogleGenerativeAI
                    model_names = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]
                    
                    for model_name in model_names:
                        try:
                            print(f"🤖 Trying Google Gemini ({model_name})...")
                            self.llm = ChatGoogleGenerativeAI(
                                model=model_name,
                                temperature=0.7,
                                google_api_key=gemini_key
                            )
                            test_response = self.llm.invoke("Hello")
                            print(f"✅ Using Google Gemini ({model_name})")
                            self.llm_provider = "gemini"
                            return True
                        except Exception as e:
                            print(f"⚠️  {model_name} failed: {str(e)[:100]}")
                            continue
                else:
                    # Use native Google Generative AI SDK (better compatibility)
                    genai.configure(api_key=gemini_key)
                    # Use correct model names with models/ prefix
                    model_names = ["models/gemini-2.0-flash", "models/gemini-pro-latest", "models/gemini-flash-latest"]
                    
                    for model_name in model_names:
                        try:
                            print(f"🤖 Trying Google Gemini ({model_name})...")
                            self.llm = genai.GenerativeModel(model_name)
                            # Test with a simple prompt
                            test_response = self.llm.generate_content("Say hello")
                            if test_response and test_response.text:
                                print(f"✅ Using Google Gemini ({model_name})")
                                self.llm_provider = "gemini"
                                self.llm_type = "native"  # Mark as native SDK
                                return True
                        except Exception as e:
                            print(f"⚠️  {model_name} failed: {str(e)[:100]}")
                            continue
                
                print("⚠️  All Gemini models failed")
                return False
            except Exception as e:
                print(f"⚠️  Gemini initialization failed: {e}")
        return False
    
    def _init_openai(self) -> bool:
        """Initialize OpenAI LLM"""
        openai_key = os.getenv("OPENAI_API_KEY")
        if OPENAI_AVAILABLE and openai_key:
            try:
                print("🤖 Using OpenAI GPT (gpt-3.5-turbo)...")
                self.llm = ChatOpenAI(
                    model="gpt-3.5-turbo",
                    temperature=0.7,
                    openai_api_key=openai_key
                )
                self.llm_provider = "openai"
                return True
            except Exception as e:
                print(f"⚠️  OpenAI initialization failed: {e}")
        return False
    
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
        
        # Create combined text field for RAG
        self.df["full_text"] = self.df.apply(
            lambda row: f"Title: {row.get('title', '')}\n"
                       f"Authority: {row.get('authority', '')}\n"
                       f"Country: {row.get('country', '')}\n"
                       f"Date: {row.get('date', '')}\n"
                       f"Topic: {row.get('topic', '')}\n"
                       f"Content: {row.get('content', '')}\n"
                       f"Sentiment: {row.get('sentiment', '')} (Score: {row.get('sentiment_score', 'N/A')})\n"
                       f"Risk Level: {row.get('risk_level', '')}",
            axis=1
        )
    
    def _build_vector_store(self):
        """Build FAISS vector store for document retrieval"""
        print("🔨 Building vector store for RAG...")
        
        # Create documents from dataset
        documents = []
        for idx, row in self.df.iterrows():
            # Create metadata
            metadata = {
                "id": str(row.get("id", idx)),
                "title": str(row.get("title", ""))[:200],
                "authority": str(row.get("authority", "")),
                "country": str(row.get("country", "")),
                "date": str(row.get("date", "")),
                "sentiment": str(row.get("sentiment", "")),
                "sentiment_score": float(row.get("sentiment_score", 0.0)),
                "risk_level": str(row.get("risk_level", "")),
                "topic": str(row.get("topic", ""))
            }
            
            # Create document
            doc = Document(
                page_content=row["full_text"],
                metadata=metadata
            )
            documents.append(doc)
        
        # Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        split_docs = text_splitter.split_documents(documents)
        
        print(f"📄 Created {len(split_docs)} document chunks from {len(documents)} documents")
        
        # Create vector store
        self.vector_store = FAISS.from_documents(split_docs, self.embeddings)
        
        print("✅ Vector store built successfully!")
    
    def _classify_query_type(self, query: str) -> str:
        """
        Classify the query type to route to appropriate handler
        
        Returns:
            'analytical' - for structured data queries (counts, averages, comparisons)
            'document' - for document content queries (summaries, specific documents)
            'hybrid' - for queries requiring both
        """
        query_lower = query.lower()
        
        # Analytical keywords
        analytical_keywords = [
            "how many", "count", "average", "mean", "total", "sum", "compare",
            "trend", "over time", "statistics", "percentage", "distribution",
            "top", "most", "least", "highest", "lowest", "growth", "change"
        ]
        
        # Document keywords
        document_keywords = [
            "content", "summary", "summarize", "what does", "explain", "describe",
            "tell me about", "show me", "find documents", "retrieve", "read",
            "details", "information about", "specific"
        ]
        
        analytical_score = sum(1 for kw in analytical_keywords if kw in query_lower)
        document_score = sum(1 for kw in document_keywords if kw in query_lower)
        
        if analytical_score > document_score:
            return "analytical"
        elif document_score > analytical_score:
            return "document"
        else:
            return "hybrid"
    
    def _execute_pandas_query(self, query: str, filters: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Execute analytical queries using Pandas
        
        Args:
            query: Natural language query
            filters: Optional filters to apply
        
        Returns:
            Query results with explanation
        """
        df = self.df.copy()
        query_lower = query.lower()
        
        # Apply filters
        if filters:
            if filters.get('date_from'):
                df = df[df["date"] >= pd.to_datetime(filters['date_from'])]
            if filters.get('date_to'):
                df = df[df["date"] <= pd.to_datetime(filters['date_to'])]
            if filters.get('country'):
                df = df[df["country"].str.contains(filters['country'], case=False, na=False)]
            if filters.get('region'):
                df = df[df["region"].str.contains(filters['region'], case=False, na=False)]
        
        # Route to specific analytical query
        if any(word in query_lower for word in ["sentiment", "positive", "negative"]):
            if any(word in query_lower for word in ["country", "countries"]):
                return self._sentiment_by_country(df)
            elif any(word in query_lower for word in ["region", "regional"]):
                return self._sentiment_by_region(df)
            elif any(word in query_lower for word in ["trend", "over time"]):
                return self._sentiment_trend(df)
        
        if any(word in query_lower for word in ["compare", "vs", "versus"]):
            if "us" in query_lower and ("eu" in query_lower or "europe" in query_lower):
                return self._compare_entities(df, "United States", "Europe", "country")
            elif "region" in query_lower:
                return self._sentiment_by_region(df)
        
        if any(word in query_lower for word in ["authority", "authorities"]):
            return self._top_authorities(df)
        
        if any(word in query_lower for word in ["trend", "over time", "growth"]):
            return self._document_trends(df)
        
        if any(word in query_lower for word in ["risk", "danger"]):
            return self._risk_analysis(df)
        
        if any(word in query_lower for word in ["topic", "theme"]):
            return self._topic_analysis(df)
        
        # Default: summary statistics
        return self._summary_stats(df)
    
    def _retrieve_documents(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieve relevant documents using RAG
        
        Args:
            query: User query
            k: Number of documents to retrieve
        
        Returns:
            List of relevant documents with metadata
        """
        if not self.vector_store:
            return []
        
        # Retrieve similar documents
        docs = self.vector_store.similarity_search(query, k=k)
        
        # Format results
        results = []
        for doc in docs:
            results.append({
                "content": doc.page_content[:500] + "..." if len(doc.page_content) > 500 else doc.page_content,
                "metadata": doc.metadata,
                "title": doc.metadata.get("title", "Untitled"),
                "authority": doc.metadata.get("authority", "Unknown"),
                "country": doc.metadata.get("country", "Unknown"),
                "date": doc.metadata.get("date", "Unknown"),
                "sentiment": doc.metadata.get("sentiment", "Unknown"),
                "topic": doc.metadata.get("topic", "Unknown")
            })
        
        return results
    
    def _generate_llm_response(self, query: str, context: str, data_summary: Optional[Dict] = None) -> str:
        """
        Generate natural language response using LLM
        
        Args:
            query: User query
            context: Retrieved context (documents or data)
            data_summary: Optional summary of analytical data
        
        Returns:
            Natural language response
        """
        if not self.llm:
            # Fallback to rule-based response
            return self._generate_rule_based_response(query, context, data_summary)
        
        try:
            # Create prompt text
            data_summary_text = ""
            if data_summary:
                data_summary_text = f"Data Summary:\n{json.dumps(data_summary, indent=2)}"
            
            prompt_text = f"""You are XISS, a professional AI Regulation Analytics Assistant. Provide clear, well-structured responses using proper formatting.

**Instructions:**
- Use clear headings and bullet points
- Cite specific documents when referencing information
- Provide actionable insights
- Use professional language
- Format your response with proper structure

**Context:**
{context}

{data_summary_text}

**User Question:** {query}

**Your Response:**"""
            
            # Check if using native Gemini SDK or LangChain
            if hasattr(self, 'llm_type') and self.llm_type == "native":
                # Native Google Generative AI SDK
                response = self.llm.generate_content(prompt_text)
                return response.text
            else:
                # LangChain wrapper
                prompt = PromptTemplate(
                    template=prompt_text,
                    input_variables=[]
                )
                chain = prompt | self.llm
                response = chain.invoke({})
                
                # Extract text content from response
                if hasattr(response, 'content'):
                    return response.content
                else:
                    return str(response)
            
        except Exception as e:
            print(f"⚠️  LLM response generation failed: {e}")
            return self._generate_rule_based_response(query, context, data_summary)
    
    def _generate_rule_based_response(self, query: str, context: str, data_summary: Optional[Dict] = None) -> str:
        """Generate response without LLM API (fallback)"""
        response = f"Based on the AI regulation dataset:\n\n"
        
        if data_summary:
            if "explanation" in data_summary:
                response += data_summary["explanation"] + "\n\n"
            if "data" in data_summary:
                response += "Key findings:\n"
                data = data_summary["data"]
                if isinstance(data, dict):
                    for key, value in list(data.items())[:5]:
                        response += f"• {key}: {value}\n"
        
        if context and len(context) > 0:
            response += f"\nRelevant context:\n{context[:500]}..."
        
        return response
    
    def query(self, user_query: str, filters: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Main query interface - routes to appropriate handler
        
        Args:
            user_query: Natural language query from user
            filters: Optional filters (date range, country, etc.)
        
        Returns:
            Response with answer, data, and metadata
        """
        print(f"🔍 Processing query: {user_query}")
        
        # Classify query type
        query_type = self._classify_query_type(user_query)
        print(f"📋 Query type: {query_type}")
        
        response = {
            "query": user_query,
            "query_type": query_type,
            "answer": "",
            "data": None,
            "documents": [],
            "metadata": {}
        }
        
        try:
            if query_type == "analytical":
                # Execute Pandas query
                result = self._execute_pandas_query(user_query, filters)
                response["data"] = result.get("data")
                response["answer"] = result.get("explanation", "")
                response["metadata"] = {
                    "chart_suggestion": result.get("chart_suggestion"),
                    "source": "pandas_analytics"
                }
            
            elif query_type == "document":
                # Execute RAG query
                docs = self._retrieve_documents(user_query, k=5)
                response["documents"] = docs
                
                # Generate answer from documents
                context = "\n\n".join([f"Document {i+1}:\n{doc['content']}" for i, doc in enumerate(docs)])
                response["answer"] = self._generate_llm_response(user_query, context)
                response["metadata"] = {
                    "num_documents": len(docs),
                    "source": "rag_retrieval"
                }
            
            else:  # hybrid
                # Execute both analytical and document retrieval
                analytical_result = self._execute_pandas_query(user_query, filters)
                docs = self._retrieve_documents(user_query, k=3)
                
                response["data"] = analytical_result.get("data")
                response["documents"] = docs
                
                # Combine context
                context = f"Analytical Summary:\n{analytical_result.get('explanation', '')}\n\n"
                context += "Relevant Documents:\n" + "\n".join([f"• {doc['title']}" for doc in docs])
                
                response["answer"] = self._generate_llm_response(
                    user_query, 
                    context, 
                    analytical_result
                )
                response["metadata"] = {
                    "chart_suggestion": analytical_result.get("chart_suggestion"),
                    "num_documents": len(docs),
                    "source": "hybrid"
                }
        
        except Exception as e:
            print(f"❌ Error processing query: {e}")
            response["answer"] = f"I encountered an error processing your query: {str(e)}"
            response["metadata"]["error"] = str(e)
        
        return response
    
    # Analytical query methods (from original assistant)
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
                     f"with an average score of {top_sentiment:.3f}. "
        
        if len(sentiment_by_country) > 1:
            bottom_country = sentiment_by_country.index[-1]
            bottom_sentiment = sentiment_by_country.iloc[-1]["avg_sentiment"]
            explanation += f"{bottom_country} has the lowest sentiment at {bottom_sentiment:.3f}."
        
        return {
            "data": sentiment_by_country.head(10).to_dict(),
            "explanation": explanation,
            "chart_suggestion": "bar_chart"
        }
    
    def _sentiment_by_region(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze sentiment by region"""
        if "sentiment_score" not in df.columns or "region" not in df.columns:
            return {"error": "Required data not available"}
        
        sentiment_by_region = df.groupby("region").agg({
            "sentiment_score": "mean",
            "id": "count"
        }).round(3)
        sentiment_by_region.columns = ["avg_sentiment", "document_count"]
        sentiment_by_region = sentiment_by_region.sort_values("avg_sentiment", ascending=False)
        
        explanation = "Regional sentiment analysis:\n"
        for region, row in sentiment_by_region.iterrows():
            explanation += f"• {region}: {row['avg_sentiment']:.3f} ({int(row['document_count'])} docs)\n"
        
        return {
            "data": sentiment_by_region.to_dict(),
            "explanation": explanation,
            "chart_suggestion": "bar_chart"
        }
    
    def _sentiment_trend(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze sentiment trends over time"""
        if "sentiment_score" not in df.columns:
            return {"error": "Sentiment data not available"}
        
        df["year_month"] = df["date"].dt.to_period("M").astype(str)
        trend = df.groupby("year_month")["sentiment_score"].mean().round(3)
        
        explanation = f"Sentiment trend over {len(trend)} time periods. "
        if len(trend) > 1:
            recent_avg = trend.tail(3).mean()
            older_avg = trend.head(3).mean()
            change = recent_avg - older_avg
            explanation += f"Recent sentiment ({recent_avg:.3f}) vs earlier ({older_avg:.3f}): "
            explanation += f"{'increased' if change > 0 else 'decreased'} by {abs(change):.3f}."
        
        return {
            "data": trend.to_dict(),
            "explanation": explanation,
            "chart_suggestion": "line_chart"
        }
    
    def _top_authorities(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Find most active authorities"""
        top_auth = df["authority"].value_counts().head(10)
        
        explanation = f"Top authorities by document count:\n"
        for auth, count in top_auth.head(5).items():
            explanation += f"• {auth}: {count} documents\n"
        
        return {
            "data": top_auth.to_dict(),
            "explanation": explanation,
            "chart_suggestion": "horizontal_bar"
        }
    
    def _document_trends(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze document volume trends"""
        df["year_month"] = df["date"].dt.to_period("M").astype(str)
        trends = df.groupby("year_month").size()
        
        max_month = trends.idxmax()
        max_count = trends.max()
        avg = trends.mean()
        
        explanation = f"Document volume trends: Peak in {max_month} with {max_count} documents. "
        explanation += f"Average: {avg:.0f} documents per month."
        
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
        
        explanation = "Risk distribution:\n"
        for level, count in risk_dist.items():
            pct = (count / total * 100)
            explanation += f"• {level}: {pct:.1f}% ({count} docs)\n"
        
        return {
            "data": risk_dist.to_dict(),
            "explanation": explanation,
            "chart_suggestion": "pie_chart"
        }
    
    def _topic_analysis(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze topics"""
        topics = df["topic"].value_counts().head(10)
        
        explanation = f"Top topics:\n"
        for topic, count in topics.head(5).items():
            explanation += f"• {topic}: {count} documents\n"
        
        return {
            "data": topics.to_dict(),
            "explanation": explanation,
            "chart_suggestion": "bar_chart"
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
        
        explanation = f"Dataset overview: {stats['total_documents']} documents from {stats['countries']} countries "
        explanation += f"and {stats['authorities']} authorities."
        
        return {
            "data": stats,
            "explanation": explanation,
            "chart_suggestion": "kpi_cards"
        }
    
    def _compare_entities(self, df: pd.DataFrame, entity1: str, entity2: str, entity_type: str) -> Dict[str, Any]:
        """Compare two entities"""
        df1 = df[df[entity_type].str.contains(entity1, case=False, na=False)]
        df2 = df[df[entity_type].str.contains(entity2, case=False, na=False)]
        
        comparison = {
            entity1: {
                "documents": len(df1),
                "avg_sentiment": round(df1["sentiment_score"].mean(), 3) if "sentiment_score" in df1.columns else None
            },
            entity2: {
                "documents": len(df2),
                "avg_sentiment": round(df2["sentiment_score"].mean(), 3) if "sentiment_score" in df2.columns else None
            }
        }
        
        explanation = f"Comparison: {entity1} ({comparison[entity1]['documents']} docs, "
        explanation += f"sentiment: {comparison[entity1]['avg_sentiment']}) vs "
        explanation += f"{entity2} ({comparison[entity2]['documents']} docs, "
        explanation += f"sentiment: {comparison[entity2]['avg_sentiment']})"
        
        return {
            "data": comparison,
            "explanation": explanation,
            "chart_suggestion": "grouped_bar"
        }
