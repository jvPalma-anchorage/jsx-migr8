#!/usr/bin/env python3

import json
import time
import sys
import threading
import queue
from urllib.request import urlopen, Request
from urllib.error import URLError
import websocket

# Configuration
API_BASE_URL = "http://localhost:3000/api"
WS_URL = "ws://localhost:3000"
TEST_PROJECT_PATH = "/data/data/com.termux/files/home/coder/apps/backoffice"

# ANSI color codes
class Colors:
    RESET = '\033[0m'
    BOLD = '\033[1m'
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    CYAN = '\033[36m'

# Logging helpers
def info(msg):
    print(f"{Colors.BLUE}[INFO]{Colors.RESET} {msg}")

def success(msg):
    print(f"{Colors.GREEN}[SUCCESS]{Colors.RESET} {msg}")

def error(msg):
    print(f"{Colors.RED}[ERROR]{Colors.RESET} {msg}")

def warn(msg):
    print(f"{Colors.YELLOW}[WARN]{Colors.RESET} {msg}")

def section(msg):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 50}\n{msg}\n{'=' * 50}{Colors.RESET}")

# HTTP request helper
def http_request(path, method="GET", data=None):
    url = f"{API_BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    
    request = Request(url, headers=headers, method=method)
    
    if data:
        request.data = json.dumps(data).encode('utf-8')
    
    try:
        with urlopen(request) as response:
            return {
                "status": response.status,
                "data": json.loads(response.read().decode('utf-8'))
            }
    except URLError as e:
        if hasattr(e, 'read'):
            error_data = e.read().decode('utf-8')
            try:
                return {
                    "status": e.code,
                    "data": json.loads(error_data)
                }
            except:
                return {
                    "status": e.code,
                    "error": error_data
                }
        raise e

# WebSocket manager class
class WSManager:
    def __init__(self):
        self.ws = None
        self.messages = queue.Queue()
        self.connected = False
        self.thread = None
        
    def connect(self):
        def on_message(ws, message):
            try:
                msg = json.loads(message)
                self.messages.put(msg)
                self.handle_message(msg)
            except Exception as e:
                error(f"Failed to parse WebSocket message: {e}")
        
        def on_error(ws, err):
            error(f"WebSocket error: {err}")
        
        def on_close(ws, close_status_code, close_msg):
            self.connected = False
            info("WebSocket disconnected")
        
        def on_open(ws):
            self.connected = True
            success("WebSocket connected")
        
        self.ws = websocket.WebSocketApp(WS_URL,
                                         on_open=on_open,
                                         on_message=on_message,
                                         on_error=on_error,
                                         on_close=on_close)
        
        self.thread = threading.Thread(target=self.ws.run_forever)
        self.thread.daemon = True
        self.thread.start()
        
        # Wait for connection
        for _ in range(10):
            if self.connected:
                return True
            time.sleep(0.5)
        
        return False
    
    def handle_message(self, message):
        msg_type = message.get('type')
        
        if msg_type == 'progress':
            progress = message.get('data', {})
            info(f"Progress: {progress.get('phase')} - {progress.get('progress')}% "
                 f"({progress.get('filesProcessed')}/{progress.get('totalFiles')} files)")
            if progress.get('currentFile'):
                info(f"  Current file: {progress['currentFile']}")
        
        elif msg_type == 'log':
            level = message.get('level', 'info')
            msg = message.get('message', '')
            if level == 'error':
                error(f"[LOG] {msg}")
            elif level == 'warn':
                warn(f"[LOG] {msg}")
            else:
                info(f"[LOG] {msg}")
        
        elif msg_type == 'diff':
            info(f"File diff for: {message.get('file')}")
            info(f"  Changes: {len(message.get('changes', []))}")
    
    def subscribe(self, project_id):
        if not self.connected:
            raise Exception("WebSocket not connected")
        
        self.ws.send(json.dumps({
            "type": "subscribe",
            "projectId": project_id
        }))
        info(f"Subscribed to project: {project_id}")
    
    def unsubscribe(self, project_id):
        if not self.connected:
            return
        
        self.ws.send(json.dumps({
            "type": "unsubscribe",
            "projectId": project_id
        }))
        info(f"Unsubscribed from project: {project_id}")
    
    def disconnect(self):
        if self.ws:
            self.ws.close()
    
    def get_messages(self):
        messages = []
        while not self.messages.empty():
            messages.append(self.messages.get())
        return messages

# Test functions
def test_create_project(project_path):
    section("Testing Project Creation")
    
    try:
        payload = {
            "rootPath": project_path,
            "blacklist": ["node_modules", ".git", "dist", "build"],
            "includePatterns": ["**/*.jsx", "**/*.tsx", "**/*.js", "**/*.ts"],
            "ignorePatterns": ["**/*.test.*", "**/*.spec.*"]
        }
        
        info("Creating project with payload:")
        print(json.dumps(payload, indent=2))
        
        response = http_request("/projects", "POST", payload)
        
        if response["data"].get("success"):
            success("Project created successfully!")
            project = response["data"]["data"]
            info(f"Project ID: {project['id']}")
            info(f"Root Path: {project['rootPath']}")
            info(f"Status: {project['status']}")
            return project
        else:
            raise Exception(response["data"].get("error", "Failed to create project"))
    
    except Exception as e:
        error(f"Failed to create project: {e}")
        raise

def test_get_project(project_id):
    section("Testing Project Retrieval")
    
    try:
        response = http_request(f"/projects/{project_id}")
        
        if response["data"].get("success"):
            success("Project retrieved successfully!")
            project = response["data"]["data"]
            info(f"Project ID: {project['id']}")
            info(f"Root Path: {project['rootPath']}")
            info(f"Status: {project['status']}")
            info(f"Created At: {project['createdAt']}")
            
            if project.get("stats"):
                info("Project Statistics:")
                stats = project["stats"]
                info(f"  Total Files: {stats.get('totalFiles', 0)}")
                info(f"  Total Components: {stats.get('totalComponents', 0)}")
                info(f"  Analyzed Files: {stats.get('analyzedFiles', 0)}")
            
            return project
        else:
            raise Exception(response["data"].get("error", "Failed to get project"))
    
    except Exception as e:
        error(f"Failed to get project: {e}")
        raise

def test_list_projects():
    section("Testing List Projects")
    
    try:
        response = http_request("/projects")
        
        if response["data"].get("success"):
            projects = response["data"]["data"]
            success(f"Retrieved {len(projects)} projects")
            
            for i, project in enumerate(projects, 1):
                info(f"\nProject {i}:")
                info(f"  ID: {project['id']}")
                info(f"  Path: {project['rootPath']}")
                info(f"  Status: {project['status']}")
                info(f"  Created: {project['createdAt']}")
            
            return projects
        else:
            raise Exception(response["data"].get("error", "Failed to list projects"))
    
    except Exception as e:
        error(f"Failed to list projects: {e}")
        raise

def test_analyze_project(project_id, ws_manager=None):
    section("Testing Project Analysis")
    
    try:
        if ws_manager:
            ws_manager.subscribe(project_id)
        
        info("Starting project analysis...")
        response = http_request(f"/projects/{project_id}/analyze", "POST")
        
        if response["data"].get("success"):
            success("Analysis started successfully!")
            
            # Poll for completion
            info("Monitoring analysis progress...")
            completed = False
            retries = 0
            max_retries = 60  # 5 minutes max
            
            while not completed and retries < max_retries:
                time.sleep(5)  # Wait 5 seconds
                
                try:
                    project_status = test_get_project(project_id)
                    if project_status["status"] != "analyzing":
                        completed = True
                        success(f"Analysis completed with status: {project_status['status']}")
                        
                        if project_status.get("stats"):
                            info("Final Statistics:")
                            stats = project_status["stats"]
                            info(f"  Total Files: {stats.get('totalFiles', 0)}")
                            info(f"  Total Components: {stats.get('totalComponents', 0)}")
                            info(f"  Analyzed Files: {stats.get('analyzedFiles', 0)}")
                except:
                    pass
                
                retries += 1
            
            if not completed:
                warn("Analysis timed out after 5 minutes")
            
            if ws_manager:
                ws_manager.unsubscribe(project_id)
            
            return response["data"].get("data")
        else:
            raise Exception(response["data"].get("error", "Failed to start analysis"))
    
    except Exception as e:
        error(f"Failed to analyze project: {e}")
        if ws_manager:
            ws_manager.unsubscribe(project_id)
        raise

def test_migration_rules():
    section("Testing Migration Rules")
    
    try:
        response = http_request("/migration/rules")
        
        if response["data"].get("success"):
            rules = response["data"].get("data", [])
            success(f"Retrieved {len(rules)} migration rules")
            
            for i, rule in enumerate(rules, 1):
                info(f"\nRule {i}:")
                info(f"  Name: {rule.get('name', 'Unknown')}")
                info(f"  Description: {rule.get('description', 'No description')}")
            
            return rules
        else:
            raise Exception(response["data"].get("error", "Failed to get migration rules"))
    
    except Exception as e:
        error(f"Failed to get migration rules: {e}")
        raise

def check_api_health():
    try:
        # Try to access the API
        request = Request(API_BASE_URL.replace('/api', '/'))
        with urlopen(request, timeout=5):
            return True
    except:
        return False

def run_complete_workflow_test():
    section("JSX-MIGR8 API WORKFLOW TEST")
    info(f"Testing with project path: {TEST_PROJECT_PATH}")
    info(f"API URL: {API_BASE_URL}")
    info(f"WebSocket URL: {WS_URL}")
    
    ws_manager = WSManager()
    project_id = None
    
    try:
        # Connect WebSocket
        section("WebSocket Connection")
        if ws_manager.connect():
            success("WebSocket connected successfully")
        else:
            warn("WebSocket connection failed, continuing without real-time updates")
            ws_manager = None
        
        # Create project
        project = test_create_project(TEST_PROJECT_PATH)
        project_id = project["id"]
        
        # List all projects
        test_list_projects()
        
        # Get specific project
        test_get_project(project_id)
        
        # Analyze project
        test_analyze_project(project_id, ws_manager)
        
        # Get migration rules
        test_migration_rules()
        
        # Show WebSocket message summary
        if ws_manager:
            section("WebSocket Message Summary")
            messages = ws_manager.get_messages()
            info(f"Total messages received: {len(messages)}")
            
            message_counts = {}
            for msg in messages:
                msg_type = msg.get('type', 'unknown')
                message_counts[msg_type] = message_counts.get(msg_type, 0) + 1
            
            for msg_type, count in message_counts.items():
                info(f"  {msg_type}: {count} messages")
        
        section("TEST COMPLETED SUCCESSFULLY")
        success("All tests passed!")
        
    except Exception as e:
        section("TEST FAILED")
        error(str(e))
        raise
    
    finally:
        if ws_manager:
            ws_manager.disconnect()

def main():
    info("Checking API availability...")
    
    if not check_api_health():
        error("API server is not running!")
        info("Please start the API server first:")
        info("  cd packages/api && npm run dev")
        sys.exit(1)
    
    success("API server is running!")
    
    # Run the complete workflow test
    try:
        run_complete_workflow_test()
    except Exception as e:
        error(f"Unhandled error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        # Check if websocket-client is installed
        import websocket
    except ImportError:
        error("websocket-client not installed!")
        info("Install with: pip install websocket-client")
        info("Or run without WebSocket support")
        sys.exit(1)
    
    main()