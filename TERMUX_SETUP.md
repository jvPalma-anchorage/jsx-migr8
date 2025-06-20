# JSX-Migr8 Termux Setup Guide

This guide helps you run jsx-migr8 development environment in Termux without Docker.

## Prerequisites

1. Install Termux from F-Droid (recommended) or Google Play Store
2. Open Termux and run:
   ```bash
   pkg update
   pkg upgrade
   ```

## Quick Start

The easiest way to get started is to run the quick start script:

```bash
./termux-quickstart.sh
```

This script will:
- Check and install required packages (Node.js, Git)
- Install Yarn if not present
- Set up environment files
- Start both API and web servers

## Manual Setup

If you prefer to set up manually:

### 1. Install Dependencies

```bash
# Install Node.js
pkg install nodejs

# Install Git (if not already installed)
pkg install git

# Install Yarn globally
npm install -g yarn
```

### 2. Install Project Dependencies

```bash
# Install all project dependencies
yarn install
```

### 3. Set Up Environment Files

The development script will create these automatically, but you can also create them manually:

Create `.env` in the project root:
```env
# API Configuration
API_PORT=3000
API_CORS_ORIGIN=http://localhost:5173
API_MAX_REQUEST_SIZE=50mb
API_RATE_LIMIT_WINDOW=15
API_RATE_LIMIT_MAX=100

# Web Configuration
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_APP_TITLE=JSX-Migr8

# Node Environment
NODE_ENV=development
```

Create `packages/api/.env`:
```env
# API Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=info
```

### 4. Start Development Environment

Run the Termux development script:
```bash
yarn dev:termux
```

Or use the npm scripts:
```bash
# Start both API and web servers
yarn dev:all
```

## Available Scripts

- `yarn start:termux` - Run the quick start script
- `yarn dev:termux` - Start development environment
- `yarn dev:all` - Start both API and web servers using concurrently
- `yarn api:dev` - Start only the API server
- `yarn web:dev` - Start only the web server

## Port Configuration

The development environment uses these ports:
- **API Server**: `http://localhost:3000`
- **Web Server**: `http://localhost:5173`
- **WebSocket**: `ws://localhost:3000`

## Troubleshooting

### Port Already in Use

If you get a "port already in use" error, the script will attempt to free the port automatically. You can also manually kill processes:

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Permission Denied

If you get permission errors, make sure the scripts are executable:

```bash
chmod +x termux-quickstart.sh
chmod +x scripts/termux-dev.sh
```

### Node.js Issues

If Node.js isn't working properly:

```bash
# Reinstall Node.js
pkg remove nodejs
pkg install nodejs
```

### Memory Issues

Termux has memory limitations. If you encounter memory issues:

1. Close other apps
2. Increase Termux's memory allocation in Android settings
3. Reduce concurrent operations in the configuration

## Development Workflow

1. Start the development environment:
   ```bash
   yarn dev:termux
   ```

2. Open your browser and navigate to:
   - Web UI: `http://localhost:5173`
   - API Health: `http://localhost:3000/health`

3. The API server will automatically restart when you make changes
4. The web server supports hot module replacement (HMR)

## Stopping the Services

Press `Ctrl+C` in the terminal to stop all services gracefully.

## Additional Notes

- The Termux development script handles port conflicts automatically
- Environment files are created automatically if they don't exist
- All logs are displayed in the terminal for easy debugging
- The script uses Termux-specific paths and configurations

## Support

If you encounter issues specific to Termux:

1. Check that all dependencies are installed correctly
2. Ensure you have enough storage space
3. Try restarting Termux
4. Check the [Termux Wiki](https://wiki.termux.com/) for Termux-specific issues