#!/data/data/com.termux/files/usr/bin/bash
# termux-dev.sh - Development script for Termux environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    local port=$1
    if command_exists lsof; then
        lsof -i :$port >/dev/null 2>&1
    else
        netstat -ln | grep -q ":$port "
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    if port_in_use $port; then
        print_color $YELLOW "Port $port is in use. Attempting to free it..."
        if command_exists lsof; then
            lsof -ti :$port | xargs -r kill -9 2>/dev/null || true
        else
            fuser -k $port/tcp 2>/dev/null || true
        fi
        sleep 1
    fi
}

# Check dependencies
print_color $BLUE "🔍 Checking dependencies..."

if ! command_exists node; then
    print_color $RED "❌ Node.js is not installed. Please install it with: pkg install nodejs"
    exit 1
fi

if ! command_exists npm; then
    print_color $RED "❌ npm is not installed. Please install Node.js"
    exit 1
fi

print_color $GREEN "✅ All dependencies are installed"

# Navigate to project root
cd "$PROJECT_ROOT"

# Create .env files if they don't exist
print_color $BLUE "📝 Setting up environment files..."

# Create root .env if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env 2>/dev/null || cat > .env << 'EOF'
# API Configuration
API_PORT=3000
API_CORS_ORIGIN=http://localhost:5173
API_MAX_REQUEST_SIZE=50mb
API_RATE_LIMIT_WINDOW=15
API_RATE_LIMIT_MAX=100

# Web Configuration
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_APP_TITLE=JSX-Migr8

# Node Environment
NODE_ENV=development

# CLI Configuration
JSX_MIGR8_MAX_MEMORY=8192
JSX_MIGR8_CONCURRENT_FILES=10
JSX_MIGR8_CACHE_DIR=.cache
JSX_MIGR8_LOG_LEVEL=info
EOF
    print_color $GREEN "✅ Created root .env file"
fi

# Create API .env if it doesn't exist
if [ ! -f packages/api/.env ]; then
    cp packages/api/.env.example packages/api/.env 2>/dev/null || cat > packages/api/.env << 'EOF'
# API Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30000

# Migration Settings
MAX_CONCURRENT_MIGRATIONS=1
MIGRATION_TIMEOUT_MS=600000

# Memory Limits
MEMORY_LIMIT_MB=512
EOF
    print_color $GREEN "✅ Created API .env file"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_color $BLUE "📦 Installing dependencies..."
    npm install
else
    print_color $GREEN "✅ Dependencies already installed"
fi

# Free up ports if they're in use
print_color $BLUE "🔧 Checking ports..."
kill_port 3000
kill_port 5173

# Function to cleanup on exit
cleanup() {
    print_color $YELLOW "\n🛑 Stopping services..."
    # Kill all child processes
    jobs -p | xargs -r kill 2>/dev/null || true
    exit 0
}

# Set up trap for cleanup
trap cleanup INT TERM EXIT

# Start services
print_color $BLUE "🚀 Starting services..."

# Start API server
print_color $GREEN "Starting API server on port 3000..."
cd "$PROJECT_ROOT/packages/api"
npm run dev &
API_PID=$!

# Wait for API to start
sleep 3

# Start web server
print_color $GREEN "Starting web server on port 5173..."
cd "$PROJECT_ROOT/packages/web"
npm run dev &
WEB_PID=$!

# Wait for services to start
sleep 3

# Display status
print_color $GREEN "\n✨ Development environment is running!"
print_color $BLUE "📡 API Server: http://localhost:3000"
print_color $BLUE "🌐 Web Server: http://localhost:5173"
print_color $YELLOW "\nPress Ctrl+C to stop all services"

# Wait for both processes
wait $API_PID $WEB_PID