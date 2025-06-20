import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Package, 
  ArrowRight, 
  Download,
  Star,
  GitBranch,
  Users
} from 'lucide-react'

interface RulePresetsProps {
  onSelectPreset: (preset: string) => void
}

interface Preset {
  id: string
  name: string
  description: string
  source: string
  target: string
  version: string
  downloads: number
  stars: number
  author: string
  tags: string[]
  ruleData: any
}

const presets: Preset[] = [
  {
    id: 'mui-v4-to-v5',
    name: 'Material-UI v4 to v5',
    description: 'Complete migration rules for Material-UI v4 to MUI v5 including theme changes',
    source: '@material-ui/core',
    target: '@mui/material',
    version: '2.0.0',
    downloads: 12500,
    stars: 89,
    author: 'MUI Team',
    tags: ['material-ui', 'mui', 'react', 'migration'],
    ruleData: {
      lookup: {
        "@material-ui/core": {
          "Button": ["@mui/material", "Button"],
          "TextField": ["@mui/material", "TextField"],
          "AppBar": ["@mui/material", "AppBar"],
          "Toolbar": ["@mui/material", "Toolbar"],
          "Typography": ["@mui/material", "Typography"],
          "IconButton": ["@mui/material", "IconButton"],
          "Grid": ["@mui/material", "Grid"],
          "Paper": ["@mui/material", "Paper"],
          "Box": ["@mui/material", "Box"]
        },
        "@material-ui/icons": {
          "*": ["@mui/icons-material", "*"]
        },
        "@material-ui/core/styles": {
          "makeStyles": ["@mui/styles", "makeStyles"],
          "createMuiTheme": ["@mui/material/styles", "createTheme"],
          "ThemeProvider": ["@mui/material/styles", "ThemeProvider"]
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
        },
        {
          component: "TextField",
          match: [{ rowsMax: "*" }],
          rename: { rowsMax: "maxRows" },
          importFrom: "@material-ui/core",
          importTo: "@mui/material"
        }
      ]
    }
  },
  {
    id: 'antd-v4-to-v5',
    name: 'Ant Design v4 to v5',
    description: 'Migration rules for Ant Design v4 to v5 with CSS-in-JS updates',
    source: 'antd',
    target: 'antd',
    version: '1.5.0',
    downloads: 8900,
    stars: 67,
    author: 'Ant Design Team',
    tags: ['antd', 'ant-design', 'react', 'migration'],
    ruleData: {
      lookup: {
        "antd": {
          "Button": ["antd", "Button"],
          "Input": ["antd", "Input"],
          "Select": ["antd", "Select"],
          "DatePicker": ["antd", "DatePicker"],
          "Form": ["antd", "Form"],
          "Table": ["antd", "Table"],
          "Modal": ["antd", "Modal"]
        }
      },
      rules: [
        {
          component: "Button",
          match: [{ type: "danger" }],
          set: { danger: true },
          remove: ["type"],
          importFrom: "antd",
          importTo: "antd"
        },
        {
          component: "Form.Item",
          rename: { validateStatus: "status" },
          importFrom: "antd",
          importTo: "antd"
        }
      ]
    }
  },
  {
    id: 'bootstrap-to-tailwind',
    name: 'Bootstrap to Tailwind CSS',
    description: 'Convert Bootstrap utility classes to Tailwind CSS equivalents',
    source: 'bootstrap',
    target: 'tailwindcss',
    version: '1.2.0',
    downloads: 5600,
    stars: 45,
    author: 'Community',
    tags: ['bootstrap', 'tailwind', 'css', 'utility-first'],
    ruleData: {
      lookup: {},
      rules: [
        {
          component: "*",
          classNameMap: {
            "btn": "button",
            "btn-primary": "bg-blue-500 text-white hover:bg-blue-600",
            "btn-secondary": "bg-gray-500 text-white hover:bg-gray-600",
            "container": "max-w-7xl mx-auto px-4",
            "row": "flex flex-wrap -mx-4",
            "col": "px-4"
          }
        }
      ]
    }
  },
  {
    id: 'chakra-v1-to-v2',
    name: 'Chakra UI v1 to v2',
    description: 'Migration guide for Chakra UI v1 to v2 with theme token updates',
    source: '@chakra-ui/core',
    target: '@chakra-ui/react',
    version: '1.0.0',
    downloads: 3400,
    stars: 28,
    author: 'Chakra Team',
    tags: ['chakra-ui', 'react', 'migration', 'design-system'],
    ruleData: {
      lookup: {
        "@chakra-ui/core": {
          "Box": ["@chakra-ui/react", "Box"],
          "Button": ["@chakra-ui/react", "Button"],
          "Text": ["@chakra-ui/react", "Text"],
          "Flex": ["@chakra-ui/react", "Flex"],
          "Stack": ["@chakra-ui/react", "Stack"],
          "Input": ["@chakra-ui/react", "Input"]
        }
      },
      rules: [
        {
          component: "Button",
          match: [{ variantColor: "*" }],
          rename: { variantColor: "colorScheme" },
          importFrom: "@chakra-ui/core",
          importTo: "@chakra-ui/react"
        }
      ]
    }
  }
]

export function RulePresets({ onSelectPreset }: RulePresetsProps) {
  const handleSelectPreset = (preset: Preset) => {
    onSelectPreset(JSON.stringify(preset.ruleData, null, 2))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Rule Presets</CardTitle>
          <CardDescription>
            Start with pre-configured migration rules for popular libraries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="grid gap-4">
              {presets.map((preset) => (
                <Card key={preset.id} className="cursor-pointer hover:border-primary transition-colors">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">{preset.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {preset.description}
                          </p>
                        </div>
                        <Badge variant="outline">{preset.version}</Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>{preset.source}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{preset.target}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Download className="h-4 w-4" />
                          <span>{preset.downloads.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4" />
                          <span>{preset.stars}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{preset.author}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {preset.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSelectPreset(preset)}
                        >
                          Use Preset
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}