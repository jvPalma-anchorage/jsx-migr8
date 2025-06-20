import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStore } from '@/store'
import { apiClient } from '@/services/api'
import { wsService } from '@/services/websocket'
import { Play, Loader2, AlertCircle } from 'lucide-react'

export function DryRun() {
  const { currentProject, selectedRule, migrationProgress, setMigrationProgress } = useStore()
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [diffs, setDiffs] = useState<Record<string, string>>({})

  useEffect(() => {
    // Listen for WebSocket updates
    const handleProgress = (data: any) => {
      setMigrationProgress(data)
    }

    const handleLog = (data: string) => {
      setLogs(prev => [...prev, data])
    }

    wsService.on('progress', handleProgress)
    wsService.on('log', handleLog)

    return () => {
      wsService.off('progress', handleProgress)
      wsService.off('log', handleLog)
    }
  }, [setMigrationProgress])

  const handleStartDryRun = async () => {
    if (!currentProject || !selectedRule) return

    setIsRunning(true)
    setLogs([])
    setDiffs({})

    try {
      const { taskId } = await apiClient.startMigration(
        currentProject.id,
        selectedRule.id,
        { dryRun: true }
      )

      // Join the project room for real-time updates
      wsService.joinProject(currentProject.id)

      // Poll for completion
      const checkStatus = setInterval(async () => {
        const status = await apiClient.getMigrationStatus(taskId)
        if (status.status === 'completed') {
          clearInterval(checkStatus)
          setIsRunning(false)
          setDiffs(status.diffs || {})
        } else if (status.status === 'error') {
          clearInterval(checkStatus)
          setIsRunning(false)
        }
      }, 1000)
    } catch (error) {
      console.error('Failed to start dry run:', error)
      setIsRunning(false)
    }
  }

  const canRunDryRun = currentProject && selectedRule && !isRunning

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dry Run</h2>
        <p className="text-muted-foreground">
          Test your migration without making any changes to see what would be modified.
        </p>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Dry Run Configuration</CardTitle>
          <CardDescription>
            Review your settings before running the test migration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium mb-1">Project</p>
              <p className="text-sm text-muted-foreground">
                {currentProject?.name || 'No project selected'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Migration Rule</p>
              <p className="text-sm text-muted-foreground">
                {selectedRule?.name || 'No rule selected'}
              </p>
            </div>
          </div>

          {!canRunDryRun && (
            <div className="flex items-center space-x-2 text-sm text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              <span>Please select a project and migration rule first</span>
            </div>
          )}

          <Button
            onClick={handleStartDryRun}
            disabled={!canRunDryRun}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Dry Run...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Dry Run
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {migrationProgress && (
        <Card>
          <CardHeader>
            <CardTitle>Migration Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{migrationProgress.completed} / {migrationProgress.total}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${(migrationProgress.completed / migrationProgress.total) * 100}%`
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Current: {migrationProgress.current}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {(logs.length > 0 || Object.keys(diffs).length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Dry Run Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="logs" className="w-full">
              <TabsList>
                <TabsTrigger value="logs">Logs</TabsTrigger>
                <TabsTrigger value="changes">Changes Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="logs">
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div key={index} className="text-xs font-mono">
                        {log}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="changes">
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  {Object.entries(diffs).map(([file, diff]) => (
                    <div key={file} className="mb-6">
                      <h4 className="text-sm font-medium mb-2">{file}</h4>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        <code>{diff}</code>
                      </pre>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}