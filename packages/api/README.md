# jsx-migr8 API Server

Express.js API server for jsx-migr8 that provides REST endpoints and WebSocket support for real-time migration updates.

## Features

- REST API for project initialization and migration operations
- WebSocket support for real-time progress updates
- Integration with jsx-migr8 core services via DI container
- CORS configuration for frontend communication
- Rate limiting and security middleware
- TypeScript support

## Installation

```bash
cd packages/api
yarn install
```

## Usage

### Starting the server

```bash
# Development mode with hot reload
yarn dev

# Production mode
yarn build
yarn start

# Custom port
PORT=4000 yarn start
```

### API Endpoints

#### Initialize Project
```http
POST /api/projects/init
Content-Type: application/json

{
  "rootPath": "/path/to/project",
  "blacklist": ["node_modules", ".git"],
  "packages": ["@mui/material"],
  "includePatterns": ["**/*.{js,jsx,ts,tsx}"],
  "ignorePatterns": ["**/node_modules/**"]
}
```

#### List Projects
```http
GET /api/projects
```

#### Get Project Status
```http
GET /api/projects/:projectId
```

#### Analyze Components
```http
POST /api/analyze/components
Content-Type: application/json

{
  "projectId": "project-id",
  "components": ["Button", "Card"],
  "depth": 3
}
```

#### Run Dry-Run Migration
```http
POST /api/migrate/dry-run
Content-Type: application/json

{
  "projectId": "project-id",
  "rulesPath": "./migr8Rules/migration.json",
  "options": {
    "createBackup": true,
    "interactive": false,
    "batchSize": 50
  }
}
```

### WebSocket Events

Connect to `ws://localhost:3000` for real-time updates.

#### Subscribe to Project Updates
```json
{
  "type": "subscribe",
  "projectId": "project-id"
}
```

#### Progress Updates
```json
{
  "type": "progress",
  "data": {
    "projectId": "project-id",
    "phase": "analyzing",
    "progress": 45,
    "currentFile": "/src/components/Button.tsx",
    "filesProcessed": 45,
    "totalFiles": 100
  }
}
```

#### Diff Updates
```json
{
  "type": "diff",
  "file": "/src/components/Button.tsx",
  "oldContent": "...",
  "newContent": "...",
  "changes": [
    {
      "type": "modify",
      "line": 10,
      "content": "import { Button } from '@new-ui/core';"
    }
  ]
}
```

## Example Client

See `examples/client.example.ts` for a complete example of how to interact with the API.

```bash
# Run example client
tsx examples/client.example.ts /path/to/project ./rules/migration.json
```

## Configuration

Environment variables:
- `PORT` - Server port (default: 3000)
- `CORS_ORIGIN` - CORS allowed origin (default: *)
- `LOG_LEVEL` - Logging level (default: info)

## Architecture

The API server uses:
- Express.js for REST endpoints
- ws library for WebSocket support
- Zod for request validation
- DI container for service integration
- TypeScript for type safety

## Development

```bash
# Run tests
yarn test

# Type checking
yarn typecheck

# Linting
yarn lint
```