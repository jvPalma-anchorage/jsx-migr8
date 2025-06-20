# JSX-Migr8

Interactive CLI and web interface for analyzing JSX component usage and applying codemod-level migrations with preview/diff tooling.

## Overview

JSX-Migr8 is a powerful monorepo containing:

- **CLI Tool**: Command-line interface for scanning codebases, analyzing JSX usage, and performing migrations
- **API Service**: RESTful API with WebSocket support for programmatic access
- **Web Interface**: Modern React-based UI for visual migration management

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- Yarn 4.2.0
- Docker & Docker Compose (optional, for containerized deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/jvPalma-anchorage/jsx-migr8.git
cd jsx-migr8

# Install dependencies
yarn install

# Bootstrap monorepo packages
yarn bootstrap
```

### Development

#### Run Everything (Recommended)

```bash
# Start both API and web frontend in development mode
yarn dev:all
```

This will start:
- API server at http://localhost:3001
- Web interface at http://localhost:5173

#### Run Services Individually

```bash
# Run CLI
yarn start

# Run API only
yarn api:dev

# Run Web only
yarn web:dev
```

#### Using Docker

```bash
# Development mode with hot reload
yarn docker:dev

# Production mode
yarn docker:up
```

### Building

```bash
# Build all packages
yarn build:all

# Build individual packages
yarn build:cli
yarn build:api
yarn build:web

# Docker build
yarn docker:build
```

## Project Structure

```
jsx-migr8/
├── packages/
│   ├── api/          # API service
│   │   ├── src/
│   │   ├── examples/
│   │   └── package.json
│   └── web/          # Web frontend
│       ├── src/
│       ├── public/
│       └── package.json
├── src/              # CLI source code
│   ├── cli/
│   ├── analyzer/
│   ├── migrator/
│   └── ...
├── docker-compose.yml
├── docker-compose.dev.yml
├── lerna.json
└── package.json
```

## Features

### CLI Features

- **Component Analysis**: Scan your codebase to identify JSX component usage patterns
- **Interactive Mode**: Step-by-step migration with preview and confirmation
- **Dry Run**: Preview changes without modifying files
- **Backup System**: Automatic backup before migrations with rollback capability
- **Custom Rules**: Define your own migration rules
- **Memory Optimized**: Handles large codebases efficiently

### API Features

- **RESTful Endpoints**: Full CRUD operations for migration management
- **WebSocket Support**: Real-time migration progress updates
- **Project Management**: Handle multiple projects simultaneously
- **Rule Management**: Create, update, and share migration rules

### Web Interface Features

- **Visual Rule Editor**: Create migration rules with a user-friendly interface
- **Real-time Preview**: See migration effects before applying
- **Project Dashboard**: Manage multiple migration projects
- **Migration History**: Track all migrations with rollback options
- **Component Inspector**: Visualize component usage across your codebase

## CLI Usage

### Basic Commands

```bash
# Scan a project
yarn start scan ./path/to/project

# Run migration with a rule file
yarn start migrate ./path/to/project --rule ./migr8Rules/rule.json

# Dry run (preview changes)
yarn start migrate ./path/to/project --rule ./rule.json --dry-run

# Interactive mode
yarn start migrate ./path/to/project --interactive

# YOLO mode (skip confirmations)
yarn start migrate ./path/to/project --rule ./rule.json --yolo
```

### Advanced Options

```bash
# With custom config
yarn start --config ./custom-config.json

# Specify components to analyze
yarn start scan ./project --components Button,Input,Card

# Limit file scanning
yarn start scan ./project --max-files 1000

# Enable verbose logging
yarn start migrate ./project --verbose
```

## API Usage

### Starting the API

```bash
# Development
yarn api:dev

# Production
yarn api:build && yarn api:start
```

### Example API Client

```typescript
// See packages/api/examples/client.example.ts
import { JSXMigr8Client } from '@jsx-migr8/api-client';

const client = new JSXMigr8Client('http://localhost:3001');

// Scan a project
const scanResult = await client.scanProject({
  path: './my-project',
  components: ['Button', 'Input']
});

// Run migration
const migration = await client.runMigration({
  projectPath: './my-project',
  ruleId: 'mui-to-chakra',
  dryRun: true
});
```

## Docker Deployment

### Production Deployment

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Development with Docker

```bash
# Start with hot reload
docker-compose -f docker-compose.dev.yml up

# Rebuild after dependency changes
docker-compose -f docker-compose.dev.yml build --no-cache
```

### Environment Variables

Create a `.env` file in the root:

```env
# API Configuration
API_PORT=3001
API_CORS_ORIGIN=http://localhost

# Web Configuration
VITE_API_URL=http://localhost:3001

# Node Environment
NODE_ENV=development
```

## Testing

```bash
# Run all tests
yarn test:all

# Run specific test suites
yarn test:cli
yarn test:backup
yarn test:integration

# Watch mode
yarn test:watch

# Coverage report
yarn test:coverage
```

## Migration Rules

### Creating Rules

Migration rules are JSON files that define transformation patterns:

```json
{
  "name": "MUI to Chakra UI",
  "version": "1.0.0",
  "transforms": [
    {
      "component": "Button",
      "from": "@mui/material",
      "to": "@chakra-ui/react",
      "props": {
        "variant": {
          "contained": "solid",
          "outlined": "outline",
          "text": "ghost"
        },
        "color": {
          "primary": "blue",
          "secondary": "gray"
        }
      }
    }
  ]
}
```

### Using Presets

```bash
# List available presets
yarn start rules list

# Use a preset
yarn start migrate ./project --preset mui-to-chakra
```

## Development Workflow

1. **Make Changes**: Edit code in your preferred editor
2. **Test Locally**: Run `yarn dev:all` to test changes
3. **Run Tests**: Ensure all tests pass with `yarn test:all`
4. **Build**: Verify production build with `yarn build:all`
5. **Commit**: Follow conventional commits format

### Debugging

```bash
# Enable debug logs
DEBUG=jsx-migr8:* yarn start

# Inspect memory usage
yarn start --memory-report

# Profile performance
yarn start --profile
```

## Contributing

Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Development Setup

```bash
# Install dependencies
yarn install

# Setup pre-commit hooks
yarn prepare

# Run linter
yarn lint:all

# Format code
yarn format
```

## Troubleshooting

### Common Issues

**Issue**: Out of memory errors
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=8192" yarn start
```

**Issue**: Port already in use
```bash
# Change ports in .env file
API_PORT=3002
VITE_PORT=5174
```

**Issue**: Docker build fails
```bash
# Clean Docker cache
docker system prune -a
docker-compose build --no-cache
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Documentation: [https://jsx-migr8.dev/docs](https://jsx-migr8.dev/docs)
- Issues: [GitHub Issues](https://github.com/jvPalma-anchorage/jsx-migr8/issues)
- Discussions: [GitHub Discussions](https://github.com/jvPalma-anchorage/jsx-migr8/discussions)

## Acknowledgments

- Built with [Recast](https://github.com/benjamn/recast) and [jscodeshift](https://github.com/facebook/jscodeshift)
- UI powered by [React](https://reactjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
- API built with [Express](https://expressjs.com/) and [Socket.io](https://socket.io/)