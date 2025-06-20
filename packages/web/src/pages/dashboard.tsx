import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import { apiClient } from '@/services/api'
import { wsService } from '@/services/websocket'
import { 
  Search, 
  PlayCircle, 
  Rocket, 
  Archive, 
  FileCode, 
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function Dashboard() {
  const navigate = useNavigate()
  const { currentProject, isConnected } = useStore()
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // Check API connectivity
    const checkApi = async () => {
      try {
        const response = await fetch('/api/info')
        if (response.ok) {
          setApiStatus('connected')
          setError('')
        } else {
          setApiStatus('disconnected')
          setError(`API returned status: ${response.status}`)
        }
      } catch (err) {
        setApiStatus('disconnected')
        setError(err instanceof Error ? err.message : 'Failed to connect to API')
      }
    }

    checkApi()
    const interval = setInterval(checkApi, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const quickActions = [
    {
      title: 'Inspect Components',
      description: 'Analyze your codebase and discover component usage',
      icon: Search,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      path: '/inspect'
    },
    {
      title: 'Dry Run',
      description: 'Preview changes before applying migrations',
      icon: PlayCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      path: '/dry-run'
    },
    {
      title: 'Migrate',
      description: 'Apply transformations to your codebase',
      icon: Rocket,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      path: '/migrate'
    },
    {
      title: 'Manage Backups',
      description: 'View and restore from previous backups',
      icon: Archive,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      path: '/backup'
    },
    {
      title: 'Migration Rules',
      description: 'Create and manage transformation rules',
      icon: FileCode,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      path: '/rules'
    },
    {
      title: 'Settings',
      description: 'Configure jsx-migr8 preferences',
      icon: Settings,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      path: '/settings'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to jsx-migr8 - Transform your React codebase with confidence
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">API:</span>
            {apiStatus === 'checking' ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            ) : apiStatus === 'connected' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">WebSocket:</span>
            {isConnected ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
      </div>

      {(apiStatus === 'disconnected' || !isConnected) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg">Connection Issue</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-800">
              {apiStatus === 'disconnected' 
                ? `Unable to connect to API server. ${error}` 
                : 'WebSocket connection lost.'}
            </p>
            <p className="text-sm text-yellow-800 mt-2">
              Make sure the API server is running with: <code className="bg-yellow-100 px-1 rounded">yarn api:dev</code>
            </p>
          </CardContent>
        </Card>
      )}

      {currentProject ? (
        <Card>
          <CardHeader>
            <CardTitle>Current Project</CardTitle>
            <CardDescription>You're working on this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Name:</strong> {currentProject.name}</p>
              <p><strong>Path:</strong> {currentProject.path}</p>
              <p><strong>Status:</strong> {currentProject.status}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Project Selected</CardTitle>
            <CardDescription>Start by inspecting a codebase to analyze components</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/inspect')}>
              <Search className="mr-2 h-4 w-4" />
              Inspect Codebase
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Card
              key={action.path}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(action.path)}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${action.bgColor}`}>
                    <Icon className={`h-6 w-6 ${action.color}`} />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Follow these steps to migrate your codebase</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">
                1
              </span>
              <div>
                <p className="font-medium">Inspect your codebase</p>
                <p className="text-sm text-muted-foreground">Analyze component usage and dependencies</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">
                2
              </span>
              <div>
                <p className="font-medium">Create or select migration rules</p>
                <p className="text-sm text-muted-foreground">Define how components should be transformed</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">
                3
              </span>
              <div>
                <p className="font-medium">Run a dry-run</p>
                <p className="text-sm text-muted-foreground">Preview all changes before applying them</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">
                4
              </span>
              <div>
                <p className="font-medium">Apply migrations</p>
                <p className="text-sm text-muted-foreground">Transform your codebase with automatic backups</p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}