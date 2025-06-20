import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStore } from '@/store'
import { apiClient } from '@/services/api'
import { wsService } from '@/services/websocket'
import { Play, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'

export function Migrate() {
  const { currentProject, selectedRule, migrationProgress, setMigrationProgress } = useStore()
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<'success' | 'error' | null>(null)
  const [createBackup, setCreateBackup] = useState(true)

  useEffect(() => {
    // Listen for WebSocket updates
    const handleProgress = (data: any) => {
      setMigrationProgress(data)
    }

    const handleLog = (data: string) => {
      setLogs(prev => [...prev, data])
    }

    const handleComplete = () => {
      setResult('success')
      setIsRunning(false)
    }

    const handleError = () => {
      setResult('error')
      setIsRunning(false)
    }

    wsService.on('progress', handleProgress)
    wsService.on('log', handleLog)
    wsService.on('complete', handleComplete)
    wsService.on('error', handleError)

    return () => {
      wsService.off('progress', handleProgress)
      wsService.off('log', handleLog)
      wsService.off('complete', handleComplete)
      wsService.off('error', handleError)
    }
  }, [setMigrationProgress])

  const handleStartMigration = async () => {
    if (!currentProject || !selectedRule) return

    setIsRunning(true)
    setLogs([])
    setResult(null)

    try {
      const { taskId } = await apiClient.startMigration(
        currentProject.id,
        selectedRule.id,
        { dryRun: false, backup: createBackup }
      )

      // Join the project room for real-time updates
      wsService.joinProject(currentProject.id)
    } catch (error) {
      console.error('Failed to start migration:', error)
      setIsRunning(false)
      setResult('error')
    }
  }

  const canMigrate = currentProject && selectedRule && !isRunning

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Migrate Project</h2>
        <p className="text-muted-foreground">
          Apply the selected migration rule to transform your codebase.
        </p>
      </div>

      {/* Migration Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Settings</CardTitle>
          <CardDescription>
            Configure your migration before starting
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

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="backup"
              checked={createBackup}
              onChange={(e) => setCreateBackup(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="backup" className="text-sm font-medium">
              Create backup before migration
            </label>
          </div>

          {!canMigrate && (
            <div className="flex items-center space-x-2 text-sm text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              <span>Please select a project and migration rule first</span>
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Warning: This will modify your files
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    Make sure you have committed your changes or enabled backup before proceeding.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleStartMigration}
            disabled={!canMigrate}
            className="w-full"
            variant={result === 'error' ? 'destructive' : 'default'}
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Migration...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Migration
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

      {/* Result Status */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Migration Result</CardTitle>
          </CardHeader>
          <CardContent>
            {result === 'success' ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span>Migration completed successfully!</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span>Migration failed. Check the logs for details.</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Migration Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}