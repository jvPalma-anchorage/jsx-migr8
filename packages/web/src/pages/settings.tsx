import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export function Settings() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Configure jsx-migr8 preferences and behavior.
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Basic configuration for jsx-migr8
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="workspace" className="text-sm font-medium">
              Default Workspace Directory
            </label>
            <input
              id="workspace"
              type="text"
              placeholder="/path/to/workspace"
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="concurrent" className="text-sm font-medium">
              Concurrent File Processing
            </label>
            <select
              id="concurrent"
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
            >
              <option value="1">1 (Sequential)</option>
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="8">8 (Recommended)</option>
              <option value="16">16</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoBackup"
              className="rounded border-gray-300"
              defaultChecked
            />
            <label htmlFor="autoBackup" className="text-sm font-medium">
              Automatically create backup before migration
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>
            Fine-tune migration behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="memoryLimit" className="text-sm font-medium">
              Memory Limit (MB)
            </label>
            <input
              id="memoryLimit"
              type="number"
              placeholder="2048"
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="preserveComments"
              className="rounded border-gray-300"
              defaultChecked
            />
            <label htmlFor="preserveComments" className="text-sm font-medium">
              Preserve code comments during migration
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="formatCode"
              className="rounded border-gray-300"
              defaultChecked
            />
            <label htmlFor="formatCode" className="text-sm font-medium">
              Format code after migration
            </label>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">File Patterns to Exclude</h4>
            <textarea
              placeholder="node_modules/**\n*.test.tsx\n*.spec.ts"
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background font-mono"
              rows={5}
              defaultValue="node_modules/**\n*.test.tsx\n*.spec.ts\n*.stories.tsx"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Manage application data and cache
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Clear Cache</p>
              <p className="text-xs text-muted-foreground">
                Remove all cached analysis data
              </p>
            </div>
            <Button variant="outline" size="sm">
              Clear Cache
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Reset Settings</p>
              <p className="text-xs text-muted-foreground">
                Restore all settings to default values
              </p>
            </div>
            <Button variant="outline" size="sm">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  )
}