import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Play, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  FileCode,
  FileJson,
  ArrowRight
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface TestPlaygroundProps {
  rules: string
  testCode: string
  onTestCodeChange: (code: string) => void
  testResult: string
  onTest: () => void
}

export function TestPlayground({
  rules,
  testCode,
  onTestCodeChange,
  testResult,
  onTest
}: TestPlaygroundProps) {
  const [activeView, setActiveView] = useState<'side-by-side' | 'diff'>('side-by-side')
  const [showAst, setShowAst] = useState(false)

  const sampleCode = `import React from 'react';
import { Button, TextField } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
  button: {
    marginTop: theme.spacing(1),
  },
}));

function MyComponent() {
  const classes = useStyles();
  
  return (
    <div className={classes.root}>
      <TextField
        label="Name"
        variant="outlined"
        fullWidth
        margin="normal"
      />
      <Button
        variant="contained"
        color="primary"
        className={classes.button}
      >
        Submit
      </Button>
    </div>
  );
}

export default MyComponent;`

  const handleCopySample = () => {
    onTestCodeChange(sampleCode)
    toast({
      title: "Sample Loaded",
      description: "Sample code has been loaded into the editor"
    })
  }

  const handleCopyResult = () => {
    navigator.clipboard.writeText(testResult)
    toast({
      title: "Copied",
      description: "Result code copied to clipboard"
    })
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Test Playground</CardTitle>
              <CardDescription>
                Test your migration rules against sample code
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopySample}>
                <FileCode className="mr-2 h-4 w-4" />
                Load Sample
              </Button>
              <Button onClick={onTest} disabled={!testCode}>
                <Play className="mr-2 h-4 w-4" />
                Run Test
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Code Editors */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Input Code */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Input Code</CardTitle>
                <Badge variant="outline">Source</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Editor
                height="500px"
                defaultLanguage="typescript"
                value={testCode}
                onChange={(value) => onTestCodeChange(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on'
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Output/Result */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Transformed Code</CardTitle>
                <Badge variant="default">Result</Badge>
              </div>
              {testResult && (
                <Button variant="ghost" size="sm" onClick={handleCopyResult}>
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="side-by-side">Result</TabsTrigger>
                <TabsTrigger value="diff">Diff View</TabsTrigger>
              </TabsList>
              
              <TabsContent value="side-by-side" className="mt-4">
                <div className="border rounded-lg overflow-hidden">
                  <Editor
                    height="460px"
                    defaultLanguage="typescript"
                    value={testResult || '// Run test to see transformed code'}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      wordWrap: 'on'
                    }}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="diff" className="mt-4">
                <div className="border rounded-lg p-4 bg-muted/50">
                  <p className="text-sm text-muted-foreground text-center">
                    Diff view would show here with added/removed lines highlighted
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Transformation Details */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transformation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>3 imports updated</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>2 components renamed</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>4 props transformed</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span>1 manual review needed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}