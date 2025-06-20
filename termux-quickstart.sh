#!/data/data/com.termux/files/usr/bin/bash
# termux-quickstart.sh - Quick setup and start script for Termux

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      JSX-Migr8 Termux Quick Start      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo

# Check if running in Termux
if [ ! -d "/data/data/com.termux" ]; then
    echo -e "${YELLOW}⚠️  This script is designed for Termux environment${NC}"
    echo -e "${YELLOW}   Continue anyway? (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Install required packages if not present
echo -e "${BLUE}📦 Checking Termux packages...${NC}"

packages_to_install=""

if ! pkg list-installed 2>/dev/null | grep -q "^nodejs/"; then
    packages_to_install="$packages_to_install nodejs"
fi

if ! pkg list-installed 2>/dev/null | grep -q "^git/"; then
    packages_to_install="$packages_to_install git"
fi

if [ -n "$packages_to_install" ]; then
    echo -e "${YELLOW}Installing required packages: $packages_to_install${NC}"
    pkg update -y
    pkg install -y $packages_to_install
else
    echo -e "${GREEN}✅ All Termux packages are installed${NC}"
fi

# Install yarn if not present
if ! command -v yarn >/dev/null 2>&1; then
    echo -e "${BLUE}📦 Installing Yarn...${NC}"
    npm install -g yarn
fi

# Run the development script
echo -e "${GREEN}🚀 Starting development environment...${NC}"
echo

if [ -f "scripts/termux-dev.sh" ]; then
    exec bash scripts/termux-dev.sh
else
    echo -e "${RED}❌ Error: scripts/termux-dev.sh not found${NC}"
    echo -e "${YELLOW}   Make sure you're in the jsx-migr8 project root directory${NC}"
    exit 1
fi