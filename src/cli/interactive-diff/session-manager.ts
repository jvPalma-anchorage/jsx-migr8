/**
 * Session State Management for Interactive Diff Review
 * 
 * Handles persistence, recovery, and state management for review sessions
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { default as chalk } from "chalk";
import { ReviewSession, ReviewDecision, FileTransformation } from "./review-system";
import { lSuccess, lError, lWarning } from "../../context/globalContext";
import { logSecurityEvent } from "../../validation";

export interface SessionStorage {
  sessions: Record<string, StoredSession>;
  lastUpdated: Date;
  version: string;
}

export interface StoredSession {
  id: string;
  startTime: Date;
  lastActivity: Date;
  sessionState: 'active' | 'completed' | 'stopped' | 'abandoned';
  progress: {
    currentIndex: number;
    totalFiles: number;
    decisionsCount: number;
  };
  metadata: {
    projectPath?: string;
    migrationRuleName?: string;
    userAgent?: string;
  };
  decisions: ReviewDecision[];
  checkpoints: SessionCheckpoint[];
}

export interface SessionCheckpoint {
  index: number;
  timestamp: Date;
  decision: ReviewDecision;
  canRevert: boolean;
}

export class SessionManager {
  private static readonly STORAGE_FILE = '.jsx-migr8-sessions.json';
  private static readonly MAX_SESSIONS = 50;
  private static readonly SESSION_TIMEOUT_HOURS = 24;
  
  private storageFile: string;
  private storage: SessionStorage;

  constructor(projectPath?: string) {
    this.storageFile = projectPath 
      ? join(projectPath, SessionManager.STORAGE_FILE)
      : SessionManager.STORAGE_FILE;
    
    this.storage = this.loadStorage();
  }

  /**
   * Save a review session
   */
  async saveSession(session: ReviewSession): Promise<void> {
    try {
      const storedSession: StoredSession = {
        id: session.id,
        startTime: session.startTime,
        lastActivity: new Date(),
        sessionState: session.sessionState,
        progress: {
          currentIndex: session.currentIndex,
          totalFiles: session.transformations.length,
          decisionsCount: session.decisions.length
        },
        metadata: {
          projectPath: process.cwd(),
          userAgent: process.env.USER || 'unknown'
        },
        decisions: session.decisions,
        checkpoints: this.createCheckpoints(session)
      };

      this.storage.sessions[session.id] = storedSession;
      this.storage.lastUpdated = new Date();
      
      await this.persistStorage();
      
      logSecurityEvent(
        'session-saved',
        'info',
        'Review session saved successfully',
        { sessionId: session.id }
      );
      
    } catch (error) {
      lError('Failed to save session:', error as any);
      throw new Error(`Session save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load a review session
   */
  async loadSession(sessionId: string): Promise<StoredSession | null> {
    try {
      const session = this.storage.sessions[sessionId];
      
      if (!session) {
        return null;
      }

      // Check if session is expired
      const now = new Date();
      const lastActivity = new Date(session.lastActivity);
      const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceActivity > SessionManager.SESSION_TIMEOUT_HOURS) {
        lWarning(`Session ${sessionId} has expired (${Math.round(hoursSinceActivity)}h old)`);
        session.sessionState = 'abandoned';
        await this.persistStorage();
      }

      logSecurityEvent(
        'session-loaded',
        'info',
        'Review session loaded successfully',
        { sessionId, sessionState: session.sessionState }
      );

      return session;
    } catch (error) {
      lError('Failed to load session:', error as any);
      return null;
    }
  }

  /**
   * List all available sessions
   */
  listSessions(): StoredSession[] {
    const sessions = Object.values(this.storage.sessions);
    
    // Sort by last activity (most recent first)
    return sessions.sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): StoredSession[] {
    return this.listSessions().filter(session => 
      session.sessionState === 'active'
    );
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      if (this.storage.sessions[sessionId]) {
        delete this.storage.sessions[sessionId];
        this.storage.lastUpdated = new Date();
        await this.persistStorage();
        
        logSecurityEvent(
          'session-deleted',
          'info',
          'Review session deleted',
          { sessionId }
        );
      }
    } catch (error) {
      lError('Failed to delete session:', error as any);
      throw error;
    }
  }

  /**
   * Clean up old sessions
   */
  async cleanupSessions(): Promise<void> {
    try {
      const sessions = this.listSessions();
      const now = new Date();
      let cleanedCount = 0;

      // Remove expired sessions
      for (const session of sessions) {
        const lastActivity = new Date(session.lastActivity);
        const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceActivity > SessionManager.SESSION_TIMEOUT_HOURS && 
            session.sessionState !== 'active') {
          delete this.storage.sessions[session.id];
          cleanedCount++;
        }
      }

      // Remove oldest sessions if we exceed the limit
      const remainingSessions = this.listSessions();
      if (remainingSessions.length > SessionManager.MAX_SESSIONS) {
        const excessSessions = remainingSessions
          .slice(SessionManager.MAX_SESSIONS)
          .filter(session => session.sessionState !== 'active');
        
        for (const session of excessSessions) {
          delete this.storage.sessions[session.id];
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.storage.lastUpdated = new Date();
        await this.persistStorage();
        lSuccess(`Cleaned up ${cleanedCount} old sessions`);
      }

      logSecurityEvent(
        'sessions-cleaned',
        'info',
        'Session cleanup completed',
        { cleanedCount }
      );

    } catch (error) {
      lError('Failed to cleanup sessions:', error as any);
    }
  }

  /**
   * Create session checkpoint
   */
  createCheckpoint(session: ReviewSession, canRevert: boolean = true): SessionCheckpoint {
    const lastDecision = session.decisions[session.decisions.length - 1];
    
    return {
      index: session.currentIndex,
      timestamp: new Date(),
      decision: lastDecision,
      canRevert
    };
  }

  /**
   * Restore session from checkpoint
   */
  async restoreFromCheckpoint(
    session: ReviewSession, 
    checkpointIndex: number
  ): Promise<ReviewSession> {
    try {
      const storedSession = await this.loadSession(session.id);
      
      if (!storedSession || !storedSession.checkpoints[checkpointIndex]) {
        throw new Error('Checkpoint not found');
      }

      const checkpoint = storedSession.checkpoints[checkpointIndex];
      
      if (!checkpoint.canRevert) {
        throw new Error('Checkpoint cannot be reverted');
      }

      // Restore session state to checkpoint
      session.currentIndex = checkpoint.index;
      session.decisions = session.decisions.slice(0, checkpointIndex + 1);
      
      logSecurityEvent(
        'session-checkpoint-restored',
        'info',
        'Session restored from checkpoint',
        { sessionId: session.id, checkpointIndex }
      );

      return session;
    } catch (error) {
      lError('Failed to restore from checkpoint:', error as any);
      throw error;
    }
  }

  /**
   * Export session data
   */
  async exportSession(sessionId: string, outputPath?: string): Promise<string> {
    try {
      const session = await this.loadSession(sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      const exportData = {
        exportedAt: new Date(),
        session,
        summary: {
          totalFiles: session.progress.totalFiles,
          reviewed: session.progress.decisionsCount,
          confirmed: session.decisions.filter(d => d.action === 'confirm').length,
          needsAdjust: session.decisions.filter(d => d.action === 'needs-adjust').length,
          duration: session.lastActivity.getTime() - session.startTime.getTime()
        }
      };

      const fileName = outputPath || `migration-review-${sessionId}.json`;
      writeFileSync(fileName, JSON.stringify(exportData, null, 2));
      
      lSuccess(`Session exported to: ${fileName}`);
      return fileName;
    } catch (error) {
      lError('Failed to export session:', error as any);
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    averageFilesPerSession: number;
    totalFilesReviewed: number;
  } {
    const sessions = this.listSessions();
    
    const stats = {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.sessionState === 'active').length,
      completedSessions: sessions.filter(s => s.sessionState === 'completed').length,
      averageFilesPerSession: 0,
      totalFilesReviewed: 0
    };

    if (sessions.length > 0) {
      const totalFiles = sessions.reduce((sum, s) => sum + s.progress.totalFiles, 0);
      stats.averageFilesPerSession = Math.round(totalFiles / sessions.length);
      stats.totalFilesReviewed = sessions.reduce((sum, s) => sum + s.progress.decisionsCount, 0);
    }

    return stats;
  }

  /**
   * Load storage from file
   */
  private loadStorage(): SessionStorage {
    try {
      if (existsSync(this.storageFile)) {
        const data = readFileSync(this.storageFile, 'utf8');
        const parsed = JSON.parse(data);
        
        // Validate and migrate if necessary
        return this.validateAndMigrateStorage(parsed);
      }
    } catch (error) {
      lWarning('Failed to load session storage, creating new:', error as any);
    }

    return {
      sessions: {},
      lastUpdated: new Date(),
      version: '1.0.0'
    };
  }

  /**
   * Persist storage to file
   */
  private async persistStorage(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = dirname(this.storageFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(this.storageFile, JSON.stringify(this.storage, null, 2));
    } catch (error) {
      lError('Failed to persist session storage:', error as any);
      throw error;
    }
  }

  /**
   * Validate and migrate storage format
   */
  private validateAndMigrateStorage(data: any): SessionStorage {
    // Basic validation
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid storage format');
    }

    // Set defaults for missing properties
    const storage: SessionStorage = {
      sessions: data.sessions || {},
      lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : new Date(),
      version: data.version || '1.0.0'
    };

    // Convert date strings to Date objects
    Object.values(storage.sessions).forEach((session: any) => {
      if (session.startTime && typeof session.startTime === 'string') {
        session.startTime = new Date(session.startTime);
      }
      if (session.lastActivity && typeof session.lastActivity === 'string') {
        session.lastActivity = new Date(session.lastActivity);
      }
      if (session.decisions) {
        session.decisions.forEach((decision: any) => {
          if (decision.timestamp && typeof decision.timestamp === 'string') {
            decision.timestamp = new Date(decision.timestamp);
          }
        });
      }
    });

    return storage;
  }

  /**
   * Create checkpoints from session
   */
  private createCheckpoints(session: ReviewSession): SessionCheckpoint[] {
    return session.decisions.map((decision, index) => ({
      index,
      timestamp: decision.timestamp,
      decision,
      canRevert: true
    }));
  }
}

/**
 * Decision tracking utilities
 */
export class DecisionTracker {
  private decisions: ReviewDecision[] = [];
  
  /**
   * Add a decision
   */
  addDecision(decision: ReviewDecision): void {
    this.decisions.push(decision);
    
    logSecurityEvent(
      'decision-tracked',
      'info',
      'File decision tracked',
      { 
        action: decision.action,
        filePath: decision.filePath,
        hasReason: !!decision.reason
      }
    );
  }

  /**
   * Remove last decision (for navigation back)
   */
  removeLastDecision(): ReviewDecision | undefined {
    const decision = this.decisions.pop();
    
    if (decision) {
      logSecurityEvent(
        'decision-removed',
        'info',
        'Last decision removed (navigation back)',
        { 
          action: decision.action,
          filePath: decision.filePath
        }
      );
    }
    
    return decision;
  }

  /**
   * Get decisions summary
   */
  getSummary(): {
    total: number;
    confirmed: number;
    needsAdjust: number;
    stopped: number;
  } {
    return {
      total: this.decisions.length,
      confirmed: this.decisions.filter(d => d.action === 'confirm').length,
      needsAdjust: this.decisions.filter(d => d.action === 'needs-adjust').length,
      stopped: this.decisions.filter(d => d.action === 'stop').length
    };
  }

  /**
   * Get all decisions
   */
  getAllDecisions(): ReviewDecision[] {
    return [...this.decisions];
  }

  /**
   * Clear all decisions
   */
  clear(): void {
    this.decisions = [];
  }
}

/**
 * Progress tracking utilities
 */
export class ProgressTracker {
  private currentIndex: number = 0;
  private totalFiles: number;
  private startTime: Date;
  private milestones: Array<{ index: number; timestamp: Date }> = [];

  constructor(totalFiles: number) {
    this.totalFiles = totalFiles;
    this.startTime = new Date();
  }

  /**
   * Update current progress
   */
  updateProgress(index: number): void {
    this.currentIndex = index;
    
    // Track milestones (every 25% progress)
    const progressPercent = (index / this.totalFiles) * 100;
    const milestone = Math.floor(progressPercent / 25) * 25;
    
    const existingMilestone = this.milestones.find(m => {
      const mPercent = (m.index / this.totalFiles) * 100;
      return Math.floor(mPercent / 25) * 25 === milestone;
    });

    if (!existingMilestone && milestone > 0 && index > 0) {
      this.milestones.push({ index, timestamp: new Date() });
      
      logSecurityEvent(
        'progress-milestone',
        'info',
        'Progress milestone reached',
        { milestone: `${milestone}%`, index, totalFiles: this.totalFiles }
      );
    }
  }

  /**
   * Get current progress information
   */
  getProgress(): {
    current: number;
    total: number;
    percentage: number;
    elapsed: number;
    estimatedRemaining?: number;
    rate?: number;
  } {
    const elapsed = Date.now() - this.startTime.getTime();
    const percentage = (this.currentIndex / this.totalFiles) * 100;
    
    let estimatedRemaining: number | undefined;
    let rate: number | undefined;
    
    if (this.currentIndex > 0) {
      rate = this.currentIndex / (elapsed / 1000); // files per second
      const remaining = this.totalFiles - this.currentIndex;
      estimatedRemaining = remaining / rate * 1000; // milliseconds
    }

    return {
      current: this.currentIndex,
      total: this.totalFiles,
      percentage: Math.round(percentage * 100) / 100,
      elapsed,
      estimatedRemaining,
      rate
    };
  }

  /**
   * Get formatted progress string
   */
  getFormattedProgress(): string {
    const progress = this.getProgress();
    let result = `${progress.current}/${progress.total} (${progress.percentage}%)`;
    
    if (progress.estimatedRemaining && progress.rate) {
      const remainingMin = Math.round(progress.estimatedRemaining / 60000);
      result += ` - ~${remainingMin}min remaining`;
    }
    
    return result;
  }
}