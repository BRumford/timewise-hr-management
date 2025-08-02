import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "./db";
import { 
  payDateConfigurations, 
  timecardGenerationJobs, 
  timecardGenerationTemplates,
  monthlyTimecards,
  substituteTimeCards,
  employees,
  timecardTemplates,
  payPeriods,
  districts,
  type InsertPayDateConfiguration,
  type InsertTimecardGenerationJob,
  type InsertTimecardGenerationTemplate,
  type PayDateConfiguration,
  type TimecardGenerationJob,
  type TimecardGenerationTemplate
} from "@shared/schema";

export interface PayDateSchedule {
  month: number;
  year: number;
  payDate: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  timecardDueDate: string;
}

export interface TimecardGenerationResult {
  success: boolean;
  employeeCount: number;
  timecardsGenerated: number;
  errorCount: number;
  errors: string[];
  processingLog: any[];
}

export class TimecardAutomationService {
  
  // Pay Date Configuration Management
  async createPayDateConfiguration(config: InsertPayDateConfiguration): Promise<PayDateConfiguration> {
    const [created] = await db
      .insert(payDateConfigurations)
      .values(config)
      .returning();
    return created;
  }

  async getPayDateConfigurations(districtId: number): Promise<PayDateConfiguration[]> {
    return await db
      .select()
      .from(payDateConfigurations)
      .where(eq(payDateConfigurations.districtId, districtId))
      .orderBy(desc(payDateConfigurations.createdAt));
  }

  async getActivePayDateConfiguration(districtId: number): Promise<PayDateConfiguration | null> {
    const [config] = await db
      .select()
      .from(payDateConfigurations)
      .where(and(
        eq(payDateConfigurations.districtId, districtId),
        eq(payDateConfigurations.isActive, true)
      ))
      .limit(1);
    return config || null;
  }

  async updatePayDateConfiguration(id: number, updates: Partial<InsertPayDateConfiguration>): Promise<PayDateConfiguration> {
    const [updated] = await db
      .update(payDateConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(payDateConfigurations.id, id))
      .returning();
    return updated;
  }

  // Timecard Generation Template Management
  async createGenerationTemplate(template: InsertTimecardGenerationTemplate): Promise<TimecardGenerationTemplate> {
    const [created] = await db
      .insert(timecardGenerationTemplates)
      .values(template)
      .returning();
    return created;
  }

  async getGenerationTemplates(districtId: number): Promise<TimecardGenerationTemplate[]> {
    return await db
      .select()
      .from(timecardGenerationTemplates)
      .where(eq(timecardGenerationTemplates.districtId, districtId))
      .orderBy(desc(timecardGenerationTemplates.createdAt));
  }

  async getActiveGenerationTemplates(districtId: number, employeeType?: string): Promise<TimecardGenerationTemplate[]> {
    const conditions = [
      eq(timecardGenerationTemplates.districtId, districtId),
      eq(timecardGenerationTemplates.isActive, true),
      eq(timecardGenerationTemplates.autoGenerationEnabled, true)
    ];

    if (employeeType) {
      conditions.push(eq(timecardGenerationTemplates.employeeType, employeeType));
    }

    return await db
      .select()
      .from(timecardGenerationTemplates)
      .where(and(...conditions));
  }

  // Automated Timecard Generation
  async generateMonthlyTimecards(
    districtId: number, 
    month: number, 
    year: number, 
    triggeredBy: string,
    employeeTypes?: string[]
  ): Promise<TimecardGenerationResult> {
    console.log(`[TIMECARD_GEN] Starting monthly timecard generation for district ${districtId}, ${month}/${year}`);
    
    const result: TimecardGenerationResult = {
      success: false,
      employeeCount: 0,
      timecardsGenerated: 0,
      errorCount: 0,
      errors: [],
      processingLog: []
    };

    try {
      // Create generation job record
      const [job] = await db
        .insert(timecardGenerationJobs)
        .values({
          districtId,
          payDateConfigurationId: 1, // Will be updated with actual config
          jobType: 'monthly_timecards',
          targetMonth: month,
          targetYear: year,
          status: 'running',
          triggeredBy,
          startedAt: new Date()
        })
        .returning();

      result.processingLog.push({
        timestamp: new Date().toISOString(),
        action: 'job_created',
        jobId: job.id
      });

      // Get active pay date configuration
      const payConfig = await this.getActivePayDateConfiguration(districtId);
      if (!payConfig) {
        throw new Error('No active pay date configuration found for district');
      }

      // Update job with pay configuration
      await db
        .update(timecardGenerationJobs)
        .set({ payDateConfigurationId: payConfig.id })
        .where(eq(timecardGenerationJobs.id, job.id));

      // Get eligible employees
      const employeeQuery = db
        .select()
        .from(employees)
        .where(and(
          eq(employees.districtId, districtId),
          eq(employees.status, 'active')
        ));

      const eligibleEmployees = await employeeQuery;
      result.employeeCount = eligibleEmployees.length;

      result.processingLog.push({
        timestamp: new Date().toISOString(),
        action: 'employees_retrieved',
        count: eligibleEmployees.length
      });

      // Get generation templates
      const templates = await this.getActiveGenerationTemplates(districtId);
      if (templates.length === 0) {
        throw new Error('No active generation templates found');
      }

      // Generate timecards for each employee
      for (const employee of eligibleEmployees) {
        try {
          // Skip if employee type not in requested types
          if (employeeTypes && !employeeTypes.includes(employee.employeeType)) {
            continue;
          }

          // Find appropriate template for employee type
          const template = templates.find(t => t.employeeType === employee.employeeType);
          if (!template) {
            result.errors.push(`No template found for employee type: ${employee.employeeType}`);
            result.errorCount++;
            continue;
          }

          // Check if timecard already exists
          const existingTimecard = await db
            .select()
            .from(monthlyTimecards)
            .where(and(
              eq(monthlyTimecards.employeeId, employee.id),
              eq(monthlyTimecards.month, month),
              eq(monthlyTimecards.year, year)
            ))
            .limit(1);

          if (existingTimecard.length > 0) {
            result.processingLog.push({
              timestamp: new Date().toISOString(),
              action: 'timecard_skipped',
              employeeId: employee.id,
              reason: 'already_exists'
            });
            continue;
          }

          // Calculate pay period dates
          const payPeriodStart = new Date(year, month - 1, 1);
          const payPeriodEnd = new Date(year, month, 0);

          // Create monthly timecard
          const [newTimecard] = await db
            .insert(monthlyTimecards)
            .values({
              employeeId: employee.id,
              templateId: template.timecardTemplateId,
              month,
              year,
              payPeriodStart,
              payPeriodEnd,
              status: 'draft',
              entries: [],
              customFieldsData: template.defaultFieldValues || {},
              submittedBy: 'system_automated'
            })
            .returning();

          result.timecardsGenerated++;
          result.processingLog.push({
            timestamp: new Date().toISOString(),
            action: 'timecard_created',
            employeeId: employee.id,
            timecardId: newTimecard.id
          });

        } catch (employeeError) {
          result.errorCount++;
          result.errors.push(`Employee ${employee.id}: ${employeeError instanceof Error ? employeeError.message : 'Unknown error'}`);
        }
      }

      // Update job status
      await db
        .update(timecardGenerationJobs)
        .set({
          status: result.errorCount > 0 ? 'completed' : 'completed',
          employeeCount: result.employeeCount,
          timecardsGenerated: result.timecardsGenerated,
          errorCount: result.errorCount,
          processingLog: result.processingLog,
          completedAt: new Date(),
          errorDetails: result.errors.length > 0 ? result.errors.join('\n') : null
        })
        .where(eq(timecardGenerationJobs.id, job.id));

      result.success = true;
      console.log(`[TIMECARD_GEN] Completed: ${result.timecardsGenerated} timecards generated, ${result.errorCount} errors`);

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.errorCount++;
      console.error('[TIMECARD_GEN] Error:', error);
    }

    return result;
  }

  // Generate pay period schedule from configuration
  async generatePaySchedule(configId: number, year: number): Promise<PayDateSchedule[]> {
    const [config] = await db
      .select()
      .from(payDateConfigurations)
      .where(eq(payDateConfigurations.id, configId));

    if (!config) {
      throw new Error('Pay date configuration not found');
    }

    const payDates = config.payDates as any[];
    const schedule: PayDateSchedule[] = [];

    for (const payDate of payDates) {
      const date = new Date(payDate.date);
      if (date.getFullYear() === year) {
        schedule.push({
          month: date.getMonth() + 1,
          year: date.getFullYear(),
          payDate: payDate.date,
          payPeriodStart: payDate.payPeriodStart || '',
          payPeriodEnd: payDate.payPeriodEnd || '',
          timecardDueDate: payDate.timecardDueDate || ''
        });
      }
    }

    return schedule.sort((a, b) => new Date(a.payDate).getTime() - new Date(b.payDate).getTime());
  }

  // Get generation job history
  async getGenerationJobs(districtId: number, limit: number = 50): Promise<TimecardGenerationJob[]> {
    return await db
      .select()
      .from(timecardGenerationJobs)
      .where(eq(timecardGenerationJobs.districtId, districtId))
      .orderBy(desc(timecardGenerationJobs.createdAt))
      .limit(limit);
  }

  // Check if timecards exist for a given month/year
  async checkTimecardsExist(districtId: number, month: number, year: number, employeeType?: string): Promise<{
    exists: boolean;
    count: number;
    employeeTypes: string[];
  }> {
    // Build conditions array and filter out undefined values
    const employeeConditions = [
      eq(employees.districtId, districtId),
      eq(employees.status, 'active')
    ];
    if (employeeType) {
      employeeConditions.push(eq(employees.employeeType, employeeType));
    }

    const timecardConditions = [
      eq(monthlyTimecards.month, month),
      eq(monthlyTimecards.year, year),
      eq(employees.districtId, districtId)
    ];
    if (employeeType) {
      timecardConditions.push(eq(employees.employeeType, employeeType));
    }

    const existingTimecards = await db
      .select({
        id: monthlyTimecards.id,
        employeeId: monthlyTimecards.employeeId
      })
      .from(monthlyTimecards)
      .innerJoin(employees, eq(employees.id, monthlyTimecards.employeeId))
      .where(and(...timecardConditions));

    const employeeTypes = await db
      .selectDistinct({ employeeType: employees.employeeType })
      .from(employees)
      .where(eq(employees.districtId, districtId));

    return {
      exists: existingTimecards.length > 0,
      count: existingTimecards.length,
      employeeTypes: employeeTypes.map(e => e.employeeType)
    };
  }

  // Bulk generation for multiple months
  async bulkGenerateTimecards(
    districtId: number,
    startMonth: number,
    startYear: number,
    endMonth: number,
    endYear: number,
    triggeredBy: string,
    employeeTypes?: string[]
  ): Promise<TimecardGenerationResult[]> {
    const results: TimecardGenerationResult[] = [];
    
    const startDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(endYear, endMonth - 1, 1);
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const result = await this.generateMonthlyTimecards(
        districtId,
        month,
        year,
        triggeredBy,
        employeeTypes
      );
      
      results.push(result);
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return results;
  }

  // Delete generation templates and jobs (cleanup)
  async deleteGenerationTemplate(id: number): Promise<void> {
    await db.delete(timecardGenerationTemplates).where(eq(timecardGenerationTemplates.id, id));
  }

  async deletePayDateConfiguration(id: number): Promise<void> {
    await db.delete(payDateConfigurations).where(eq(payDateConfigurations.id, id));
  }
}

export const timecardAutomationService = new TimecardAutomationService();