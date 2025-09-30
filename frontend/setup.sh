#!/bin/bash

# AI Regulation Analytics Dashboard - Setup Script
# This script automates the installation process

echo "🚀 Setting up AI Regulation Analytics Dashboard..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "🎨 Installing additional packages for export functionality..."
npm install html2canvas jspdf

echo ""
echo "✨ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Make sure the backend is running on http://localhost:8000"
echo "   2. Run 'npm run dev' to start the development server"
echo "   3. Open http://localhost:3000 in your browser"
echo ""
echo "🎉 Enjoy your professional dashboard!"
