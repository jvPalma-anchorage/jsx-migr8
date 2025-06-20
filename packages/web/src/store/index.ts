import { create } from 'zustand'
import { Project, AnalysisResult, MigrationProgress, BackupInfo, MigrationRule } from '@/types'

interface AppState {
  // Current project
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
  
  // Analysis results
  analysisResult: AnalysisResult | null
  setAnalysisResult: (result: AnalysisResult | null) => void
  
  // Migration
  migrationProgress: MigrationProgress | null
  setMigrationProgress: (progress: MigrationProgress | null) => void
  migrationRules: MigrationRule[]
  setMigrationRules: (rules: MigrationRule[]) => void
  selectedRule: MigrationRule | null
  setSelectedRule: (rule: MigrationRule | null) => void
  
  // Backups
  backups: BackupInfo[]
  setBackups: (backups: BackupInfo[]) => void
  
  // UI state
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  error: string | null
  setError: (error: string | null) => void
  
  // WebSocket connection
  isConnected: boolean
  setIsConnected: (connected: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  // Current project
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),
  
  // Analysis results
  analysisResult: null,
  setAnalysisResult: (result) => set({ analysisResult: result }),
  
  // Migration
  migrationProgress: null,
  setMigrationProgress: (progress) => set({ migrationProgress: progress }),
  migrationRules: [],
  setMigrationRules: (rules) => set({ migrationRules: rules }),
  selectedRule: null,
  setSelectedRule: (rule) => set({ selectedRule: rule }),
  
  // Backups
  backups: [],
  setBackups: (backups) => set({ backups: backups }),
  
  // UI state
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  error: null,
  setError: (error) => set({ error: error }),
  
  // WebSocket connection
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),
}))