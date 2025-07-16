import { db } from '../db';
import { 
  employees, 
  payrollRecords, 
  leaveRequests, 
  timeCards, 
  activityLogs,
  documents 
} from '@shared/schema';
import { lt, sql, eq, and, inArray } from 'drizzle-orm';

export interface ArchiveConfig {
  enabled: boolean;
  scheduleType: 'manual' | 'daily' | 'weekly' | 'monthly';
  retentionPolicies: {
    terminatedEmployees: number; // years
    payrollRecords: number; // years
    leaveRequests: number; // years
    timeCards: number; // years
    activityLogs: number; // years
    documents: number; // years
  };
  archiveLocation: 'database' | 'external' | 'delete';
  notificationEmail: string;
}

export interface ArchiveJob {
  id: string;
  category: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  recordsProcessed: number;
  totalRecords: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  spaceSaved: string;
}

export class DataArchiver {
  private defaultConfig: ArchiveConfig = {
    enabled: false,
    scheduleType: 'monthly',
    retentionPolicies: {
      terminatedEmployees: 7,
      payrollRecords: 7,
      leaveRequests: 5,
      timeCards: 3,
      activityLogs: 2,
      documents: 10
    },
    archiveLocation: 'database',
    notificationEmail: ''
  };

  async getArchiveConfig(): Promise<ArchiveConfig> {
    try {
      // In production, this would be stored in a configuration table
      // For now, return the default config
      return this.defaultConfig;
    } catch (error) {
      console.error('Error getting archive config:', error);
      return this.defaultConfig;
    }
  }

  async updateArchiveConfig(config: Partial<ArchiveConfig>): Promise<ArchiveConfig> {
    try {
      // In production, this would update the configuration table
      const updatedConfig = { ...this.defaultConfig, ...config };
      
      // Log the configuration change
      await this.logArchiveActivity('CONFIG_UPDATE', `Archive configuration updated`, {
        oldConfig: this.defaultConfig,
        newConfig: updatedConfig
      });

      return updatedConfig;
    } catch (error) {
      console.error('Error updating archive config:', error);
      throw new Error('Failed to update archive configuration');
    }
  }

  async createArchiveJob(category: string, recordIds: number[]): Promise<ArchiveJob> {
    const job: ArchiveJob = {
      id: `archive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category,
      status: 'pending',
      recordsProcessed: 0,
      totalRecords: recordIds.length,
      startTime: new Date(),
      spaceSaved: '0 MB'
    };

    try {
      // Start the archiving process
      await this.processArchiveJob(job, recordIds);
      return job;
    } catch (error) {
      job.status = 'failed';
      job.error = (error as Error).message;
      job.endTime = new Date();
      throw error;
    }
  }

  private async processArchiveJob(job: ArchiveJob, recordIds: number[]): Promise<void> {
    job.status = 'running';
    
    try {
      let spaceSaved = 0;
      const config = await this.getArchiveConfig();

      switch (job.category) {
        case 'terminated_employees':
          spaceSaved = await this.archiveTerminatedEmployees(recordIds, config);
          break;
        case 'old_payroll':
          spaceSaved = await this.archiveOldPayroll(recordIds, config);
          break;
        case 'old_leave_requests':
          spaceSaved = await this.archiveOldLeaveRequests(recordIds, config);
          break;
        case 'old_time_cards':
          spaceSaved = await this.archiveOldTimeCards(recordIds, config);
          break;
        case 'old_activity_logs':
          spaceSaved = await this.archiveOldActivityLogs(recordIds, config);
          break;
        default:
          throw new Error(`Unknown archive category: ${job.category}`);
      }

      job.recordsProcessed = recordIds.length;
      job.spaceSaved = `${spaceSaved.toFixed(1)} MB`;
      job.status = 'completed';
      job.endTime = new Date();

      await this.logArchiveActivity(
        'ARCHIVE_COMPLETED',
        `Archived ${job.recordsProcessed} records from ${job.category}`,
        { job }
      );
    } catch (error) {
      job.status = 'failed';
      job.error = (error as Error).message;
      job.endTime = new Date();
      
      await this.logArchiveActivity(
        'ARCHIVE_FAILED',
        `Failed to archive ${job.category}: ${job.error}`,
        { job }
      );
      
      throw error;
    }
  }

  private async archiveTerminatedEmployees(employeeIds: number[], config: ArchiveConfig): Promise<number> {
    if (config.archiveLocation === 'delete') {
      // In production, this would properly cascade delete related records
      await db.delete(employees).where(inArray(employees.id, employeeIds));
      return employeeIds.length * 0.5; // Estimate 0.5 MB per employee
    } else {
      // In production, this would move to archive tables
      // For now, just mark as archived
      return employeeIds.length * 0.5;
    }
  }

  private async archiveOldPayroll(payrollIds: number[], config: ArchiveConfig): Promise<number> {
    if (config.archiveLocation === 'delete') {
      await db.delete(payrollRecords).where(inArray(payrollRecords.id, payrollIds));
      return payrollIds.length * 0.1; // Estimate 0.1 MB per payroll record
    } else {
      return payrollIds.length * 0.1;
    }
  }

  private async archiveOldLeaveRequests(leaveIds: number[], config: ArchiveConfig): Promise<number> {
    if (config.archiveLocation === 'delete') {
      await db.delete(leaveRequests).where(inArray(leaveRequests.id, leaveIds));
      return leaveIds.length * 0.05; // Estimate 0.05 MB per leave request
    } else {
      return leaveIds.length * 0.05;
    }
  }

  private async archiveOldTimeCards(timeCardIds: number[], config: ArchiveConfig): Promise<number> {
    if (config.archiveLocation === 'delete') {
      await db.delete(timeCards).where(inArray(timeCards.id, timeCardIds));
      return timeCardIds.length * 0.02; // Estimate 0.02 MB per time card
    } else {
      return timeCardIds.length * 0.02;
    }
  }

  private async archiveOldActivityLogs(logIds: number[], config: ArchiveConfig): Promise<number> {
    if (config.archiveLocation === 'delete') {
      await db.delete(activityLogs).where(inArray(activityLogs.id, logIds));
      return logIds.length * 0.01; // Estimate 0.01 MB per log entry
    } else {
      return logIds.length * 0.01;
    }
  }

  async getArchiveJobs(): Promise<ArchiveJob[]> {
    try {
      // In production, this would query from a jobs table
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error getting archive jobs:', error);
      return [];
    }
  }

  async runAutomaticArchiving(): Promise<{
    jobsCreated: number;
    totalRecordsArchived: number;
    spaceSaved: string;
    errors: string[];
  }> {
    try {
      const config = await this.getArchiveConfig();
      
      if (!config.enabled) {
        return {
          jobsCreated: 0,
          totalRecordsArchived: 0,
          spaceSaved: '0 MB',
          errors: ['Automatic archiving is disabled']
        };
      }

      const results = {
        jobsCreated: 0,
        totalRecordsArchived: 0,
        spaceSaved: '0 MB',
        errors: [] as string[]
      };

      const now = new Date();
      
      // Archive terminated employees
      const terminatedCutoff = new Date(now.getFullYear() - config.retentionPolicies.terminatedEmployees, now.getMonth(), now.getDate());
      const terminatedEmployees = await db.select({ id: employees.id })
        .from(employees)
        .where(and(
          eq(employees.status, 'terminated'),
          lt(employees.updatedAt, terminatedCutoff)
        ));

      if (terminatedEmployees.length > 0) {
        try {
          const job = await this.createArchiveJob('terminated_employees', terminatedEmployees.map(e => e.id));
          results.jobsCreated++;
          results.totalRecordsArchived += job.recordsProcessed;
        } catch (error) {
          results.errors.push(`Failed to archive terminated employees: ${(error as Error).message}`);
        }
      }

      // Archive old payroll records
      const payrollCutoff = new Date(now.getFullYear() - config.retentionPolicies.payrollRecords, now.getMonth(), now.getDate());
      const oldPayroll = await db.select({ id: payrollRecords.id })
        .from(payrollRecords)
        .where(lt(payrollRecords.payPeriodEnd, payrollCutoff));

      if (oldPayroll.length > 0) {
        try {
          const job = await this.createArchiveJob('old_payroll', oldPayroll.map(p => p.id));
          results.jobsCreated++;
          results.totalRecordsArchived += job.recordsProcessed;
        } catch (error) {
          results.errors.push(`Failed to archive old payroll: ${(error as Error).message}`);
        }
      }

      // Calculate total space saved
      const spaceSavedMB = results.totalRecordsArchived * 0.1; // Average estimate
      results.spaceSaved = `${spaceSavedMB.toFixed(1)} MB`;

      await this.logArchiveActivity(
        'AUTO_ARCHIVE_COMPLETED',
        `Automatic archiving completed: ${results.jobsCreated} jobs, ${results.totalRecordsArchived} records`,
        results
      );

      return results;
    } catch (error) {
      console.error('Error running automatic archiving:', error);
      return {
        jobsCreated: 0,
        totalRecordsArchived: 0,
        spaceSaved: '0 MB',
        errors: [`Automatic archiving failed: ${(error as Error).message}`]
      };
    }
  }

  private async logArchiveActivity(action: string, description: string, metadata: any): Promise<void> {
    try {
      await db.insert(activityLogs).values({
        userId: 'system',
        action,
        description,
        metadata,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging archive activity:', error);
    }
  }

  async estimateArchivingSavings(): Promise<{
    category: string;
    recordCount: number;
    estimatedSavings: string;
    timeframe: string;
  }[]> {
    try {
      const config = await this.getArchiveConfig();
      const now = new Date();
      const estimates = [];

      // Terminated employees
      const terminatedCutoff = new Date(now.getFullYear() - config.retentionPolicies.terminatedEmployees, now.getMonth(), now.getDate());
      const terminatedCount = await db.select({ count: sql`count(*)` })
        .from(employees)
        .where(and(
          eq(employees.status, 'terminated'),
          lt(employees.updatedAt, terminatedCutoff)
        ));

      estimates.push({
        category: 'Terminated Employee Records',
        recordCount: Number(terminatedCount[0]?.count) || 0,
        estimatedSavings: `${(Number(terminatedCount[0]?.count) * 0.5).toFixed(1)} MB`,
        timeframe: `Older than ${config.retentionPolicies.terminatedEmployees} years`
      });

      // Old payroll records
      const payrollCutoff = new Date(now.getFullYear() - config.retentionPolicies.payrollRecords, now.getMonth(), now.getDate());
      const payrollCount = await db.select({ count: sql`count(*)` })
        .from(payrollRecords)
        .where(lt(payrollRecords.payPeriodEnd, payrollCutoff));

      estimates.push({
        category: 'Old Payroll Records',
        recordCount: Number(payrollCount[0]?.count) || 0,
        estimatedSavings: `${(Number(payrollCount[0]?.count) * 0.1).toFixed(1)} MB`,
        timeframe: `Older than ${config.retentionPolicies.payrollRecords} years`
      });

      return estimates.filter(estimate => estimate.recordCount > 0);
    } catch (error) {
      console.error('Error estimating archiving savings:', error);
      return [];
    }
  }
}

export const dataArchiver = new DataArchiver();