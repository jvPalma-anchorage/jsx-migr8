#!/bin/bash

# Configuration
API_BASE_URL="http://localhost:3000/api"
TEST_PROJECT_PATH="/data/data/com.termux/files/home/coder/apps/backoffice"
PROJECT_ID=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Logging functions
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

section() {
    echo -e "\n${BOLD}${CYAN}==================================================\n$1\n==================================================${NC}"
}

# Helper function to parse JSON response
parse_json() {
    local key=$1
    grep -o "\"$key\":[^,}]*" | sed 's/.*://;s/"//g;s/,$//'
}

# Check if API is running
check_api_health() {
    section "Checking API Health"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/../")
    
    if [ "$response" = "200" ] || [ "$response" = "404" ]; then
        success "API server is running!"
        return 0
    else
        error "API server is not running! (HTTP $response)"
        info "Please start the API server first:"
        info "  cd packages/api && npm run dev"
        return 1
    fi
}

# Test 1: Create Project
test_create_project() {
    section "Test 1: Create Project"
    
    info "Creating project with path: $TEST_PROJECT_PATH"
    
    response=$(curl -s -X POST "$API_BASE_URL/projects" \
        -H "Content-Type: application/json" \
        -d '{
            "rootPath": "'"$TEST_PROJECT_PATH"'",
            "blacklist": ["node_modules", ".git", "dist", "build"],
            "includePatterns": ["**/*.jsx", "**/*.tsx", "**/*.js", "**/*.ts"],
            "ignorePatterns": ["**/*.test.*", "**/*.spec.*"]
        }')
    
    echo "Response: $response"
    
    # Extract project ID
    PROJECT_ID=$(echo "$response" | parse_json "id" | head -1)
    
    if [ -n "$PROJECT_ID" ]; then
        success "Project created successfully!"
        info "Project ID: $PROJECT_ID"
        info "Root Path: $(echo "$response" | parse_json "rootPath")"
        info "Status: $(echo "$response" | parse_json "status")"
        return 0
    else
        error "Failed to create project"
        return 1
    fi
}

# Test 2: List Projects
test_list_projects() {
    section "Test 2: List Projects"
    
    info "Retrieving all projects..."
    
    response=$(curl -s -X GET "$API_BASE_URL/projects")
    
    echo "Response: $response"
    
    if echo "$response" | grep -q "success.*true"; then
        success "Projects retrieved successfully!"
        # Count projects (rough estimate)
        project_count=$(echo "$response" | grep -o '"id"' | wc -l)
        info "Number of projects: $project_count"
        return 0
    else
        error "Failed to list projects"
        return 1
    fi
}

# Test 3: Get Project
test_get_project() {
    section "Test 3: Get Project"
    
    if [ -z "$PROJECT_ID" ]; then
        error "No project ID available"
        return 1
    fi
    
    info "Getting project: $PROJECT_ID"
    
    response=$(curl -s -X GET "$API_BASE_URL/projects/$PROJECT_ID")
    
    echo "Response: $response"
    
    if echo "$response" | grep -q "success.*true"; then
        success "Project retrieved successfully!"
        info "Status: $(echo "$response" | parse_json "status")"
        
        # Check for stats
        if echo "$response" | grep -q "stats"; then
            info "Project Statistics:"
            info "  Total Files: $(echo "$response" | parse_json "totalFiles")"
            info "  Total Components: $(echo "$response" | parse_json "totalComponents")"
            info "  Analyzed Files: $(echo "$response" | parse_json "analyzedFiles")"
        fi
        return 0
    else
        error "Failed to get project"
        return 1
    fi
}

# Test 4: Analyze Project
test_analyze_project() {
    section "Test 4: Analyze Project"
    
    if [ -z "$PROJECT_ID" ]; then
        error "No project ID available"
        return 1
    fi
    
    info "Starting analysis for project: $PROJECT_ID"
    
    response=$(curl -s -X POST "$API_BASE_URL/projects/$PROJECT_ID/analyze")
    
    echo "Response: $response"
    
    if echo "$response" | grep -q "success.*true"; then
        success "Analysis started successfully!"
        
        info "Waiting for analysis to complete (checking every 5 seconds)..."
        
        # Poll for completion
        for i in {1..60}; do
            sleep 5
            status_response=$(curl -s -X GET "$API_BASE_URL/projects/$PROJECT_ID")
            status=$(echo "$status_response" | parse_json "status" | head -1)
            
            if [ "$status" != "analyzing" ]; then
                success "Analysis completed with status: $status"
                
                # Show final stats
                if echo "$status_response" | grep -q "stats"; then
                    info "Final Statistics:"
                    info "  Total Files: $(echo "$status_response" | parse_json "totalFiles")"
                    info "  Total Components: $(echo "$status_response" | parse_json "totalComponents")"
                    info "  Analyzed Files: $(echo "$status_response" | parse_json "analyzedFiles")"
                fi
                return 0
            else
                info "Still analyzing... (attempt $i/60)"
            fi
        done
        
        warn "Analysis timed out after 5 minutes"
        return 1
    else
        error "Failed to start analysis"
        return 1
    fi
}

# Test 5: Get Migration Rules
test_migration_rules() {
    section "Test 5: Get Migration Rules"
    
    info "Retrieving migration rules..."
    
    response=$(curl -s -X GET "$API_BASE_URL/migration/rules")
    
    echo "Response: $response"
    
    if echo "$response" | grep -q "success.*true"; then
        success "Migration rules retrieved successfully!"
        # Count rules (rough estimate)
        rule_count=$(echo "$response" | grep -o '"name"' | wc -l)
        info "Number of rules: $rule_count"
        return 0
    else
        error "Failed to get migration rules"
        return 1
    fi
}

# Test 6: WebSocket Connection (using websocat if available)
test_websocket() {
    section "Test 6: WebSocket Connection"
    
    if ! command -v websocat &> /dev/null; then
        warn "websocat not installed, skipping WebSocket test"
        info "To install: cargo install websocat"
        return 0
    fi
    
    info "Testing WebSocket connection..."
    
    # Test connection
    timeout 5 websocat -t ws://localhost:3000 > /dev/null 2>&1
    
    if [ $? -eq 0 ] || [ $? -eq 124 ]; then
        success "WebSocket connection successful!"
        return 0
    else
        error "WebSocket connection failed"
        return 1
    fi
}

# Run all tests
run_all_tests() {
    echo -e "${BOLD}${CYAN}"
    echo "=========================================="
    echo "    JSX-MIGR8 API WORKFLOW TEST"
    echo "=========================================="
    echo -e "${NC}"
    
    info "API URL: $API_BASE_URL"
    info "Test Project Path: $TEST_PROJECT_PATH"
    
    # Check API health
    if ! check_api_health; then
        exit 1
    fi
    
    # Run tests
    test_create_project || exit 1
    test_list_projects || exit 1
    test_get_project || exit 1
    test_analyze_project || exit 1
    test_migration_rules || exit 1
    test_websocket
    
    section "TEST COMPLETED SUCCESSFULLY"
    success "All tests passed!"
}

# Main execution
case "${1:-all}" in
    health)
        check_api_health
        ;;
    create)
        check_api_health && test_create_project
        ;;
    list)
        check_api_health && test_list_projects
        ;;
    get)
        if [ -z "$2" ]; then
            error "Project ID required"
            exit 1
        fi
        PROJECT_ID="$2"
        check_api_health && test_get_project
        ;;
    analyze)
        if [ -z "$2" ]; then
            error "Project ID required"
            exit 1
        fi
        PROJECT_ID="$2"
        check_api_health && test_analyze_project
        ;;
    rules)
        check_api_health && test_migration_rules
        ;;
    ws)
        check_api_health && test_websocket
        ;;
    all)
        run_all_tests
        ;;
    *)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  all      - Run all tests (default)"
        echo "  health   - Check API health"
        echo "  create   - Test project creation"
        echo "  list     - Test listing projects"
        echo "  get <id> - Test getting a specific project"
        echo "  analyze <id> - Test project analysis"
        echo "  rules    - Test getting migration rules"
        echo "  ws       - Test WebSocket connection"
        exit 1
        ;;
esac