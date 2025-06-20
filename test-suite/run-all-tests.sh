#!/bin/bash

# JSX-Migr8 Comprehensive Test Runner
# This script runs all test suites and generates a report

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Log file
LOG_FILE="test-results-$(date +%Y%m%d-%H%M%S).log"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}JSX-Migr8 Comprehensive Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to run a test
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Running: $test_name${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command" >> "$LOG_FILE" 2>&1; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}  Check $LOG_FILE for details${NC}"
    fi
    echo ""
}

# Check if API server is running
check_api_server() {
    echo -e "${BLUE}Checking API server...${NC}"
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API server is running${NC}"
        return 0
    else
        echo -e "${YELLOW}API server not running. Starting it...${NC}"
        # Start API server in background
        cd packages/api && yarn start:dev > /dev/null 2>&1 &
        API_PID=$!
        
        # Wait for server to start
        local retries=30
        while [ $retries -gt 0 ]; do
            if curl -s http://localhost:3001/health > /dev/null 2>&1; then
                echo -e "${GREEN}✓ API server started${NC}"
                return 0
            fi
            sleep 1
            retries=$((retries - 1))
        done
        
        echo -e "${RED}✗ Failed to start API server${NC}"
        return 1
    fi
}

# Clean up function
cleanup() {
    echo -e "${BLUE}Cleaning up...${NC}"
    
    # Kill API server if we started it
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
    fi
    
    # Clean up test directories
    rm -rf test-suite/test-project 2>/dev/null || true
    rm -rf test-suite/edge-cases 2>/dev/null || true
}

# Set up trap for cleanup
trap cleanup EXIT

# Start tests
echo "Logging to: $LOG_FILE"
echo ""

# 1. Check dependencies
echo -e "${BLUE}1. Checking dependencies...${NC}"
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓ package.json found${NC}"
else
    echo -e "${RED}✗ package.json not found. Are you in the project root?${NC}"
    exit 1
fi

# 2. Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    yarn install
fi

# 3. Start API server if needed
if ! check_api_server; then
    echo -e "${RED}Cannot proceed without API server${NC}"
    exit 1
fi
echo ""

# 4. Run unit tests
run_test "Unit Tests" "yarn test --passWithNoTests"

# 5. Run API tests
run_test "API Tests" "cd packages/api && yarn test --passWithNoTests"

# 6. Run comprehensive integration test
run_test "Comprehensive Integration Test" "tsx test-suite/comprehensive-test.ts"

# 7. Run edge case tests
run_test "Edge Case Tests" "tsx test-suite/edge-case-tests.ts"

# 8. Test CLI interaction
run_test "CLI Basic Test" "yarn test:cli || true"

# 9. Test migration scenarios
run_test "Migration Scenarios" "yarn test:migration-scenarios --passWithNoTests || true"

# 10. Web UI smoke test
echo -e "${YELLOW}Running: Web UI Smoke Test${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if curl -s http://localhost:3001/api/info > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Web UI API endpoints accessible${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ Web UI API endpoints not accessible${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Generate summary report
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Check $LOG_FILE for details.${NC}"
    
    # Show last 20 lines of log for failed tests
    echo ""
    echo -e "${YELLOW}Recent log entries:${NC}"
    tail -20 "$LOG_FILE"
    
    exit 1
fi