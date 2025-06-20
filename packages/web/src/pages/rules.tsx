import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStore } from '@/store'
import { apiClient } from '@/services/api'
import { Plus, FileCode2, Check, Edit } from 'lucide-react'

export function Rules() {
  const navigate = useNavigate()
  const { migrationRules, setMigrationRules, selectedRule, setSelectedRule } = useStore()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    setIsLoading(true)
    try {
      const rules = await apiClient.getMigrationRules()
      setMigrationRules(rules)
    } catch (error) {
      console.error('Failed to load rules:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Migration Rules</h2>
          <p className="text-muted-foreground">
            Manage and configure your migration rules for different UI library transformations.
          </p>
        </div>
        <Button onClick={() => navigate('/rule-editor')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {/* Rules List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {migrationRules.map((rule) => (
          <Card
            key={rule.id}
            className={`cursor-pointer transition-colors ${
              selectedRule?.id === rule.id ? 'border-primary' : ''
            }`}
            onClick={() => setSelectedRule(rule)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{rule.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {rule.sourcePackage} → {rule.targetPackage}
                  </CardDescription>
                </div>
                {selectedRule?.id === rule.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {rule.description}
              </p>
              <div className="mt-4 flex items-center space-x-4 text-xs text-muted-foreground">
                <span>{rule.transformations.length} transformations</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rule Details */}
      {selectedRule && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Rule Details: {selectedRule.name}</CardTitle>
                <CardDescription>
                  View and edit the transformation rules
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  navigate('/rule-editor')
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Rule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="transformations">Transformations</TabsTrigger>
                <TabsTrigger value="json">JSON View</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium mb-1">Source Package</p>
                    <p className="text-sm text-muted-foreground">{selectedRule.sourcePackage}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Target Package</p>
                    <p className="text-sm text-muted-foreground">{selectedRule.targetPackage}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">{selectedRule.description}</p>
                </div>
              </TabsContent>
              
              <TabsContent value="transformations" className="space-y-4">
                <div className="space-y-2">
                  {selectedRule.transformations.map((transform, index) => (
                    <div key={index} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {transform.type.replace('-', ' ')}
                        </span>
                        {transform.component && (
                          <span className="text-xs text-muted-foreground">
                            Component: {transform.component}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span className="font-mono">{transform.from}</span>
                        {transform.to && (
                          <>
                            <span className="mx-2">→</span>
                            <span className="font-mono">{transform.to}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="json">
                <pre className="p-4 rounded-lg bg-muted overflow-x-auto">
                  <code className="text-xs">
                    {JSON.stringify(selectedRule, null, 2)}
                  </code>
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}