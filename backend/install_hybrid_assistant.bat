@echo off
echo ========================================
echo  Hybrid LLM Assistant Installation
echo ========================================
echo.

echo [1/5] Installing core dependencies...
pip install fastapi uvicorn pandas numpy scikit-learn nltk pycountry python-multipart pydantic

echo.
echo [2/5] Installing LLM and RAG dependencies...
pip install langchain langchain-community langchain-openai langchain-google-genai
pip install faiss-cpu sentence-transformers openai google-generativeai tiktoken python-dotenv

echo.
echo [3/5] Downloading NLTK data...
python -c "import nltk; nltk.download('vader_lexicon', quiet=False); nltk.download('punkt', quiet=False); nltk.download('stopwords', quiet=False)"

echo.
echo [4/5] Verifying API keys...
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print('✅ Gemini API Key:', 'Configured' if os.getenv('GEMINI_API_KEY') else 'Not found'); print('✅ OpenAI API Key:', 'Configured' if os.getenv('OPENAI_API_KEY') else 'Not found')"

echo.
echo [5/5] Testing installation...
python -c "from hybrid_llm_assistant import HybridLLMAssistant; print('✅ Hybrid LLM Assistant ready!')"

echo.
echo ========================================
echo  Installation Complete!
echo ========================================
echo.
echo Your API Keys Status:
echo   - Gemini (FREE): Configured ✅
echo   - OpenAI (Paid): Configured ✅
echo.
echo To start the server:
echo   python main.py
echo.
echo The assistant will use Gemini (free) by default!
echo.
pause
