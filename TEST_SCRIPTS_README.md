# JSX-MIGR8 API Test Scripts

This directory contains comprehensive test scripts for testing the complete jsx-migr8 API workflow, from project creation to analysis results.

## Available Test Scripts

### 1. `test-api-curl.sh` (Bash/cURL)
Simple bash script using cURL for basic API testing. No dependencies required.

```bash
# Run all tests
./test-api-curl.sh

# Run specific tests
./test-api-curl.sh health   # Check API health
./test-api-curl.sh create   # Test project creation
./test-api-curl.sh list     # List all projects
./test-api-curl.sh get <id> # Get specific project
./test-api-curl.sh analyze <id> # Analyze project
./test-api-curl.sh rules    # Get migration rules
```

### 2. `test-api-simple.js` (Node.js - No Dependencies)
Node.js script using only built-in modules. No npm install required.

```bash
# Run all tests
node test-api-simple.js
```

### 3. `test-api-workflow.js` (Node.js - Full Featured)
Complete test suite with WebSocket support and colored output.

```bash
# Install dependencies first
npm install axios ws chalk

# Run all tests
node test-api-workflow.js
```

### 4. `test-api-python.py` (Python 3)
Python script with WebSocket support for real-time monitoring.

```bash
# Install dependencies (optional for WebSocket support)
pip install websocket-client

# Run all tests
python3 test-api-python.py
```

## Test Workflow

All scripts test the following workflow:

1. **API Health Check**: Verify the API server is running
2. **Create Project**: POST /api/projects with test project path
3. **List Projects**: GET /api/projects to verify creation
4. **Get Project**: GET /api/projects/:id for specific project details
5. **Analyze Project**: POST /api/projects/:id/analyze to scan codebase
6. **Monitor Progress**: Poll or use WebSocket to track analysis progress
7. **Get Migration Rules**: GET /api/migration/rules
8. **WebSocket Messages**: Monitor real-time updates (if supported)

## Configuration

All scripts use these default values:
- API URL: `http://localhost:3000/api`
- WebSocket URL: `ws://localhost:3000`
- Test Project Path: `/data/data/com.termux/files/home/coder/apps/backoffice`

You can modify these values at the top of each script.

## Prerequisites

1. Start the API server:
   ```bash
   cd packages/api
   npm run dev
   ```

2. Ensure the test project path exists and contains JavaScript/TypeScript files

## Expected Output

A successful test run will:
1. Create a new project with a unique ID
2. Show the project in the list of all projects
3. Start and complete the analysis process
4. Display statistics about files and components found
5. Show available migration rules
6. Display WebSocket messages received (if applicable)

## Troubleshooting

### API Server Not Running
```
[ERROR] API server is not running!
[INFO] Please start the API server first:
[INFO]   cd packages/api && npm run dev
```

### Project Path Not Found
Ensure the test project path exists and is accessible:
```bash
ls -la /data/data/com.termux/files/home/coder/apps/backoffice
```

### WebSocket Connection Failed
WebSocket support is optional. Tests will continue without real-time updates.

### Analysis Timeout
If analysis takes longer than 5 minutes, the test will timeout. This might happen for very large projects.

## Example Output

```
==================================================
JSX-MIGR8 API WORKFLOW TEST
==================================================
[INFO] API URL: http://localhost:3000/api
[SUCCESS] API server is running!

==================================================
Testing Project Creation
==================================================
[SUCCESS] Project created successfully!
[INFO] Project ID: abc123-def456-789
[INFO] Root Path: /data/data/com.termux/files/home/coder/apps/backoffice
[INFO] Status: idle

==================================================
Testing Project Analysis
==================================================
[INFO] Starting project analysis...
[SUCCESS] Analysis started successfully!
[INFO] Progress: analyzing - 45% (23/51 files)
[SUCCESS] Analysis completed with status: idle
[INFO] Final Statistics:
[INFO]   Total Files: 51
[INFO]   Total Components: 28
[INFO]   Analyzed Files: 51

==================================================
TEST COMPLETED SUCCESSFULLY
==================================================
```

## Development

To add new tests or modify existing ones:
1. Follow the existing pattern for consistency
2. Always include error handling
3. Log clear messages for debugging
4. Support both success and failure scenarios
5. Clean up resources when possible