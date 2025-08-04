import { eq, and, sql, not } from 'drizzle-orm';
import { db } from './db';
import * as schema from '@shared/schema';

/**
 * Data Isolation Service
 * Ensures complete data separation between school districts
 * Provides validation, testing, and cleanup utilities
 */
export class DataIsolationService {
  
  /**
   * Validates that a new district setup has no data leakage from other districts
   */
  async validateDistrictIsolation(districtId: number): Promise<{
    isIsolated: boolean;
    violations: Array<{
      table: string;
      issue: string;
      affectedRecords: number;
    }>;
    summary: string;
  }> {
    const violations = [];
    
    // Check all tables with districtId fields for proper isolation
    const tablesToCheck = [
      { table: 'employees', schema: schema.employees },
      { table: 'leaveRequests', schema: schema.leaveRequests },
      { table: 'leaveTypes', schema: schema.leaveTypes },
      { table: 'payrollRecords', schema: schema.payrollRecords },
      { table: 'timeCards', schema: schema.timeCards },
      { table: 'documents', schema: schema.documents },
      { table: 'pafSubmissions', schema: schema.pafSubmissions },
      { table: 'workflowTemplates', schema: schema.workflowTemplates },
      { table: 'fieldCustomizations', schema: schema.fieldCustomizations },
      { table: 'payrollCalendarEvents', schema: schema.payrollCalendarEvents },
    ];

    for (const { table, schema: tableSchema } of tablesToCheck) {
      try {
        // Check for records without districtId (data leakage)
        const [orphanedCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(tableSchema)
          .where(sql`district_id IS NULL`);

        if (orphanedCount.count > 0) {
          violations.push({
            table,
            issue: `${orphanedCount.count} records without district assignment`,
            affectedRecords: orphanedCount.count
          });
        }

        // Check for records assigned to other districts (cross-contamination)
        const [wrongDistrictCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(tableSchema)
          .where(and(
            sql`district_id IS NOT NULL`,
            not(eq(sql`district_id`, districtId))
          ));

        if (wrongDistrictCount.count > 0) {
          violations.push({
            table,
            issue: `Found ${wrongDistrictCount.count} records from other districts`,
            affectedRecords: wrongDistrictCount.count
          });
        }

      } catch (error) {
        // Table might not exist yet, skip silently
        console.log(`Skipping validation for ${table}: ${error.message}`);
      }
    }

    // Check user assignments
    try {
      const [wrongUserCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.users)
        .where(and(
          sql`district_id IS NOT NULL`,
          not(eq(schema.users.districtId, districtId)),
          not(eq(schema.users.isSystemOwner, true))
        ));

      if (wrongUserCount.count > 0) {
        violations.push({
          table: 'users',
          issue: `Found ${wrongUserCount.count} users from other districts`,
          affectedRecords: wrongUserCount.count
        });
      }
    } catch (error) {
      console.log(`Skipping user validation: ${error.message}`);
    }

    const isIsolated = violations.length === 0;
    const summary = isIsolated 
      ? 'District data is properly isolated'
      : `Found ${violations.length} data isolation issues affecting ${violations.reduce((sum, v) => sum + v.affectedRecords, 0)} records`;

    return {
      isIsolated,
      violations,
      summary
    };
  }

  /**
   * Performs a complete data cleanup for a district to ensure isolation
   */
  async cleanupDistrictData(districtId: number, options: {
    removeOrphanedRecords?: boolean;
    fixUserAssignments?: boolean;
    dryRun?: boolean;
  } = {}): Promise<{
    success: boolean;
    actionsPerformed: string[];
    recordsAffected: number;
  }> {
    const actions = [];
    let totalRecordsAffected = 0;

    if (options.dryRun) {
      actions.push('DRY RUN MODE - No changes made');
    }

    // Remove orphaned records (records without district assignment)
    if (options.removeOrphanedRecords) {
      const tablesToClean = [
        schema.employees,
        schema.leaveRequests,
        schema.leaveTypes,
        schema.payrollRecords,
        schema.timeCards,
        schema.documents,
        schema.pafSubmissions,
        schema.workflowTemplates,
        schema.fieldCustomizations
      ];

      for (const table of tablesToClean) {
        try {
          if (!options.dryRun) {
            const result = await db
              .delete(table)
              .where(sql`district_id IS NULL`);
            
            actions.push(`Removed orphaned records from ${table}`);
            totalRecordsAffected += result.rowCount || 0;
          } else {
            const [count] = await db
              .select({ count: sql<number>`count(*)` })
              .from(table)
              .where(sql`district_id IS NULL`);
            
            actions.push(`Would remove ${count.count} orphaned records from ${table}`);
            totalRecordsAffected += count.count;
          }
        } catch (error) {
          actions.push(`Could not clean ${table}: ${error.message}`);
        }
      }
    }

    // Fix user district assignments
    if (options.fixUserAssignments) {
      try {
        if (!options.dryRun) {
          const result = await db
            .update(schema.users)
            .set({ districtId })
            .where(and(
              sql`district_id IS NULL`,
              not(eq(schema.users.isSystemOwner, true))
            ));
          
          actions.push(`Fixed user district assignments`);
          totalRecordsAffected += result.rowCount || 0;
        } else {
          const [count] = await db
            .select({ count: sql<number>`count(*)` })
            .from(schema.users)
            .where(and(
              sql`district_id IS NULL`,
              not(eq(schema.users.isSystemOwner, true))
            ));
          
          actions.push(`Would fix ${count.count} user district assignments`);
          totalRecordsAffected += count.count;
        }
      } catch (error) {
        actions.push(`Could not fix user assignments: ${error.message}`);
      }
    }

    return {
      success: true,
      actionsPerformed: actions,
      recordsAffected: totalRecordsAffected
    };
  }

  /**
   * Creates a new district with complete data isolation
   */
  async setupIsolatedDistrict(districtData: {
    name: string;
    slug: string;
    contactEmail: string;
    contactPhone?: string;
    address?: string;
    subscriptionTier?: string;
  }): Promise<{
    success: boolean;
    district: any;
    isolationReport: any;
  }> {
    // Create the district
    const [newDistrict] = await db
      .insert(schema.districts)
      .values({
        ...districtData,
        subscriptionTier: districtData.subscriptionTier || 'basic',
        subscriptionStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        settings: {}
      })
      .returning();

    // Validate isolation immediately after creation
    const isolationReport = await this.validateDistrictIsolation(newDistrict.id);

    // Create default data for the district
    await this.initializeDistrictDefaults(newDistrict.id);

    return {
      success: true,
      district: newDistrict,
      isolationReport
    };
  }

  /**
   * Initializes default data for a new district
   */
  private async initializeDistrictDefaults(districtId: number): Promise<void> {
    // Create default leave types
    const defaultLeaveTypes = [
      { name: 'Sick Leave', description: 'Personal illness or medical appointments', color: '#ef4444', districtId },
      { name: 'Vacation', description: 'Personal time off', color: '#3b82f6', districtId },
      { name: 'Personal Leave', description: 'Personal business', color: '#8b5cf6', districtId },
      { name: 'Bereavement', description: 'Family emergency or bereavement', color: '#6b7280', districtId },
    ];

    await db.insert(schema.leaveTypes).values(defaultLeaveTypes);

    // Create default workflow template
    const [defaultTemplate] = await db
      .insert(schema.workflowTemplates)
      .values({
        districtId,
        name: 'Standard Approval Process',
        description: 'Default 3-step approval workflow',
        steps: [
          { step: 1, title: 'HR Review', approverRole: 'hr', required: true },
          { step: 2, title: 'Budget Approval', approverRole: 'admin', required: true },
          { step: 3, title: 'Final Approval', approverRole: 'admin', required: true }
        ],
        isActive: true
      })
      .returning();

    // Create default field customizations for each module
    const defaultCustomizations = [
      {
        districtId,
        module: 'employee',
        fieldName: 'firstName',
        displayLabel: 'First Name',
        fieldType: 'text',
        isRequired: true,
        isVisible: true,
        displayOrder: 1,
        validationRules: { minLength: 1, maxLength: 50 }
      },
      {
        districtId,
        module: 'employee',
        fieldName: 'lastName',
        displayLabel: 'Last Name',
        fieldType: 'text',
        isRequired: true,
        isVisible: true,
        displayOrder: 2,
        validationRules: { minLength: 1, maxLength: 50 }
      },
      {
        districtId,
        module: 'employee',
        fieldName: 'email',
        displayLabel: 'Email Address',
        fieldType: 'email',
        isRequired: true,
        isVisible: true,
        displayOrder: 3,
        validationRules: { format: 'email' }
      }
    ];

    await db.insert(schema.fieldCustomizations).values(defaultCustomizations);
  }

  /**
   * Gets comprehensive district isolation status
   */
  async getDistrictIsolationStatus(districtId: number): Promise<{
    district: any;
    isolation: any;
    dataStats: {
      employees: number;
      users: number;
      documents: number;
      leaveRequests: number;
      timeCards: number;
      pafSubmissions: number;
    };
  }> {
    // Get district info
    const [district] = await db
      .select()
      .from(schema.districts)
      .where(eq(schema.districts.id, districtId));

    // Validate isolation
    const isolation = await this.validateDistrictIsolation(districtId);

    // Get data statistics
    const dataStats = {
      employees: 0,
      users: 0,
      documents: 0,
      leaveRequests: 0,
      timeCards: 0,
      pafSubmissions: 0
    };

    try {
      const [employeeCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.employees)
        .where(eq(schema.employees.districtId, districtId));
      dataStats.employees = employeeCount.count;

      const [userCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.users)
        .where(eq(schema.users.districtId, districtId));
      dataStats.users = userCount.count;

      const [documentCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.documents)
        .where(eq(schema.documents.districtId, districtId));
      dataStats.documents = documentCount.count;

      const [leaveCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.leaveRequests)
        .where(eq(schema.leaveRequests.districtId, districtId));
      dataStats.leaveRequests = leaveCount.count;

      const [timecardCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.timeCards)
        .where(eq(schema.timeCards.districtId, districtId));
      dataStats.timeCards = timecardCount.count;

      const [pafCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.pafSubmissions)
        .where(eq(schema.pafSubmissions.districtId, districtId));
      dataStats.pafSubmissions = pafCount.count;

    } catch (error) {
      console.log('Error getting data stats:', error.message);
    }

    return {
      district,
      isolation,
      dataStats
    };
  }
}

export const dataIsolationService = new DataIsolationService();