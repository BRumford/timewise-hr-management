import { db } from '../db';
import { storage } from '../storage';
import { emailAlerts } from '../emailAlerts';
import { AuditLogger } from './auditLogger';
import { DataEncryption } from './dataEncryption';
import * as fs from 'fs';
import * as path from 'path';

export interface BackupConfig {
  enabled: boolean;
  schedule: 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
  encryptionEnabled: boolean;
  remoteStorage: boolean;
  backupPath: string;
}

export interface BackupRecord {
  id: string;
  timestamp: Date;
  type: 'full' | 'incremental' | 'differential';
  size: number;
  status: 'completed' | 'failed' | 'in_progress';
  location: string;
  encrypted: boolean;
  tables: string[];
  checksum: string;
  errorMessage?: string;
}

export interface DisasterRecoveryPlan {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  rto: number; // Recovery Time Objective in minutes
  rpo: number; // Recovery Point Objective in minutes
  procedures: string[];
  contacts: string[];
  lastTested: Date;
  nextTest: Date;
  status: 'active' | 'inactive' | 'testing';
}

export class BackupManager {
  private static backupConfig: BackupConfig = {
    enabled: true,
    schedule: 'daily',
    retentionDays: 90,
    encryptionEnabled: true,
    remoteStorage: false,
    backupPath: './backups'
  };

  private static backupHistory: BackupRecord[] = [];

  // Create full database backup
  static async createFullBackup(): Promise<BackupRecord> {
    const backupId = `full_${Date.now()}`;
    const timestamp = new Date();
    const backupPath = path.join(this.backupConfig.backupPath, `${backupId}.sql`);

    const backupRecord: BackupRecord = {
      id: backupId,
      timestamp,
      type: 'full',
      size: 0,
      status: 'in_progress',
      location: backupPath,
      encrypted: this.backupConfig.encryptionEnabled,
      tables: [],
      checksum: ''
    };

    try {
      // Ensure backup directory exists
      if (!fs.existsSync(this.backupConfig.backupPath)) {
        fs.mkdirSync(this.backupConfig.backupPath, { recursive: true });
      }

      // Get all table names
      const tables = await this.getAllTableNames();
      backupRecord.tables = tables;

      // Create database dump
      const dumpData = await this.createDatabaseDump(tables);
      
      // Encrypt backup if enabled
      let finalData = dumpData;
      if (this.backupConfig.encryptionEnabled) {
        finalData = await DataEncryption.encryptData(dumpData);
      }

      // Write backup to file
      fs.writeFileSync(backupPath, finalData);
      
      // Calculate file size and checksum
      const stats = fs.statSync(backupPath);
      backupRecord.size = stats.size;
      backupRecord.checksum = await this.calculateChecksum(backupPath);
      backupRecord.status = 'completed';

      // Add to history
      this.backupHistory.push(backupRecord);

      // Log backup creation
      await AuditLogger.logUserAction(
        { user: { id: 'system' } } as any,
        'BACKUP_CREATED',
        'BACKUP_SYSTEM',
        backupId,
        { 
          type: 'full',
          size: backupRecord.size,
          tables: tables.length,
          encrypted: this.backupConfig.encryptionEnabled
        },
        true
      );

      // Send notification
      await emailAlerts.sendSecurityAlert(
        'BACKUP_COMPLETED',
        'LOW',
        `Full database backup completed successfully`,
        { 
          backupId,
          size: backupRecord.size,
          tables: tables.length
        }
      );

      return backupRecord;

    } catch (error) {
      backupRecord.status = 'failed';
      backupRecord.errorMessage = (error as Error).message;
      
      await AuditLogger.logUserAction(
        { user: { id: 'system' } } as any,
        'BACKUP_FAILED',
        'BACKUP_SYSTEM',
        backupId,
        { error: (error as Error).message },
        false,
        (error as Error).message
      );

      await emailAlerts.sendSystemError(
        error as Error,
        'Database backup failure'
      );

      throw error;
    }
  }

  // Create incremental backup
  static async createIncrementalBackup(lastBackupTime: Date): Promise<BackupRecord> {
    const backupId = `incremental_${Date.now()}`;
    const timestamp = new Date();
    const backupPath = path.join(this.backupConfig.backupPath, `${backupId}.sql`);

    const backupRecord: BackupRecord = {
      id: backupId,
      timestamp,
      type: 'incremental',
      size: 0,
      status: 'in_progress',
      location: backupPath,
      encrypted: this.backupConfig.encryptionEnabled,
      tables: [],
      checksum: ''
    };

    try {
      // Get changed data since last backup
      const changedData = await this.getChangedDataSince(lastBackupTime);
      
      // Encrypt if enabled
      let finalData = changedData;
      if (this.backupConfig.encryptionEnabled) {
        finalData = await DataEncryption.encryptData(changedData);
      }

      // Write backup to file
      fs.writeFileSync(backupPath, finalData);
      
      const stats = fs.statSync(backupPath);
      backupRecord.size = stats.size;
      backupRecord.checksum = await this.calculateChecksum(backupPath);
      backupRecord.status = 'completed';

      this.backupHistory.push(backupRecord);

      await AuditLogger.logUserAction(
        { user: { id: 'system' } } as any,
        'INCREMENTAL_BACKUP_CREATED',
        'BACKUP_SYSTEM',
        backupId,
        { size: backupRecord.size },
        true
      );

      return backupRecord;

    } catch (error) {
      backupRecord.status = 'failed';
      backupRecord.errorMessage = (error as Error).message;
      throw error;
    }
  }

  // Restore from backup
  static async restoreFromBackup(backupId: string): Promise<void> {
    const backup = this.backupHistory.find(b => b.id === backupId);
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    try {
      // Read backup file
      let backupData = fs.readFileSync(backup.location, 'utf8');
      
      // Decrypt if encrypted
      if (backup.encrypted) {
        backupData = await DataEncryption.decryptData(backupData);
      }

      // Execute restore
      await this.executeRestore(backupData, backup.type);

      await AuditLogger.logUserAction(
        { user: { id: 'system' } } as any,
        'BACKUP_RESTORED',
        'BACKUP_SYSTEM',
        backupId,
        { type: backup.type },
        true
      );

      await emailAlerts.sendSecurityAlert(
        'BACKUP_RESTORED',
        'HIGH',
        `Database restored from backup ${backupId}`,
        { backupId, type: backup.type }
      );

    } catch (error) {
      await AuditLogger.logUserAction(
        { user: { id: 'system' } } as any,
        'BACKUP_RESTORE_FAILED',
        'BACKUP_SYSTEM',
        backupId,
        { error: (error as Error).message },
        false,
        (error as Error).message
      );

      throw error;
    }
  }

  // Clean up old backups
  static async cleanupOldBackups(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.backupConfig.retentionDays);

    const oldBackups = this.backupHistory.filter(
      backup => backup.timestamp < cutoffDate
    );

    for (const backup of oldBackups) {
      try {
        if (fs.existsSync(backup.location)) {
          fs.unlinkSync(backup.location);
        }
        
        // Remove from history
        const index = this.backupHistory.indexOf(backup);
        if (index > -1) {
          this.backupHistory.splice(index, 1);
        }

        await AuditLogger.logUserAction(
          { user: { id: 'system' } } as any,
          'BACKUP_CLEANUP',
          'BACKUP_SYSTEM',
          backup.id,
          { age: Math.floor((Date.now() - backup.timestamp.getTime()) / (1000 * 60 * 60 * 24)) },
          true
        );

      } catch (error) {
        console.error(`Failed to cleanup backup ${backup.id}:`, error);
      }
    }
  }

  // Get backup status
  static getBackupStatus(): {
    enabled: boolean;
    lastBackup: Date | null;
    totalBackups: number;
    totalSize: number;
    recentFailures: number;
  } {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentFailures = this.backupHistory.filter(
      backup => backup.status === 'failed' && backup.timestamp > yesterday
    ).length;

    const lastBackup = this.backupHistory.length > 0 
      ? this.backupHistory[this.backupHistory.length - 1].timestamp
      : null;

    const totalSize = this.backupHistory.reduce((sum, backup) => sum + backup.size, 0);

    return {
      enabled: this.backupConfig.enabled,
      lastBackup,
      totalBackups: this.backupHistory.length,
      totalSize,
      recentFailures
    };
  }

  // Test backup integrity
  static async testBackupIntegrity(backupId: string): Promise<boolean> {
    const backup = this.backupHistory.find(b => b.id === backupId);
    if (!backup) return false;

    try {
      // Calculate current checksum
      const currentChecksum = await this.calculateChecksum(backup.location);
      
      // Compare with stored checksum
      const isValid = currentChecksum === backup.checksum;

      await AuditLogger.logUserAction(
        { user: { id: 'system' } } as any,
        'BACKUP_INTEGRITY_TEST',
        'BACKUP_SYSTEM',
        backupId,
        { valid: isValid },
        isValid
      );

      return isValid;

    } catch (error) {
      await AuditLogger.logUserAction(
        { user: { id: 'system' } } as any,
        'BACKUP_INTEGRITY_TEST_FAILED',
        'BACKUP_SYSTEM',
        backupId,
        { error: (error as Error).message },
        false,
        (error as Error).message
      );

      return false;
    }
  }

  // Private helper methods
  private static async getAllTableNames(): Promise<string[]> {
    // This would typically query the database for table names
    // For now, return a mock list
    return [
      'users', 'employees', 'payroll', 'leave_requests', 'time_cards',
      'documents', 'audit_logs', 'security_events', 'onboarding_workflows'
    ];
  }

  private static async createDatabaseDump(tables: string[]): Promise<string> {
    // This would create an actual database dump
    // For now, return a mock dump
    return `-- Database Backup Created: ${new Date().toISOString()}\n-- Tables: ${tables.join(', ')}\n-- Mock database dump data`;
  }

  private static async getChangedDataSince(lastBackupTime: Date): Promise<string> {
    // This would query for changed data since last backup
    return `-- Incremental Backup: ${new Date().toISOString()}\n-- Changes since: ${lastBackupTime.toISOString()}\n-- Mock incremental data`;
  }

  private static async executeRestore(backupData: string, type: 'full' | 'incremental' | 'differential'): Promise<void> {
    // This would execute the actual restore process
    console.log(`Executing ${type} restore with data length: ${backupData.length}`);
  }

  private static async calculateChecksum(filePath: string): Promise<string> {
    // This would calculate the actual file checksum
    // For now, return a mock checksum
    const stats = fs.statSync(filePath);
    return `mock_checksum_${stats.size}_${stats.mtime.getTime()}`;
  }
}

// Disaster Recovery Plans
export class DisasterRecoveryManager {
  private static plans: DisasterRecoveryPlan[] = [
    {
      id: 'DR_001',
      name: 'Database Corruption Recovery',
      description: 'Steps to recover from database corruption',
      priority: 'high',
      rto: 60, // 1 hour
      rpo: 5,  // 5 minutes
      procedures: [
        'Identify extent of corruption',
        'Stop all database connections',
        'Restore from latest backup',
        'Apply transaction logs',
        'Verify data integrity',
        'Resume normal operations'
      ],
      contacts: ['admin@district.edu', 'it-support@district.edu'],
      lastTested: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextTest: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: 'active'
    },
    {
      id: 'DR_002',
      name: 'Server Hardware Failure',
      description: 'Steps to recover from server hardware failure',
      priority: 'high',
      rto: 120, // 2 hours
      rpo: 15,  // 15 minutes
      procedures: [
        'Assess hardware damage',
        'Activate backup server',
        'Restore latest backup',
        'Update DNS records',
        'Notify users of service restoration'
      ],
      contacts: ['admin@district.edu', 'it-support@district.edu'],
      lastTested: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      nextTest: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      status: 'active'
    },
    {
      id: 'DR_003',
      name: 'Security Breach Recovery',
      description: 'Steps to recover from security breach',
      priority: 'high',
      rto: 30, // 30 minutes
      rpo: 0,  // No data loss acceptable
      procedures: [
        'Isolate affected systems',
        'Assess breach scope',
        'Reset all passwords',
        'Restore from clean backup',
        'Update security measures',
        'Notify authorities and users'
      ],
      contacts: ['admin@district.edu', 'security@district.edu'],
      lastTested: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      nextTest: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active'
    }
  ];

  static getDisasterRecoveryPlans(): DisasterRecoveryPlan[] {
    return this.plans;
  }

  static async executeRecoveryPlan(planId: string): Promise<void> {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) {
      throw new Error(`Recovery plan ${planId} not found`);
    }

    await AuditLogger.logUserAction(
      { user: { id: 'system' } } as any,
      'DISASTER_RECOVERY_INITIATED',
      'DISASTER_RECOVERY',
      planId,
      { 
        plan: plan.name,
        rto: plan.rto,
        rpo: plan.rpo
      },
      true
    );

    await emailAlerts.sendSecurityAlert(
      'DISASTER_RECOVERY_INITIATED',
      'CRITICAL',
      `Disaster recovery plan ${plan.name} has been initiated`,
      { 
        planId,
        procedures: plan.procedures.length,
        rto: plan.rto,
        rpo: plan.rpo
      }
    );
  }
}

// Schedule automated backups
setInterval(async () => {
  if (BackupManager.getBackupStatus().enabled) {
    try {
      await BackupManager.createFullBackup();
      await BackupManager.cleanupOldBackups();
    } catch (error) {
      console.error('Scheduled backup failed:', error);
    }
  }
}, 24 * 60 * 60 * 1000); // Daily backups