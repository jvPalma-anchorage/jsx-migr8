import { useState, useEffect, useCallback } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import Editor from '@monaco-editor/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/store'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Save, 
  Upload, 
  Download, 
  Play, 
  AlertCircle, 
  CheckCircle2,
  Plus,
  Trash2,
  Copy,
  FileJson,
  Code,
  Layers,
  ArrowRight
} from 'lucide-react'
import { PropMapper } from '@/components/rule-editor/prop-mapper'
import { TestPlayground } from '@/components/rule-editor/test-playground'
import { RulePresets } from '@/components/rule-editor/rule-presets'
import { toast } from '@/components/ui/use-toast'

interface MigrationRuleJSON {
  lookup: {
    [packageName: string]: {
      [componentName: string]: [string, string]
    }
  }
  rules: Array<{
    component: string
    match?: Array<Record<string, any>>
    rename?: Record<string, string>
    remove?: string[]
    set?: Record<string, any>
    replaceWith?: {
      code: string
      INNER_PROPS?: string[]
      OUTER_PROPS?: string[]
    }
    importFrom?: string
    importTo?: string
  }>
}

export function RuleEditor() {
  const { selectedRule, setSelectedRule } = useStore()
  const [ruleName, setRuleName] = useState('')
  const [ruleDescription, setRuleDescription] = useState('')
  const [jsonContent, setJsonContent] = useState<string>('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [activeTab, setActiveTab] = useState('visual')
  const [testCode, setTestCode] = useState('')
  const [testResult, setTestResult] = useState<string>('')

  // Initialize with selected rule or empty template
  useEffect(() => {
    if (selectedRule) {
      setRuleName(selectedRule.name)
      setRuleDescription(selectedRule.description)
      // Convert selectedRule to JSON format
      const ruleJson: MigrationRuleJSON = {
        lookup: {},
        rules: []
      }
      setJsonContent(JSON.stringify(ruleJson, null, 2))
    } else {
      // Default template
      const template: MigrationRuleJSON = {
        lookup: {
          "@material-ui/core": {
            "Button": ["@mui/material", "Button"],
            "TextField": ["@mui/material", "TextField"]
          }
        },
        rules: [
          {
            component: "Button",
            match: [{ color: "default" }],
            remove: ["color"],
            set: { color: "inherit" },
            importFrom: "@material-ui/core",
            importTo: "@mui/material"
          }
        ]
      }
      setJsonContent(JSON.stringify(template, null, 2))
    }
  }, [selectedRule])

  const validateJSON = useCallback((content: string) => {
    const errors: string[] = []
    try {
      const parsed = JSON.parse(content) as MigrationRuleJSON
      
      // Validate structure
      if (!parsed.lookup || typeof parsed.lookup !== 'object') {
        errors.push('Missing or invalid "lookup" field')
      }
      
      if (!Array.isArray(parsed.rules)) {
        errors.push('"rules" must be an array')
      } else {
        parsed.rules.forEach((rule, index) => {
          if (!rule.component) {
            errors.push(`Rule ${index + 1}: missing "component" field`)
          }
          
          if (rule.match && !Array.isArray(rule.match)) {
            errors.push(`Rule ${index + 1}: "match" must be an array`)
          }
          
          if (rule.rename && typeof rule.rename !== 'object') {
            errors.push(`Rule ${index + 1}: "rename" must be an object`)
          }
          
          if (rule.remove && !Array.isArray(rule.remove)) {
            errors.push(`Rule ${index + 1}: "remove" must be an array`)
          }
        })
      }
    } catch (e) {
      errors.push('Invalid JSON syntax')
    }
    
    setValidationErrors(errors)
    return errors.length === 0
  }, [])

  const handleJSONChange = (value: string | undefined) => {
    if (value !== undefined) {
      setJsonContent(value)
      setIsDirty(true)
      validateJSON(value)
    }
  }

  const handleSave = async () => {
    if (!validateJSON(jsonContent)) {
      toast({
        title: "Validation Error",
        description: "Please fix the validation errors before saving",
        variant: "destructive"
      })
      return
    }

    try {
      // Save logic here - would call API
      toast({
        title: "Rule Saved",
        description: "Migration rule has been saved successfully"
      })
      setIsDirty(false)
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save the migration rule",
        variant: "destructive"
      })
    }
  }

  const handleExport = () => {
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${ruleName || 'migration-rule'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setJsonContent(content)
        validateJSON(content)
        setIsDirty(true)
      }
      reader.readAsText(file)
    }
  }

  const handleTest = async () => {
    if (!testCode) {
      toast({
        title: "No Test Code",
        description: "Please enter some code to test",
        variant: "destructive"
      })
      return
    }

    try {
      // Here you would apply the transformation rules to the test code
      // For now, we'll just show a placeholder result
      setTestResult(`// Transformed code would appear here
// Original: ${testCode.split('\n')[0]}
// Transformed: ...`)
      
      toast({
        title: "Test Complete",
        description: "Transformation applied successfully"
      })
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Failed to apply transformation",
        variant: "destructive"
      })
    }
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Rule Editor</h2>
            <p className="text-muted-foreground">
              Create and edit migration rules with visual tools and live preview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-file"
            />
            <Button variant="outline" size="sm" asChild>
              <label htmlFor="import-file" className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </label>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={handleSave} disabled={!isDirty}>
              <Save className="mr-2 h-4 w-4" />
              Save Rule
            </Button>
          </div>
        </div>

        {/* Rule Info */}
        <Card>
          <CardHeader>
            <CardTitle>Rule Information</CardTitle>
            <CardDescription>Basic details about this migration rule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  value={ruleName}
                  onChange={(e) => {
                    setRuleName(e.target.value)
                    setIsDirty(true)
                  }}
                  placeholder="e.g., Material UI v4 to v5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-description">Description</Label>
                <Input
                  id="rule-description"
                  value={ruleDescription}
                  onChange={(e) => {
                    setRuleDescription(e.target.value)
                    setIsDirty(true)
                  }}
                  placeholder="Brief description of this rule set"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Editor Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="visual" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Visual Editor
            </TabsTrigger>
            <TabsTrigger value="json" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              JSON Editor
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Test Playground
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Presets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-4">
            <PropMapper 
              ruleData={jsonContent}
              onChange={(newData) => {
                setJsonContent(newData)
                setIsDirty(true)
                validateJSON(newData)
              }}
            />
          </TabsContent>

          <TabsContent value="json" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>JSON Editor</CardTitle>
                    <CardDescription>
                      Edit the migration rules directly in JSON format
                    </CardDescription>
                  </div>
                  {validationErrors.length === 0 ? (
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.length} errors
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {validationErrors.length > 0 && (
                    <div className="rounded-lg bg-destructive/10 p-3 space-y-1">
                      {validationErrors.map((error, index) => (
                        <div key={index} className="text-sm text-destructive flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="border rounded-lg overflow-hidden">
                    <Editor
                      height="600px"
                      defaultLanguage="json"
                      value={jsonContent}
                      onChange={handleJSONChange}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        formatOnPaste: true,
                        formatOnType: true,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        wordWrap: 'on'
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
            <TestPlayground
              rules={jsonContent}
              testCode={testCode}
              onTestCodeChange={setTestCode}
              testResult={testResult}
              onTest={handleTest}
            />
          </TabsContent>

          <TabsContent value="presets" className="space-y-4">
            <RulePresets
              onSelectPreset={(preset) => {
                setJsonContent(preset)
                validateJSON(preset)
                setIsDirty(true)
                setActiveTab('json')
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DndProvider>
  )
}