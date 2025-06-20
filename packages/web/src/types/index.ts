export interface Project {
  id: string
  name: string
  path: string
  status: 'idle' | 'analyzing' | 'migrating' | 'completed' | 'error'
  lastModified: Date
}

export interface AnalysisResult {
  filesAnalyzed: number
  componentsFound: number
  propsUsage: Record<string, number>
  imports: string[]
  suggestions: string[]
  components?: ComponentInfo[]
  packages?: PackageInfo[]
}

export interface ComponentInfo {
  name: string
  package: string
  filePath: string
  props: PropInfo[]
  usageCount: number
  instances: ComponentInstance[]
}

export interface PropInfo {
  name: string
  type: string
  required: boolean
  defaultValue?: any
  description?: string
  usageCount: number
  combinations: PropCombination[]
}

export interface PropCombination {
  props: Record<string, any>
  count: number
  files: string[]
}

export interface ComponentInstance {
  file: string
  line: number
  props: Record<string, any>
}

export interface PackageInfo {
  name: string
  version?: string
  components: string[]
}

export type ViewMode = 'compact' | 'detailed' | 'comparison'
export type GroupBy = 'component' | 'package' | 'file' | 'none'
export type SortBy = 'name' | 'usage' | 'package' | 'modified'

export interface FilterOptions {
  packages: string[]
  components: string[]
  propTypes: string[]
  usageThreshold: number
  showRequired: boolean
  showOptional: boolean
}

export interface MigrationRule {
  id: string
  name: string
  description: string
  sourcePackage: string
  targetPackage: string
  transformations: Transformation[]
  lookup?: Record<string, Record<string, [string, string]>>
  rules?: Array<{
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

export interface Transformation {
  type: 'prop-rename' | 'prop-remove' | 'component-rename' | 'import-change'
  from: string
  to?: string
  component?: string
}

export interface MigrationProgress {
  total: number
  completed: number
  current: string
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error'
  errors: string[]
}

export interface BackupInfo {
  id: string
  timestamp: Date
  files: string[]
  size: number
  description?: string
}

export interface WebSocketMessage {
  type: 'progress' | 'log' | 'error' | 'complete'
  data: any
}