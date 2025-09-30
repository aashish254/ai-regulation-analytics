'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Minimize2, Maximize2, Bot, User, RotateCcw, Upload, FileText, Maximize } from 'lucide-react';
import axios from 'axios';

// Enhanced markdown formatter
const formatMessage = (text: string) => {
  const lines = text.split('\n');
  const formatted: JSX.Element[] = [];
  
  const parseInlineFormatting = (text: string) => {
    const parts: (string | JSX.Element)[] = [];
    let currentIndex = 0;
    let partKey = 0;
    
    // Match **bold** text
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(text.substring(currentIndex, match.index));
      }
      // Add bold text
      parts.push(<strong key={`bold-${partKey++}`} className="font-semibold text-gray-900 dark:text-white">{match[1]}</strong>);
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex));
    }
    
    return parts.length > 0 ? parts : [text];
  };
  
  lines.forEach((line, idx) => {
    const trimmedLine = line.trim();
    
    // Headers
    if (line.startsWith('# ')) {
      const headerText = line.substring(2);
      formatted.push(
        <h3 key={idx} className="text-lg font-bold mt-4 mb-2 text-gray-900 dark:text-white">
          {parseInlineFormatting(headerText)}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      const headerText = line.substring(3);
      formatted.push(
        <h4 key={idx} className="text-base font-semibold mt-3 mb-2 text-gray-900 dark:text-white">
          {parseInlineFormatting(headerText)}
        </h4>
      );
    } else if (line.startsWith('### ')) {
      const headerText = line.substring(4);
      formatted.push(
        <h5 key={idx} className="text-sm font-semibold mt-2 mb-1 text-gray-900 dark:text-white">
          {parseInlineFormatting(headerText)}
        </h5>
      );
    }
    // Bullet points
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ') || trimmedLine.startsWith('* ')) {
      const bulletText = trimmedLine.substring(2);
      formatted.push(
        <li key={idx} className="ml-4 mb-1 text-gray-700 dark:text-gray-300">
          {parseInlineFormatting(bulletText)}
        </li>
      );
    }
    // Horizontal rule
    else if (trimmedLine === '---') {
      formatted.push(<hr key={idx} className="my-3 border-gray-300 dark:border-gray-600" />);
    }
    // Section headers (lines ending with colon)
    else if (trimmedLine.endsWith(':') && trimmedLine.length < 100 && !trimmedLine.includes('.')) {
      formatted.push(
        <p key={idx} className="font-semibold mt-3 mb-1 text-gray-900 dark:text-white">
          {parseInlineFormatting(trimmedLine)}
        </p>
      );
    }
    // Regular text with inline formatting
    else if (trimmedLine) {
      formatted.push(
        <p key={idx} className="mb-2 text-gray-700 dark:text-gray-300 leading-relaxed">
          {parseInlineFormatting(line)}
        </p>
      );
    }
    // Empty line
    else {
      formatted.push(<div key={idx} className="h-2" />);
    }
  });
  
  return <div className="space-y-1">{formatted}</div>;
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UploadedDocument {
  filename: string;
  content: string;
  analysis: string;
}

interface ProfessionalAssistantProps {
  apiUrl?: string;
}

export default function ProfessionalAssistant({ apiUrl = 'http://localhost:8000' }: ProfessionalAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exampleQuestions, setExampleQuestions] = useState<string[]>([]);
  const [datasetInfo, setDatasetInfo] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<UploadedDocument | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    // Load dataset info and example questions when component mounts
    const loadDatasetInfo = async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/overview`);
        setDatasetInfo(response.data);
        
        // Create welcome message with actual data
        const totalDocs = response.data.total_documents || 0;
        const countries = response.data.num_countries || 0;
        const authorities = response.data.num_authorities || 0;
        const dateRange = response.data.date_range;
        
        const welcomeMessage: Message = {
          role: 'assistant',
          content: `Welcome to the AI Regulation Analytics Dashboard! I've loaded ${totalDocs.toLocaleString()} regulatory documents for analysis. Feel free to ask me about trends, sentiment patterns, or specific authorities.\n\nDataset contains ${totalDocs.toLocaleString()} documents from ${countries} countries and ${authorities} authorities. Data spans from ${dateRange?.min?.split('T')[0] || 'N/A'} to ${dateRange?.max?.split('T')[0] || 'N/A'}.\n\n💡 You can also upload your own legal documents (PDF, DOCX, TXT) for AI-powered compliance analysis!`,
          timestamp: new Date()
        };
        
        setMessages([welcomeMessage]);
      } catch (error) {
        console.error('Failed to load dataset info:', error);
        // Fallback welcome message
        const fallbackMessage: Message = {
          role: 'assistant',
          content: "Hello! I'm XISS, your AI Regulation Analytics Assistant. I can help you analyze regulatory documents, sentiment patterns, and trends. Try asking: \"How many documents are in the dataset?\" or \"Compare US vs EU sentiment\"\n\n💡 You can also upload your own legal documents (PDF, DOCX, TXT) for AI-powered compliance analysis!",
          timestamp: new Date()
        };
        setMessages([fallbackMessage]);
      }
    };
    
    const loadExamples = async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/example-questions`);
        if (response.data.examples) {
          // Flatten all questions from all categories
          const allQuestions = response.data.examples.flatMap((cat: any) => cat.questions);
          // Pick 3 random questions
          const randomQuestions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 3);
          setExampleQuestions(randomQuestions);
        }
      } catch (error) {
        console.error('Failed to load example questions:', error);
      }
    };
    
    loadDatasetInfo();
    loadExamples();
  }, [apiUrl]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      // If there's an uploaded document, send query with document context
      if (uploadedDocument) {
        const response = await axios.post(`${apiUrl}/api/chat-with-document`, {
          query: currentQuery,
          document: {
            filename: uploadedDocument.filename,
            content: uploadedDocument.content
          }
        });

        const assistantMessage: Message = {
          role: 'assistant',
          content: response.data.answer || 'I apologize, but I couldn\'t process your request. Please try again.',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Regular chat without document
        const response = await axios.post(`${apiUrl}/api/chat`, {
          query: currentQuery,
          filters: {}
        });

        const assistantMessage: Message = {
          role: 'assistant',
          content: response.data.answer || 'I apologize, but I couldn\'t process your request. Please try again.',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I\'m having trouble connecting to the server. Please make sure the backend is running and try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    // Automatically send the question
    setTimeout(() => handleSend(), 100);
  };

  const handleNewChat = () => {
    // Reset conversation and clear uploaded document
    setMessages([]);
    setInputValue('');
    setUploadedDocument(null);
    // Reload dataset info and welcome message
    const loadDatasetInfo = async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/overview`);
        const totalDocs = response.data.total_documents || 0;
        const countries = response.data.num_countries || 0;
        const authorities = response.data.num_authorities || 0;
        const dateRange = response.data.date_range;
        
        const welcomeMessage: Message = {
          role: 'assistant',
          content: `Welcome to the AI Regulation Analytics Dashboard! I've loaded ${totalDocs.toLocaleString()} regulatory documents for analysis. Feel free to ask me about trends, sentiment patterns, or specific authorities.\n\nDataset contains ${totalDocs.toLocaleString()} documents from ${countries} countries and ${authorities} authorities. Data spans from ${dateRange?.min?.split('T')[0] || 'N/A'} to ${dateRange?.max?.split('T')[0] || 'N/A'}.\n\n💡 You can also upload your own legal documents (PDF, DOCX, TXT) for AI-powered compliance analysis!`,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      } catch (error) {
        const fallbackMessage: Message = {
          role: 'assistant',
          content: "Hello! I'm XISS, your AI Regulation Analytics Assistant. I can help you analyze regulatory documents, sentiment patterns, and trends.\n\n💡 You can also upload your own legal documents (PDF, DOCX, TXT) for AI-powered compliance analysis!",
          timestamp: new Date()
        };
        setMessages([fallbackMessage]);
      }
    };
    loadDatasetInfo();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['.pdf', '.docx', '.txt'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ Unsupported file type. Please upload PDF, DOCX, or TXT files.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Show file uploaded message
    const userMessage: Message = {
      role: 'user',
      content: `📄 Uploaded document: ${file.name}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    setIsUploading(true);
    setShowUploadModal(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${apiUrl}/api/upload-document`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Store the uploaded document for context (without showing full analysis yet)
      setUploadedDocument({
        filename: file.name,
        content: response.data.document_content || '',
        analysis: response.data.analysis || ''
      });

      // Ask user what they want to know
      const assistantMessage: Message = {
        role: 'assistant',
        content: `✅ **Document uploaded successfully!**\n\n📄 ${file.name}\n\n💬 **What would you like to know about this document?**\n\nYou can ask me to:\n• Summarize the document\n• Extract key points\n• Find specific information\n• Analyze compliance requirements\n• Or ask any specific question!`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Error uploading document: ${error.response?.data?.detail || error.message || 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-teal-600 hover:bg-teal-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 z-50 flex items-center gap-2"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="font-medium">Ask XISS</span>
      </button>
    );
  }

  return (
    <div className={`fixed ${isFullscreen ? 'inset-0' : isMinimized ? 'bottom-6 right-6' : 'bottom-6 right-6'} z-50 transition-all`}>
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-teal-600 hover:bg-teal-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 flex items-center gap-2"
        >
          <Bot className="w-6 h-6" />
          <span className="font-medium">XISS AI Assistant</span>
        </button>
      ) : (
        <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 ${isFullscreen ? 'w-full h-full rounded-none' : 'w-96 h-[600px]'} flex flex-col overflow-hidden`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">XISS AI Assistant</h3>
                <p className="text-teal-100 text-xs">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-white/80 hover:text-white transition-colors p-1"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
              {!isFullscreen && (
                <button
                  onClick={() => setIsMinimized(true)}
                  className="text-white/80 hover:text-white transition-colors p-1"
                  title="Minimize"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsFullscreen(false);
                }}
                className="text-white/80 hover:text-white transition-colors p-1"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-teal-50 dark:bg-teal-900/20 p-3 border-b border-teal-100 dark:border-teal-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-teal-900 dark:text-teal-100">
                💡 Ask about regulations or upload documents
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100 transition-colors p-1.5 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-800"
                  title="Upload Document"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNewChat}
                  className="text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100 transition-colors p-1.5 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-800"
                  title="New Chat"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
            {uploadedDocument && (
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-teal-200 dark:border-teal-700">
                <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-teal-900 dark:text-teal-100 truncate">
                    📄 {uploadedDocument.filename}
                  </p>
                  <p className="text-xs text-teal-600 dark:text-teal-400">
                    Document loaded - Ask me anything!
                  </p>
                </div>
                <button
                  onClick={() => setUploadedDocument(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Clear document"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-2`}
              >
                {message.role === 'assistant' && (
                  <div className="bg-teal-600 p-2 rounded-full flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
                  <div
                    className={`rounded-2xl p-3 ${
                      message.role === 'user'
                        ? 'bg-teal-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                        {formatMessage(message.content)}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="bg-gray-300 dark:bg-gray-600 p-2 rounded-full flex-shrink-0">
                    <User className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start items-start gap-2">
                <div className="bg-teal-600 p-2 rounded-full">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {uploadedDocument && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content.includes('What would you like to know') && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick actions:</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => handleQuickQuestion('Summarize this document')}
                  className="text-xs bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors border border-teal-200 dark:border-teal-800"
                >
                  📝 Summarize
                </button>
                <button
                  onClick={() => handleQuickQuestion('What are the key points?')}
                  className="text-xs bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors border border-teal-200 dark:border-teal-800"
                >
                  🎯 Key Points
                </button>
                <button
                  onClick={() => handleQuickQuestion('What are the compliance requirements?')}
                  className="text-xs bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors border border-teal-200 dark:border-teal-800"
                >
                  ✅ Compliance
                </button>
                <button
                  onClick={() => handleQuickQuestion('Analyze the risks mentioned')}
                  className="text-xs bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors border border-teal-200 dark:border-teal-800"
                >
                  ⚠️ Risks
                </button>
              </div>
            </div>
          )}
          {exampleQuestions.length > 0 && messages.length <= 2 && !uploadedDocument && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Try asking:</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {exampleQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickQuestion(question)}
                    className="text-xs bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors border border-teal-200 dark:border-teal-800"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about the data..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white text-sm"
                disabled={isLoading || isUploading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || isUploading || !inputValue.trim()}
                className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-full p-2 transition-colors disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {/* Upload Modal */}
          {showUploadModal && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-2xl">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 m-4 max-w-sm w-full shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Document</h3>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Upload a legal or regulatory document for AI-powered compliance analysis.
                </p>
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Supported formats: PDF, DOCX, TXT</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>AI will analyze regulations, compliance requirements, and risks</span>
                  </div>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Choose File
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
