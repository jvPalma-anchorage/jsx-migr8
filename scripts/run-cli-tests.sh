#!/bin/bash

# JSX-Migr8 CLI Test Runner Script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display header
show_header() {
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "${BLUE}     JSX-Migr8 CLI Test Runner${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗ Node.js is not installed${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ Node.js $(node --version)${NC}"
    fi
    
    # Check if yarn is installed
    if ! command -v yarn &> /dev/null; then
        echo -e "${RED}✗ Yarn is not installed${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ Yarn $(yarn --version)${NC}"
    fi
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Dependencies not installed. Running yarn install...${NC}"
        yarn install
    else
        echo -e "${GREEN}✓ Dependencies installed${NC}"
    fi
    
    # Create test-logs directory if it doesn't exist
    if [ ! -d "test-logs" ]; then
        mkdir -p test-logs
        echo -e "${GREEN}✓ Created test-logs directory${NC}"
    fi
    
    echo
}

# Function to show menu
show_menu() {
    echo -e "${BLUE}Select a test to run:${NC}"
    echo "1) Basic CLI interaction test"
    echo "2) Advanced test with scenarios"
    echo "3) Run all tests"
    echo "4) View test logs"
    echo "5) Clean test logs"
    echo "0) Exit"
    echo
}

# Function to run basic test
run_basic_test() {
    echo -e "${YELLOW}Running basic CLI interaction test...${NC}"
    echo
    
    if [ -f "test-cli-interaction.js" ]; then
        node test-cli-interaction.js
    else
        echo -e "${RED}test-cli-interaction.js not found!${NC}"
        echo "Creating it now..."
        # Would create the file here in a real scenario
    fi
}

# Function to run advanced test
run_advanced_test() {
    echo -e "${YELLOW}Running advanced CLI test...${NC}"
    echo
    
    if [ -f "test-cli-advanced.js" ]; then
        node test-cli-advanced.js --interactive
    else
        echo -e "${RED}test-cli-advanced.js not found!${NC}"
    fi
}

# Function to run all tests
run_all_tests() {
    echo -e "${YELLOW}Running all CLI tests...${NC}"
    echo
    
    # Run basic test
    if [ -f "test-cli-interaction.js" ]; then
        echo -e "${BLUE}── Basic Test ──${NC}"
        node test-cli-interaction.js
        echo
    fi
    
    # Run advanced tests
    if [ -f "test-cli-advanced.js" ]; then
        echo -e "${BLUE}── Advanced Tests ──${NC}"
        node test-cli-advanced.js --all
    fi
}

# Function to view logs
view_logs() {
    if [ ! -d "test-logs" ] || [ -z "$(ls -A test-logs 2>/dev/null)" ]; then
        echo -e "${YELLOW}No test logs found${NC}"
        return
    fi
    
    echo -e "${BLUE}Test logs:${NC}"
    ls -la test-logs/
    echo
    
    echo "Select a log file to view (or press Enter to go back):"
    read -r logfile
    
    if [ -n "$logfile" ] && [ -f "test-logs/$logfile" ]; then
        less "test-logs/$logfile"
    fi
}

# Function to clean logs
clean_logs() {
    if [ ! -d "test-logs" ] || [ -z "$(ls -A test-logs 2>/dev/null)" ]; then
        echo -e "${YELLOW}No test logs to clean${NC}"
        return
    fi
    
    echo -e "${YELLOW}This will delete all test logs. Continue? (y/N)${NC}"
    read -r confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        rm -rf test-logs/*
        echo -e "${GREEN}✓ Test logs cleaned${NC}"
    else
        echo "Cancelled"
    fi
}

# Main loop
main() {
    show_header
    check_prerequisites
    
    while true; do
        show_menu
        read -r choice
        
        case $choice in
            1)
                run_basic_test
                ;;
            2)
                run_advanced_test
                ;;
            3)
                run_all_tests
                ;;
            4)
                view_logs
                ;;
            5)
                clean_logs
                ;;
            0)
                echo -e "${GREEN}Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid choice. Please try again.${NC}"
                ;;
        esac
        
        echo
        echo "Press Enter to continue..."
        read -r
        clear
        show_header
    done
}

# Run main function
main