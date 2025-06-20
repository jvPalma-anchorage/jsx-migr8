import { Project, AnalysisResult, MigrationRule, BackupInfo } from '@/types'

const API_BASE_URL = '/api'

export class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // Project operations
  async createProject(path: string, name: string): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ path, name }),
    })
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`)
  }

  async analyzeProject(projectId: string): Promise<AnalysisResult> {
    return this.request<AnalysisResult>(`/projects/${projectId}/analyze`, {
      method: 'POST',
    })
  }

  // Migration operations
  async getMigrationRules(): Promise<MigrationRule[]> {
    return this.request<MigrationRule[]>('/migration/rules')
  }

  async createMigrationRule(rule: Omit<MigrationRule, 'id'>): Promise<MigrationRule> {
    return this.request<MigrationRule>('/migration/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    })
  }

  async startMigration(
    projectId: string,
    ruleId: string,
    options: { dryRun?: boolean; backup?: boolean } = {}
  ): Promise<{ taskId: string }> {
    return this.request<{ taskId: string }>(`/projects/${projectId}/migrate`, {
      method: 'POST',
      body: JSON.stringify({ ruleId, ...options }),
    })
  }

  async getMigrationStatus(taskId: string): Promise<any> {
    return this.request<any>(`/migration/tasks/${taskId}`)
  }

  // Backup operations
  async getBackups(projectId: string): Promise<BackupInfo[]> {
    return this.request<BackupInfo[]>(`/projects/${projectId}/backups`)
  }

  async createBackup(projectId: string, description?: string): Promise<BackupInfo> {
    return this.request<BackupInfo>(`/projects/${projectId}/backups`, {
      method: 'POST',
      body: JSON.stringify({ description }),
    })
  }

  async restoreBackup(projectId: string, backupId: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}/backups/${backupId}/restore`, {
      method: 'POST',
    })
  }

  async deleteBackup(projectId: string, backupId: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}/backups/${backupId}`, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()