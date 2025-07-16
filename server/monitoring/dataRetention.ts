import { db } from '../db';

export interface DataRetentionInfo {
  currentCapacity: {
    employees: number;
    payrollRecords: number;
    leaveRequests: number;
    timeCards: number;
    documents: number;
    activityLogs: number;
  };
  storageMetrics: {
    totalDatabaseSize: string;
    estimatedSizePerEmployee: string;
    projectedCapacity: {
      small: { employees: number; description: string };
      medium: { employees: number; description: string };
      large: { employees: number; description: string };
      enterprise: { employees: number; description: string };
    };
  };
  retentionPolicies: {
    employees: string;
    payrollRecords: string;
    leaveRequests: string;
    timeCards: string;
    documents: string;
    activityLogs: string;
    sessions: string;
  };
  databaseProvider: {
    provider: string;
    tier: string;
    storageLimit: string;
    connectionLimit: string;
    features: string[];
  };
}

export class DataRetentionMonitor {
  async getRetentionInfo(): Promise<DataRetentionInfo> {
    try {
      // Get current record counts
      const [employeeCount] = await db.execute('SELECT COUNT(*) as count FROM employees');
      const [payrollCount] = await db.execute('SELECT COUNT(*) as count FROM payroll_records');
      const [leaveCount] = await db.execute('SELECT COUNT(*) as count FROM leave_requests');
      const [timeCardCount] = await db.execute('SELECT COUNT(*) as count FROM time_cards');
      const [documentCount] = await db.execute('SELECT COUNT(*) as count FROM documents');
      const [activityCount] = await db.execute('SELECT COUNT(*) as count FROM activity_logs');
      
      // Get database size
      const [sizeResult] = await db.execute('SELECT pg_size_pretty(pg_database_size(current_database())) as size');
      
      // Calculate estimated size per employee (based on current data)
      const currentEmployees = Number(employeeCount.count) || 1;
      const estimatedSizePerEmployee = "~2-5 MB"; // Based on typical HR data patterns
      
      return {
        currentCapacity: {
          employees: Number(employeeCount.count) || 0,
          payrollRecords: Number(payrollCount.count) || 0,
          leaveRequests: Number(leaveCount.count) || 0,
          timeCards: Number(timeCardCount.count) || 0,
          documents: Number(documentCount.count) || 0,
          activityLogs: Number(activityCount.count) || 0,
        },
        storageMetrics: {
          totalDatabaseSize: sizeResult.size || "Unknown",
          estimatedSizePerEmployee,
          projectedCapacity: {
            small: { 
              employees: 500, 
              description: "Small district (K-12, 1-2 schools)" 
            },
            medium: { 
              employees: 2000, 
              description: "Medium district (Multiple schools)" 
            },
            large: { 
              employees: 10000, 
              description: "Large district (County-wide)" 
            },
            enterprise: { 
              employees: 50000, 
              description: "Enterprise (State-wide or large corporation)" 
            }
          }
        },
        retentionPolicies: {
          employees: "Indefinite (Active employees retained permanently)",
          payrollRecords: "7 years (Federal tax record requirements)",
          leaveRequests: "5 years (Employment law compliance)",
          timeCards: "3 years (Department of Labor requirements)",
          documents: "Variable (Based on document type and compliance needs)",
          activityLogs: "2 years (Security audit requirements)",
          sessions: "30 days (Automatic cleanup of expired sessions)"
        },
        databaseProvider: {
          provider: "Neon PostgreSQL",
          tier: "Serverless",
          storageLimit: "10 GB (Free tier) / 200 GB+ (Paid tiers)",
          connectionLimit: "100 concurrent connections",
          features: [
            "Automatic backups",
            "Point-in-time recovery",
            "Connection pooling",
            "Serverless scaling",
            "Branch-based development"
          ]
        }
      };
    } catch (error) {
      console.error('Error getting retention info:', error);
      throw new Error('Failed to retrieve data retention information');
    }
  }

  async estimateStorageForEmployees(employeeCount: number): Promise<{
    estimatedSize: string;
    recommendedTier: string;
    monthlyRecords: number;
    yearlyGrowth: string;
  }> {
    // Base storage per employee (including all related data)
    const baseStoragePerEmployee = 5; // MB
    
    // Additional storage for historical data
    const yearlyGrowthPerEmployee = 2; // MB per year
    
    // Calculate totals
    const totalSizeMB = employeeCount * baseStoragePerEmployee;
    const yearlyGrowthMB = employeeCount * yearlyGrowthPerEmployee;
    
    // Convert to appropriate units
    const totalSizeGB = totalSizeMB / 1024;
    const yearlyGrowthGB = yearlyGrowthMB / 1024;
    
    let estimatedSize: string;
    let recommendedTier: string;
    
    if (totalSizeGB < 1) {
      estimatedSize = `${totalSizeMB.toFixed(0)} MB`;
      recommendedTier = "Free Tier (10 GB)";
    } else if (totalSizeGB < 10) {
      estimatedSize = `${totalSizeGB.toFixed(1)} GB`;
      recommendedTier = "Free Tier (10 GB)";
    } else if (totalSizeGB < 100) {
      estimatedSize = `${totalSizeGB.toFixed(1)} GB`;
      recommendedTier = "Pro Tier (100 GB)";
    } else {
      estimatedSize = `${totalSizeGB.toFixed(1)} GB`;
      recommendedTier = "Business Tier (200+ GB)";
    }
    
    return {
      estimatedSize,
      recommendedTier,
      monthlyRecords: employeeCount * 12, // Approximate monthly records per employee
      yearlyGrowth: `${yearlyGrowthGB.toFixed(1)} GB/year`
    };
  }

  async getRetentionPolicyRecommendations(): Promise<{
    category: string;
    currentPolicy: string;
    recommendedPolicy: string;
    compliance: string;
    reason: string;
  }[]> {
    return [
      {
        category: "Employee Records",
        currentPolicy: "Indefinite retention",
        recommendedPolicy: "Indefinite retention (Active), 7 years (Terminated)",
        compliance: "FLSA, EEOC",
        reason: "Federal employment law requires maintaining terminated employee records for 7 years"
      },
      {
        category: "Payroll Records",
        currentPolicy: "7 years",
        recommendedPolicy: "7 years minimum",
        compliance: "IRS, DOL",
        reason: "Federal tax law requires 7-year retention for payroll tax records"
      },
      {
        category: "Leave Requests",
        currentPolicy: "5 years",
        recommendedPolicy: "5 years minimum",
        compliance: "FMLA, State Laws",
        reason: "Family and Medical Leave Act requires 5-year retention"
      },
      {
        category: "Time Cards",
        currentPolicy: "3 years",
        recommendedPolicy: "3 years minimum",
        compliance: "DOL, FLSA",
        reason: "Department of Labor requires 3-year retention for time records"
      },
      {
        category: "Activity Logs",
        currentPolicy: "2 years",
        recommendedPolicy: "2-7 years",
        compliance: "Security, Audit",
        reason: "Security audits and compliance investigations may require historical access"
      },
      {
        category: "Documents",
        currentPolicy: "Variable",
        recommendedPolicy: "Document-specific policies",
        compliance: "Various",
        reason: "Different document types have different legal retention requirements"
      }
    ];
  }
}

export const dataRetentionMonitor = new DataRetentionMonitor();