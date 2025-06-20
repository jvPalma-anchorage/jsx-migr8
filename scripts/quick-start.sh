#!/bin/bash

# JSX-Migr8 Quick Start Script
# Get up and running with jsx-migr8 in seconds!

set -e

echo "🚀 JSX-Migr8 Quick Start"
echo "======================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    yarn install
fi

# Start services
echo -e "\n${BLUE}Starting JSX-Migr8 services...${NC}"
echo -e "${YELLOW}➜ API server will run on http://localhost:3001${NC}"
echo -e "${YELLOW}➜ Web interface will run on http://localhost:5173${NC}"
echo -e "\nPress Ctrl+C to stop all services\n"

# Run both services
yarn dev:all