import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import { apiClient } from '@/services/api'
import { Archive, RefreshCw, Trash2, Download, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function Backup() {
  const { currentProject, backups, setBackups } = useStore()
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (currentProject) {
      loadBackups()
    }
  }, [currentProject])

  const loadBackups = async () => {
    if (!currentProject) return

    setIsLoading(true)
    try {
      const backupList = await apiClient.getBackups(currentProject.id)
      setBackups(backupList)
    } catch (error) {
      console.error('Failed to load backups:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    if (!currentProject) return

    setIsCreating(true)
    try {
      await apiClient.createBackup(currentProject.id, description || undefined)
      setDescription('')
      await loadBackups()
    } catch (error) {
      console.error('Failed to create backup:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleRestoreBackup = async (backupId: string) => {
    if (!currentProject) return

    if (!confirm('Are you sure you want to restore this backup? This will overwrite current files.')) {
      return
    }

    try {
      await apiClient.restoreBackup(currentProject.id, backupId)
      alert('Backup restored successfully!')
    } catch (error) {
      console.error('Failed to restore backup:', error)
      alert('Failed to restore backup')
    }
  }

  const handleDeleteBackup = async (backupId: string) => {
    if (!currentProject) return

    if (!confirm('Are you sure you want to delete this backup?')) {
      return
    }

    try {
      await apiClient.deleteBackup(currentProject.id, backupId)
      await loadBackups()
    } catch (error) {
      console.error('Failed to delete backup:', error)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Backup Management</h2>
        <p className="text-muted-foreground">
          Create and manage backups of your project before making changes.
        </p>
      </div>

      {!currentProject ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please select a project first to manage backups.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Create Backup */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Backup</CardTitle>
              <CardDescription>
                Save the current state of your project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="description" className="text-sm font-medium">
                    Description (optional)
                  </label>
                  <input
                    id="description"
                    type="text"
                    placeholder="e.g., Before migration to v2"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                  />
                </div>
                <Button
                  onClick={handleCreateBackup}
                  disabled={isCreating}
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Backup...
                    </>
                  ) : (
                    <>
                      <Archive className="mr-2 h-4 w-4" />
                      Create Backup
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Backup List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Existing Backups</CardTitle>
                  <CardDescription>
                    Manage your project backups
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadBackups}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : backups.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No backups found. Create your first backup above.
                </p>
              ) : (
                <div className="space-y-4">
                  {backups.map((backup) => (
                    <div
                      key={backup.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {backup.description || 'Backup'}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>
                            {formatDistanceToNow(new Date(backup.timestamp), { addSuffix: true })}
                          </span>
                          <span>{backup.files.length} files</span>
                          <span>{formatBytes(backup.size)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreBackup(backup.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBackup(backup.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}