import { db } from '../db';
import { employees, payrollRecords, leaveRequests, timeCards, documents, activityLogs } from '@shared/schema';
import { lt, sql, eq, and } from 'drizzle-orm';

export interface StorageUsage {
  totalSize: string;
  tableBreakdown: {
    tableName: string;
    rowCount: number;
    sizeEstimate: string;
    percentage: number;
  }[];
  growthTrends: {
    period: string;
    size: string;
    growth: string;
  }[];
  recommendations: {
    action: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
    priority: 'low' | 'medium' | 'high';
  }[];
}

export interface ArchiveCandidate {
  category: string;
  recordCount: number;
  estimatedSize: string;
  retentionPolicy: string;
  archiveEligible: number;
  potentialSavings: string;
}

export class StorageMonitor {
  async getStorageUsage(): Promise<StorageUsage> {
    try {
      // Get database size
      const [sizeResult] = await db.execute(
        sql`SELECT pg_size_pretty(pg_database_size(current_database())) as total_size`
      );

      // Get table sizes and row counts
      const [tableStats] = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins - n_tup_del as row_count,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);

      // Calculate total size in bytes for percentage calculations
      const totalSizeBytes = (tableStats as any[]).reduce((sum, table) => sum + (table.size_bytes || 0), 0);

      const tableBreakdown = (tableStats as any[]).map(table => ({
        tableName: table.tablename,
        rowCount: table.row_count || 0,
        sizeEstimate: table.size || '0 bytes',
        percentage: totalSizeBytes > 0 ? Math.round((table.size_bytes / totalSizeBytes) * 100) : 0
      }));

      // Mock growth trends - in production, this would come from historical data
      const growthTrends = [
        { period: 'Last 30 days', size: '1.2 MB', growth: '+15%' },
        { period: 'Last 90 days', size: '3.1 MB', growth: '+42%' },
        { period: 'Last 6 months', size: '6.8 MB', growth: '+89%' }
      ];

      const recommendations = await this.getStorageRecommendations();

      return {
        totalSize: sizeResult.total_size || '0 bytes',
        tableBreakdown,
        growthTrends,
        recommendations
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      throw new Error('Failed to get storage usage information');
    }
  }

  async getArchiveCandidates(): Promise<ArchiveCandidate[]> {
    try {
      const now = new Date();
      const candidates: ArchiveCandidate[] = [];

      // Terminated employees (>7 years)
      const sevenYearsAgo = new Date(now.getFullYear() - 7, now.getMonth(), now.getDate());
      const terminatedEmployees = await db.select()
        .from(employees)
        .where(and(
          eq(employees.status, 'terminated'),
          lt(employees.updatedAt, sevenYearsAgo)
        ));

      candidates.push({
        category: 'Terminated Employee Records',
        recordCount: terminatedEmployees.length,
        estimatedSize: `${(terminatedEmployees.length * 0.5).toFixed(1)} MB`,
        retentionPolicy: '7 years after termination',
        archiveEligible: terminatedEmployees.length,
        potentialSavings: `${(terminatedEmployees.length * 0.5).toFixed(1)} MB`
      });

      // Old payroll records (>7 years)
      const oldPayrollCount = await db.select({ count: sql`count(*)` })
        .from(payrollRecords)
        .where(lt(payrollRecords.payPeriodEnd, sevenYearsAgo));

      candidates.push({
        category: 'Old Payroll Records',
        recordCount: Number(oldPayrollCount[0]?.count) || 0,
        estimatedSize: `${(Number(oldPayrollCount[0]?.count) * 0.1).toFixed(1)} MB`,
        retentionPolicy: '7 years',
        archiveEligible: Number(oldPayrollCount[0]?.count) || 0,
        potentialSavings: `${(Number(oldPayrollCount[0]?.count) * 0.1).toFixed(1)} MB`
      });

      // Old leave requests (>5 years)
      const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
      const oldLeaveCount = await db.select({ count: sql`count(*)` })
        .from(leaveRequests)
        .where(lt(leaveRequests.createdAt, fiveYearsAgo));

      candidates.push({
        category: 'Old Leave Requests',
        recordCount: Number(oldLeaveCount[0]?.count) || 0,
        estimatedSize: `${(Number(oldLeaveCount[0]?.count) * 0.05).toFixed(1)} MB`,
        retentionPolicy: '5 years',
        archiveEligible: Number(oldLeaveCount[0]?.count) || 0,
        potentialSavings: `${(Number(oldLeaveCount[0]?.count) * 0.05).toFixed(1)} MB`
      });

      // Old time cards (>3 years)
      const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
      const oldTimeCardCount = await db.select({ count: sql`count(*)` })
        .from(timeCards)
        .where(lt(timeCards.createdAt, threeYearsAgo));

      candidates.push({
        category: 'Old Time Cards',
        recordCount: Number(oldTimeCardCount[0]?.count) || 0,
        estimatedSize: `${(Number(oldTimeCardCount[0]?.count) * 0.02).toFixed(1)} MB`,
        retentionPolicy: '3 years',
        archiveEligible: Number(oldTimeCardCount[0]?.count) || 0,
        potentialSavings: `${(Number(oldTimeCardCount[0]?.count) * 0.02).toFixed(1)} MB`
      });

      // Old activity logs (>2 years)
      const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      const oldActivityCount = await db.select({ count: sql`count(*)` })
        .from(activityLogs)
        .where(lt(activityLogs.timestamp, twoYearsAgo));

      candidates.push({
        category: 'Old Activity Logs',
        recordCount: Number(oldActivityCount[0]?.count) || 0,
        estimatedSize: `${(Number(oldActivityCount[0]?.count) * 0.01).toFixed(1)} MB`,
        retentionPolicy: '2 years',
        archiveEligible: Number(oldActivityCount[0]?.count) || 0,
        potentialSavings: `${(Number(oldActivityCount[0]?.count) * 0.01).toFixed(1)} MB`
      });

      return candidates.filter(candidate => candidate.archiveEligible > 0);
    } catch (error) {
      console.error('Error getting archive candidates:', error);
      throw new Error('Failed to get archive candidates');
    }
  }

  private async getStorageRecommendations() {
    const recommendations = [
      {
        action: 'Archive old terminated employee records',
        impact: 'Low-Medium storage savings',
        effort: 'low' as const,
        priority: 'medium' as const
      },
      {
        action: 'Compress document attachments',
        impact: 'Medium storage savings',
        effort: 'medium' as const,
        priority: 'high' as const
      },
      {
        action: 'Implement automatic log rotation',
        impact: 'Prevents future storage bloat',
        effort: 'low' as const,
        priority: 'high' as const
      },
      {
        action: 'Set up database indexes optimization',
        impact: 'Improved performance, slight storage increase',
        effort: 'medium' as const,
        priority: 'medium' as const
      },
      {
        action: 'Enable database compression',
        impact: 'High storage savings',
        effort: 'high' as const,
        priority: 'low' as const
      }
    ];

    return recommendations;
  }

  async archiveRecords(category: string, recordIds: number[]): Promise<{
    archived: number;
    errors: string[];
    spaceSaved: string;
  }> {
    try {
      let archived = 0;
      let errors: string[] = [];
      
      // This would implement the actual archiving logic
      // For now, we'll simulate the process
      
      switch (category) {
        case 'Terminated Employee Records':
          // In production, this would move records to archive tables
          archived = recordIds.length;
          break;
        case 'Old Payroll Records':
          archived = recordIds.length;
          break;
        case 'Old Leave Requests':
          archived = recordIds.length;
          break;
        case 'Old Time Cards':
          archived = recordIds.length;
          break;
        case 'Old Activity Logs':
          archived = recordIds.length;
          break;
        default:
          errors.push(`Unknown category: ${category}`);
      }

      const spaceSaved = `${(archived * 0.1).toFixed(1)} MB`;

      return {
        archived,
        errors,
        spaceSaved
      };
    } catch (error) {
      console.error('Error archiving records:', error);
      throw new Error('Failed to archive records');
    }
  }

  async getStorageAlerts(): Promise<{
    level: 'info' | 'warning' | 'critical';
    message: string;
    action: string;
  }[]> {
    try {
      const alerts = [];
      
      // Get current database size
      const [sizeResult] = await db.execute(
        sql`SELECT pg_database_size(current_database()) as size_bytes`
      );
      
      const sizeBytes = Number(sizeResult.size_bytes) || 0;
      const sizeGB = sizeBytes / (1024 * 1024 * 1024);
      
      // Check against thresholds
      if (sizeGB > 8) {
        alerts.push({
          level: 'critical' as const,
          message: 'Database size approaching free tier limit (10 GB)',
          action: 'Consider archiving old data or upgrading to paid tier'
        });
      } else if (sizeGB > 5) {
        alerts.push({
          level: 'warning' as const,
          message: 'Database size is growing. Consider data archiving.',
          action: 'Review archive candidates and implement cleanup'
        });
      } else {
        alerts.push({
          level: 'info' as const,
          message: 'Database size is within healthy limits',
          action: 'Continue monitoring storage usage'
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error getting storage alerts:', error);
      return [{
        level: 'warning' as const,
        message: 'Unable to check storage alerts',
        action: 'Check database connectivity'
      }];
    }
  }
}

export const storageMonitor = new StorageMonitor();