import { useState, useCallback } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  Trash2, 
  ArrowRight, 
  GripVertical,
  Package,
  Component,
  Hash,
  Type,
  ToggleLeft,
  Calendar
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PropMapperProps {
  ruleData: string
  onChange: (newData: string) => void
}

interface PropMapping {
  id: string
  sourceProp: string
  sourceType: string
  targetProp: string
  targetType: string
  transform?: string
}

interface ComponentMapping {
  id: string
  sourceComponent: string
  sourcePackage: string
  targetComponent: string
  targetPackage: string
  propMappings: PropMapping[]
}

const DraggableProp = ({ prop, type, onDrop }: { prop: string; type: string; onDrop?: (item: any) => void }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'prop',
    item: { prop, type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'prop',
    drop: onDrop,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }))

  const ref = (node: HTMLDivElement | null) => {
    drag(node)
    if (onDrop) {
      drop(node)
    }
  }

  return (
    <div
      ref={ref}
      className={`p-2 rounded-md border cursor-move transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${isOver ? 'border-primary bg-primary/10' : 'border-border'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-medium">{prop}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {type}
        </Badge>
      </div>
    </div>
  )
}

export function PropMapper({ ruleData, onChange }: PropMapperProps) {
  const [componentMappings, setComponentMappings] = useState<ComponentMapping[]>([])
  const [selectedMapping, setSelectedMapping] = useState<string | null>(null)

  // Parse rule data
  const parseRuleData = useCallback(() => {
    try {
      const parsed = JSON.parse(ruleData)
      // Convert to component mappings
      const mappings: ComponentMapping[] = []
      
      if (parsed.lookup) {
        Object.entries(parsed.lookup).forEach(([pkg, components]) => {
          Object.entries(components as any).forEach(([comp, target]) => {
            if (Array.isArray(target)) {
              mappings.push({
                id: `${pkg}-${comp}`,
                sourcePackage: pkg,
                sourceComponent: comp,
                targetPackage: target[0],
                targetComponent: target[1],
                propMappings: []
              })
            }
          })
        })
      }
      
      setComponentMappings(mappings)
    } catch (e) {
      console.error('Failed to parse rule data:', e)
    }
  }, [ruleData])

  const updateRuleData = useCallback(() => {
    // Convert component mappings back to rule format
    const lookup: any = {}
    const rules: any[] = []
    
    componentMappings.forEach((mapping) => {
      if (!lookup[mapping.sourcePackage]) {
        lookup[mapping.sourcePackage] = {}
      }
      lookup[mapping.sourcePackage][mapping.sourceComponent] = [
        mapping.targetPackage,
        mapping.targetComponent
      ]
      
      // Generate rules from prop mappings
      mapping.propMappings.forEach((propMap) => {
        if (propMap.sourceProp !== propMap.targetProp) {
          rules.push({
            component: mapping.sourceComponent,
            rename: {
              [propMap.sourceProp]: propMap.targetProp
            },
            importFrom: mapping.sourcePackage,
            importTo: mapping.targetPackage
          })
        }
      })
    })
    
    const newData = JSON.stringify({ lookup, rules }, null, 2)
    onChange(newData)
  }, [componentMappings, onChange])

  const addComponentMapping = () => {
    const newMapping: ComponentMapping = {
      id: `mapping-${Date.now()}`,
      sourceComponent: '',
      sourcePackage: '',
      targetComponent: '',
      targetPackage: '',
      propMappings: []
    }
    setComponentMappings([...componentMappings, newMapping])
    setSelectedMapping(newMapping.id)
  }

  const updateComponentMapping = (id: string, updates: Partial<ComponentMapping>) => {
    setComponentMappings(mappings =>
      mappings.map(m => m.id === id ? { ...m, ...updates } : m)
    )
    updateRuleData()
  }

  const deleteComponentMapping = (id: string) => {
    setComponentMappings(mappings => mappings.filter(m => m.id !== id))
    if (selectedMapping === id) {
      setSelectedMapping(null)
    }
    updateRuleData()
  }

  const addPropMapping = (componentId: string) => {
    const newProp: PropMapping = {
      id: `prop-${Date.now()}`,
      sourceProp: '',
      sourceType: 'string',
      targetProp: '',
      targetType: 'string'
    }
    
    setComponentMappings(mappings =>
      mappings.map(m => 
        m.id === componentId 
          ? { ...m, propMappings: [...m.propMappings, newProp] }
          : m
      )
    )
    updateRuleData()
  }

  const updatePropMapping = (componentId: string, propId: string, updates: Partial<PropMapping>) => {
    setComponentMappings(mappings =>
      mappings.map(m => 
        m.id === componentId 
          ? {
              ...m,
              propMappings: m.propMappings.map(p =>
                p.id === propId ? { ...p, ...updates } : p
              )
            }
          : m
      )
    )
    updateRuleData()
  }

  const deletePropMapping = (componentId: string, propId: string) => {
    setComponentMappings(mappings =>
      mappings.map(m => 
        m.id === componentId 
          ? {
              ...m,
              propMappings: m.propMappings.filter(p => p.id !== propId)
            }
          : m
      )
    )
    updateRuleData()
  }

  const selectedComponent = componentMappings.find(m => m.id === selectedMapping)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Component Mappings List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Component Mappings</CardTitle>
              <CardDescription>Define how components map between libraries</CardDescription>
            </div>
            <Button size="sm" onClick={addComponentMapping}>
              <Plus className="mr-2 h-4 w-4" />
              Add Mapping
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {componentMappings.map((mapping) => (
                <Card
                  key={mapping.id}
                  className={`cursor-pointer transition-colors ${
                    selectedMapping === mapping.id ? 'border-primary' : ''
                  }`}
                  onClick={() => setSelectedMapping(mapping.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {mapping.sourcePackage || 'No source package'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Component className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {mapping.sourceComponent || 'No source component'}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-sm">
                            {mapping.targetComponent || 'No target component'}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteComponentMapping(mapping.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {componentMappings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No component mappings yet. Click "Add Mapping" to start.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected Component Details */}
      {selectedComponent ? (
        <Card>
          <CardHeader>
            <CardTitle>Mapping Details</CardTitle>
            <CardDescription>Configure component and prop mappings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Component Info */}
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Source Package</Label>
                  <Input
                    value={selectedComponent.sourcePackage}
                    onChange={(e) => updateComponentMapping(selectedComponent.id, { sourcePackage: e.target.value })}
                    placeholder="e.g., @material-ui/core"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Source Component</Label>
                  <Input
                    value={selectedComponent.sourceComponent}
                    onChange={(e) => updateComponentMapping(selectedComponent.id, { sourceComponent: e.target.value })}
                    placeholder="e.g., Button"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Target Package</Label>
                  <Input
                    value={selectedComponent.targetPackage}
                    onChange={(e) => updateComponentMapping(selectedComponent.id, { targetPackage: e.target.value })}
                    placeholder="e.g., @mui/material"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Target Component</Label>
                  <Input
                    value={selectedComponent.targetComponent}
                    onChange={(e) => updateComponentMapping(selectedComponent.id, { targetComponent: e.target.value })}
                    placeholder="e.g., Button"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Prop Mappings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Prop Mappings</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addPropMapping(selectedComponent.id)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Prop
                </Button>
              </div>
              
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {selectedComponent.propMappings.map((propMap) => (
                    <Card key={propMap.id}>
                      <CardContent className="p-3">
                        <div className="grid gap-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Source Prop</Label>
                              <Input
                                value={propMap.sourceProp}
                                onChange={(e) => updatePropMapping(selectedComponent.id, propMap.id, { sourceProp: e.target.value })}
                                placeholder="e.g., color"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Target Prop</Label>
                              <Input
                                value={propMap.targetProp}
                                onChange={(e) => updatePropMapping(selectedComponent.id, propMap.id, { targetProp: e.target.value })}
                                placeholder="e.g., variant"
                                className="h-8"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={propMap.sourceType}
                              onValueChange={(value) => updatePropMapping(selectedComponent.id, propMap.id, { sourceType: value })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="object">Object</SelectItem>
                                <SelectItem value="array">Array</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <div className="flex items-center gap-1">
                              <Select
                                value={propMap.targetType}
                                onValueChange={(value) => updatePropMapping(selectedComponent.id, propMap.id, { targetType: value })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">String</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="boolean">Boolean</SelectItem>
                                  <SelectItem value="object">Object</SelectItem>
                                  <SelectItem value="array">Array</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => deletePropMapping(selectedComponent.id, propMap.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {selectedComponent.propMappings.length === 0 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No prop mappings yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-[600px]">
            <div className="text-center text-muted-foreground">
              <Component className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a component mapping to edit details</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}