#!/bin/bash

# JSX-Migr8 Development Setup Script
# This script sets up the development environment for the JSX-Migr8 monorepo

set -e

echo "🚀 JSX-Migr8 Development Setup"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node version
echo -e "\n${YELLOW}Checking Node.js version...${NC}"
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_NODE_VERSION="22.0.0"

if [ "$(printf '%s\n' "$REQUIRED_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE_VERSION" ]; then
    echo -e "${RED}Error: Node.js version $REQUIRED_NODE_VERSION or higher is required. Current version: $NODE_VERSION${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js version $NODE_VERSION${NC}"

# Check Yarn version
echo -e "\n${YELLOW}Checking Yarn version...${NC}"
if ! command -v yarn &> /dev/null; then
    echo -e "${RED}Error: Yarn is not installed${NC}"
    exit 1
fi
YARN_VERSION=$(yarn -v)
echo -e "${GREEN}✓ Yarn version $YARN_VERSION${NC}"

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
yarn install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Bootstrap Lerna packages
echo -e "\n${YELLOW}Bootstrapping monorepo packages...${NC}"
yarn bootstrap
echo -e "${GREEN}✓ Packages bootstrapped${NC}"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "\n${YELLOW}Creating .env file...${NC}"
    cat > .env << EOF
# API Configuration
API_PORT=3001
API_CORS_ORIGIN=http://localhost:5173

# Web Configuration  
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Node Environment
NODE_ENV=development

# CLI Configuration
JSX_MIGR8_MAX_MEMORY=8192
JSX_MIGR8_CONCURRENT_FILES=10
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Build packages
echo -e "\n${YELLOW}Building packages...${NC}"
yarn build:all
echo -e "${GREEN}✓ Packages built${NC}"

# Run tests to verify setup
echo -e "\n${YELLOW}Running tests...${NC}"
yarn test:integration
echo -e "${GREEN}✓ Integration tests passed${NC}"

# Check if Docker is installed
echo -e "\n${YELLOW}Checking Docker installation...${NC}"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    echo -e "${GREEN}✓ Docker version $DOCKER_VERSION${NC}"
    
    # Build Docker images
    echo -e "\n${YELLOW}Building Docker images (optional)...${NC}"
    read -p "Do you want to build Docker images? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        yarn docker:build
        echo -e "${GREEN}✓ Docker images built${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Docker not installed (optional for containerized deployment)${NC}"
fi

# Success message
echo -e "\n${GREEN}✅ Development environment setup complete!${NC}"
echo -e "\n${YELLOW}Quick start commands:${NC}"
echo "  yarn dev:all      - Start both API and web in development mode"
echo "  yarn start        - Run the CLI"
echo "  yarn test:all     - Run all tests"
echo "  yarn docker:dev   - Run in Docker development mode"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Start the development servers: yarn dev:all"
echo "2. Open http://localhost:5173 in your browser"
echo "3. Try the CLI: yarn start --help"
echo -e "\nHappy coding! 🎉"