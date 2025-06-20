import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useStore } from '@/store'
import { apiClient } from '@/services/api'
import { 
  ComponentInfo, 
  PropInfo, 
  ViewMode, 
  GroupBy, 
  SortBy, 
  FilterOptions,
  PropCombination 
} from '@/types'
import { 
  Loader2, 
  FolderOpen, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Grid3X3, 
  List, 
  Package,
  Component,
  FileCode,
  ArrowUpDown,
  ChevronRight,
  ChevronDown,
  Info,
  Code2,
  Settings2,
  FileJson
} from 'lucide-react'

export function Inspect() {
  const { 
    currentProject, 
    setCurrentProject, 
    analysisResult, 
    setAnalysisResult, 
    setIsLoading, 
    isLoading 
  } = useStore()
  
  const [projectPath, setProjectPath] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')
  const [groupBy, setGroupBy] = useState<GroupBy>('package')
  const [sortBy, setSortBy] = useState<SortBy>('usage')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [selectedComponent, setSelectedComponent] = useState<ComponentInfo | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({
    packages: [],
    components: [],
    propTypes: [],
    usageThreshold: 0,
    showRequired: true,
    showOptional: true
  })

  const handleSelectProject = async () => {
    if (!projectPath) return
    
    setIsLoading(true)
    try {
      const project = await apiClient.createProject(projectPath, projectPath.split('/').pop() || 'Unnamed Project')
      setCurrentProject(project)
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!currentProject) return

    setIsLoading(true)
    try {
      const result = await apiClient.analyzeProject(currentProject.id)
      setAnalysisResult(result)
    } catch (error) {
      console.error('Failed to analyze project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Filter and sort components
  const filteredComponents = useMemo(() => {
    if (!analysisResult?.components) return []
    
    let components = [...analysisResult.components]
    
    // Apply filters
    if (filters.packages.length > 0) {
      components = components.filter(c => filters.packages.includes(c.package))
    }
    if (filters.components.length > 0) {
      components = components.filter(c => filters.components.includes(c.name))
    }
    if (filters.usageThreshold > 0) {
      components = components.filter(c => c.usageCount >= filters.usageThreshold)
    }
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      components = components.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.package.toLowerCase().includes(query) ||
        c.props.some(p => p.name.toLowerCase().includes(query))
      )
    }
    
    // Sort
    components.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'usage':
          return b.usageCount - a.usageCount
        case 'package':
          return a.package.localeCompare(b.package)
        default:
          return 0
      }
    })
    
    return components
  }, [analysisResult, filters, searchQuery, sortBy])

  // Group components
  const groupedComponents = useMemo(() => {
    if (groupBy === 'none') return { 'All Components': filteredComponents }
    
    const groups: Record<string, ComponentInfo[]> = {}
    
    filteredComponents.forEach(component => {
      let key = ''
      switch (groupBy) {
        case 'package':
          key = component.package
          break
        case 'component':
          key = component.name[0].toUpperCase()
          break
        case 'file':
          key = component.filePath.split('/').slice(-2).join('/')
          break
      }
      
      if (!groups[key]) groups[key] = []
      groups[key].push(component)
    })
    
    return groups
  }, [filteredComponents, groupBy])

  const exportToMigrationRules = useCallback(() => {
    if (!selectedComponent) return
    
    const rules = {
      id: `${selectedComponent.package}-${selectedComponent.name}`,
      name: `${selectedComponent.name} Migration`,
      description: `Generated migration rules for ${selectedComponent.name}`,
      sourcePackage: selectedComponent.package,
      targetPackage: selectedComponent.package,
      transformations: selectedComponent.props.map(prop => ({
        type: 'prop-rename' as const,
        from: prop.name,
        to: prop.name,
        component: selectedComponent.name
      }))
    }
    
    const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedComponent.name}-migration-rules.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [selectedComponent])

  const renderComponentTree = () => (
    <ScrollArea className="h-[600px]">
      <div className="space-y-4">
        {Object.entries(groupedComponents).map(([group, components]) => (
          <div key={group} className="space-y-2">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
              onClick={() => toggleExpanded(group)}
            >
              {expandedItems.has(group) ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
              <span className="font-semibold">{group}</span>
              <Badge variant="secondary" className="ml-auto">{components.length}</Badge>
            </div>
            
            {expandedItems.has(group) && (
              <div className="ml-6 space-y-1">
                {components.map(component => (
                  <div
                    key={`${component.package}-${component.name}`}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted/50 ${
                      selectedComponent?.name === component.name ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedComponent(component)}
                  >
                    <Component className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{component.name}</span>
                    <Badge variant="outline">{component.usageCount}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  )

  const renderPropsTable = () => {
    if (!selectedComponent) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Component className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a component to view its props</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{selectedComponent.name}</h3>
            <p className="text-sm text-muted-foreground">
              {selectedComponent.package} • {selectedComponent.usageCount} instances
            </p>
          </div>
          <Button onClick={exportToMigrationRules} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Rules
          </Button>
        </div>

        {viewMode === 'compact' ? (
          <div className="space-y-2">
            {selectedComponent.props.map(prop => (
              <div key={prop.name} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{prop.name}</span>
                  {prop.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                </div>
                <span className="text-sm text-muted-foreground">{prop.type}</span>
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prop Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Usage</TableHead>
                {viewMode === 'detailed' && <TableHead>Top Combinations</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedComponent.props.map(prop => (
                <TableRow key={prop.name}>
                  <TableCell className="font-mono">{prop.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">{prop.type}</code>
                  </TableCell>
                  <TableCell>
                    {prop.required ? (
                      <Badge variant="destructive" className="text-xs">Yes</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {prop.defaultValue ? (
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {JSON.stringify(prop.defaultValue)}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{prop.usageCount}</TableCell>
                  {viewMode === 'detailed' && (
                    <TableCell>
                      <div className="space-y-1">
                        {prop.combinations.slice(0, 2).map((combo, idx) => (
                          <div key={idx} className="text-xs">
                            <code className="bg-muted px-1 py-0.5 rounded">
                              {Object.entries(combo.props).map(([k, v]) => 
                                `${k}=${JSON.stringify(v)}`
                              ).join(' ')}
                            </code>
                            <span className="text-muted-foreground ml-2">({combo.count})</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Component Inspector</h2>
        <p className="text-muted-foreground">
          Analyze components and props with advanced filtering and export capabilities
        </p>
      </div>

      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Project</CardTitle>
          <CardDescription>
            Choose a project directory to analyze
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="/path/to/your/project"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSelectProject} disabled={isLoading}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Select
            </Button>
          </div>
          {currentProject && (
            <div className="mt-4 p-4 rounded-md bg-muted">
              <p className="text-sm font-medium">Current Project: {currentProject.name}</p>
              <p className="text-xs text-muted-foreground">{currentProject.path}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Controls */}
      {currentProject && !analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle>Project Analysis</CardTitle>
            <CardDescription>
              Scan the project for JSX components and their usage patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Button onClick={handleAnalyze} disabled={isLoading} size="lg">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Start Analysis
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Sidebar Controls */}
          <div className="space-y-6">
            {/* Search */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Search</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search components..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </CardContent>
            </Card>

            {/* View Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">View Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">View Mode</label>
                  <div className="flex gap-1">
                    <Toggle
                      pressed={viewMode === 'compact'}
                      onPressedChange={() => setViewMode('compact')}
                      size="sm"
                    >
                      <List className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                      pressed={viewMode === 'detailed'}
                      onPressedChange={() => setViewMode('detailed')}
                      size="sm"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Toggle>
                    <Toggle
                      pressed={viewMode === 'comparison'}
                      onPressedChange={() => setViewMode('comparison')}
                      size="sm"
                    >
                      <Eye className="h-4 w-4" />
                    </Toggle>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Group By</label>
                  <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="package">Package</SelectItem>
                      <SelectItem value="component">Component</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort By</label>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="usage">Usage Count</SelectItem>
                      <SelectItem value="package">Package</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Usage Count</label>
                  <Input
                    type="number"
                    min="0"
                    value={filters.usageThreshold}
                    onChange={(e) => setFilters({
                      ...filters,
                      usageThreshold: parseInt(e.target.value) || 0
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="show-required"
                      checked={filters.showRequired}
                      onCheckedChange={(checked) => setFilters({
                        ...filters,
                        showRequired: checked as boolean
                      })}
                    />
                    <label htmlFor="show-required" className="text-sm">
                      Show Required Props
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="show-optional"
                      checked={filters.showOptional}
                      onCheckedChange={(checked) => setFilters({
                        ...filters,
                        showOptional: checked as boolean
                      })}
                    />
                    <label htmlFor="show-optional" className="text-sm">
                      Show Optional Props
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Files</span>
                  <span className="text-sm font-medium">{analysisResult.filesAnalyzed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Components</span>
                  <span className="text-sm font-medium">{analysisResult.componentsFound}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Packages</span>
                  <span className="text-sm font-medium">
                    {analysisResult.packages?.length || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            <Tabs defaultValue="tree" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tree">Component Tree</TabsTrigger>
                <TabsTrigger value="props">Props Table</TabsTrigger>
              </TabsList>
              
              <TabsContent value="tree" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Component Explorer</CardTitle>
                    <CardDescription>
                      Browse components organized by {groupBy}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderComponentTree()}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="props" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Props Combination Analysis</CardTitle>
                    <CardDescription>
                      Detailed view of component props and their usage patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderPropsTable()}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Component Details Panel */}
            {selectedComponent && viewMode === 'comparison' && (
              <Card>
                <CardHeader>
                  <CardTitle>Usage Examples</CardTitle>
                  <CardDescription>
                    Real-world usage patterns for {selectedComponent.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {selectedComponent.instances.slice(0, 5).map((instance, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <FileCode className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-xs">{instance.file}:{instance.line}</span>
                          </div>
                          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                            <code>
                              {`<${selectedComponent.name}\n`}
                              {Object.entries(instance.props).map(([key, value]) => 
                                `  ${key}=${JSON.stringify(value)}\n`
                              ).join('')}
                              {'/>'} 
                            </code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}