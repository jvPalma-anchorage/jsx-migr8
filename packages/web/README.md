# jsx-migr8 Web UI

A modern React-based web interface for jsx-migr8, built with Vite, TypeScript, and shadcn/ui.

## Features

- **Project Inspection**: Analyze React projects for component usage and migration opportunities
- **Dry Run Mode**: Preview changes before applying migrations
- **Live Migration**: Apply transformations with real-time progress updates
- **Backup Management**: Create and restore project backups
- **Migration Rules**: Manage and customize migration rules
- **Real-time Updates**: WebSocket integration for live progress tracking

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **shadcn/ui** for beautiful, accessible components
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Router** for navigation
- **Socket.io** for WebSocket communication

## Getting Started

### Prerequisites

- Node.js 22+ (required by parent project)
- Yarn 4.2.0 (workspace managed)

### Installation

From the root of the jsx-migr8 project:

```bash
# Install all dependencies
yarn install

# Start the web UI
yarn workspace @jsx-migr8/web dev
```

The application will be available at `http://localhost:5173`.

### Development

```bash
# Start development server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview

# Run linting
yarn lint
```

## Project Structure

```
src/
├── components/       # UI components
│   ├── ui/          # shadcn/ui components
│   └── layout/      # Layout components (sidebar, header)
├── pages/           # Page components
├── services/        # API and WebSocket services
├── store/           # Zustand state management
├── types/           # TypeScript type definitions
├── hooks/           # Custom React hooks
└── lib/             # Utility functions
```

## Configuration

The application expects the API server to be running on `http://localhost:3000`. This is configured in `vite.config.ts` with proxy settings for both HTTP and WebSocket connections.

## State Management

The application uses Zustand for state management. The main store includes:

- Current project information
- Analysis results
- Migration progress
- Backup management
- UI state (loading, errors)
- WebSocket connection status

## API Integration

The `ApiClient` service provides methods for:

- Project management
- Code analysis
- Migration operations
- Backup operations
- Rule management

## WebSocket Integration

Real-time updates are handled through Socket.io for:

- Migration progress
- Log streaming
- Error notifications
- Task completion events

## Components

### UI Components (shadcn/ui)

- Button
- Card
- ScrollArea
- Separator
- Tabs

Additional components can be added using the shadcn/ui CLI or by manually creating them following the same patterns.

### Pages

1. **Dashboard**: Overview and quick actions
2. **Inspect**: Project analysis and component discovery
3. **Dry Run**: Test migrations without applying changes
4. **Migrate**: Apply migrations with real-time progress
5. **Backup**: Create and manage project backups
6. **Rules**: View and manage migration rules
7. **Settings**: Configure application preferences

## Styling

The application uses Tailwind CSS with a custom theme configuration that supports light and dark modes. The theme is defined in `tailwind.config.js` and uses CSS variables for dynamic theming.

## Future Enhancements

- [ ] Dark mode toggle
- [ ] Migration history tracking
- [ ] Diff viewer for file changes
- [ ] Rule editor with syntax highlighting
- [ ] Export/import migration rules
- [ ] Team collaboration features
- [ ] Performance metrics dashboard