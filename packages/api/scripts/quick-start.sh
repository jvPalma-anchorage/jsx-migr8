#!/bin/bash

# Quick start script for jsx-migr8 API server

echo "🚀 jsx-migr8 API Server Quick Start"
echo "=================================="
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 22.0.0"
    exit 1
fi

# Check node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Node.js version must be >= 22.0.0. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if yarn is installed
if ! command -v yarn &> /dev/null; then
    echo "❌ Yarn is not installed. Installing yarn..."
    npm install -g yarn
fi

echo "✅ Yarn version: $(yarn -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
cd "$(dirname "$0")/.."
yarn install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

# Display available commands
echo "📚 Available Commands:"
echo "---------------------"
echo "  yarn dev        - Start the API server in development mode"
echo "  yarn build      - Build the API server for production"
echo "  yarn start      - Start the production server"
echo "  yarn test       - Run tests"
echo ""

echo "🌐 API Endpoints:"
echo "-----------------"
echo "  POST /api/projects/init       - Initialize a new project"
echo "  GET  /api/projects            - List all projects"
echo "  GET  /api/projects/:id        - Get project status"
echo "  POST /api/analyze/components  - Analyze project components"
echo "  POST /api/migrate/dry-run     - Run dry-run migration"
echo ""

echo "📡 WebSocket:"
echo "-------------"
echo "  Connect to ws://localhost:3000 for real-time updates"
echo ""

echo "🎯 Quick Test:"
echo "--------------"
echo "  1. Start the server: yarn dev"
echo "  2. In another terminal: curl http://localhost:3000/health"
echo "  3. Run the example client: tsx examples/client.example.ts"
echo ""

# Ask if user wants to start the server
read -p "Would you like to start the API server now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting API server..."
    yarn dev
fi