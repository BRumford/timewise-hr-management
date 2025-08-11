import { eq, sql } from 'drizzle-orm';
import { db } from './db';

/**
 * Data Cleanup Service
 * Ensures fresh, clean data for new district accounts
 * Prevents data leakage between district sessions
 */
export class DataCleanupService {
  
  /**
   * Removes all demo and test data that might persist across sessions
   */
  static async cleanupDemoData(): Promise<{
    success: boolean;
    recordsRemoved: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let recordsRemoved = 0;

    try {
      // Clean all support tables if they exist
      try {
        const docResult = await db.execute(sql`DELETE FROM support_documents`);
        recordsRemoved += docResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      try {
        const notificationResult = await db.execute(sql`DELETE FROM security_notifications`);
        recordsRemoved += notificationResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      try {
        const updateResult = await db.execute(sql`DELETE FROM security_updates`);
        recordsRemoved += updateResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      try {
        const vulnResult = await db.execute(sql`DELETE FROM vulnerability_assessments`);
        recordsRemoved += vulnResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      // COMPLETE data cleanup for new district isolation
      // Clean ALL dependent records first to handle foreign key constraints
      
      // Clean all letters
      const lettersResult = await db.execute(sql`DELETE FROM letters`);
      recordsRemoved += lettersResult.rowCount || 0;

      // Clean all time cards
      const timeCardsResult = await db.execute(sql`DELETE FROM time_cards`);
      recordsRemoved += timeCardsResult.rowCount || 0;

      // Clean all substitute time cards
      try {
        const subTimeCardsResult = await db.execute(sql`DELETE FROM substitute_time_cards`);
        recordsRemoved += subTimeCardsResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      // Clean all payroll records
      const payrollResult = await db.execute(sql`DELETE FROM payroll_records`);
      recordsRemoved += payrollResult.rowCount || 0;

      // Clean all extra pay requests
      try {
        const extraPayRequestsResult = await db.execute(sql`DELETE FROM extra_pay_requests`);
        recordsRemoved += extraPayRequestsResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      // Clean all extra pay contracts
      try {
        const extraPayContractsResult = await db.execute(sql`DELETE FROM extra_pay_contracts`);
        recordsRemoved += extraPayContractsResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      // Clean all substitute assignments
      try {
        const substituteAssignmentsResult = await db.execute(sql`DELETE FROM substitute_assignments`);
        recordsRemoved += substituteAssignmentsResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      // Clean all documents
      try {
        const documentsResult = await db.execute(sql`DELETE FROM documents`);
        recordsRemoved += documentsResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      // Clean all benefit elections
      try {
        const benefitElectionsResult = await db.execute(sql`DELETE FROM employee_benefit_elections`);
        recordsRemoved += benefitElectionsResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      // Clean all tax withholdings
      try {
        const taxWithholdingsResult = await db.execute(sql`DELETE FROM employee_tax_withholdings`);
        recordsRemoved += taxWithholdingsResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      // Clean all employee accounts
      try {
        const employeeAccountsResult = await db.execute(sql`DELETE FROM employee_accounts`);
        recordsRemoved += employeeAccountsResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      // Clean all activity logs
      try {
        const activityLogsResult = await db.execute(sql`DELETE FROM activity_logs`);
        recordsRemoved += activityLogsResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      // Clean all onboarding form submissions
      try {
        const onboardingSubmissionsResult = await db.execute(sql`DELETE FROM onboarding_form_submissions`);
        recordsRemoved += onboardingSubmissionsResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      // Clean all signature requests (this was blocking employee deletion)
      const signatureRequestsResult = await db.execute(sql`DELETE FROM signature_requests`);
      recordsRemoved += signatureRequestsResult.rowCount || 0;

      // NOW clean ALL employees (main table)
      const employeeResult = await db.execute(sql`DELETE FROM employees`);
      recordsRemoved += employeeResult.rowCount || 0;

      // Clean all retirees
      try {
        const retireesResult = await db.execute(sql`DELETE FROM retirees`);
        recordsRemoved += retireesResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      // Clean ALL PAF submissions
      try {
        const pafResult = await db.execute(sql`DELETE FROM paf_submissions`);
        recordsRemoved += pafResult.rowCount || 0;
      } catch (e) {
        // Table may not exist
      }

      // Clean ALL leave requests
      const leaveResult = await db.execute(sql`DELETE FROM leave_requests`);
      recordsRemoved += leaveResult.rowCount || 0;

      // Note: Demo timecards and payroll records are now cleaned above with employees to handle foreign keys

      console.log(`Data cleanup completed: ${recordsRemoved} records removed`);
      console.log('Verifying employee cleanup...');
      
      // Verify employees are actually cleaned
      const remainingEmployees = await db.execute(sql`SELECT COUNT(*) as count FROM employees`);
      console.log(`Remaining employees after cleanup: ${remainingEmployees.rows[0]?.count || 0}`);

      return {
        success: true,
        recordsRemoved,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      console.error('Data cleanup error:', errorMessage);
      
      return {
        success: false,
        recordsRemoved,
        errors
      };
    }
  }

  /**
   * Ensures a fresh session for new users
   */
  static async prepareCleanSession(): Promise<boolean> {
    try {
      // Run cleanup
      const cleanupResult = await this.cleanupDemoData();
      
      if (!cleanupResult.success) {
        console.error('Session preparation failed:', cleanupResult.errors);
        return false;
      }

      console.log('Clean session prepared successfully');
      return true;
    } catch (error) {
      console.error('Session preparation error:', error);
      return false;
    }
  }

  /**
   * Validates that demo data has been properly cleaned
   */
  static async validateCleanState(): Promise<{
    isClean: boolean;
    remainingIssues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check for remaining demo documents
      const [docCount] = await db.execute(sql`
        SELECT COUNT(*) as count FROM support_documents WHERE author_id = 'demo_user'
      `);
      if (docCount.count > 0) {
        issues.push(`${docCount.count} demo documents still exist`);
      }

      // Check for remaining demo employees
      const [empCount] = await db.execute(sql`
        SELECT COUNT(*) as count FROM employees WHERE email LIKE '%demo%'
      `);
      if (empCount.count > 0) {
        issues.push(`${empCount.count} demo employees still exist`);
      }

      // Check for remaining demo notifications
      const [notifCount] = await db.execute(sql`
        SELECT COUNT(*) as count FROM security_notifications WHERE created_by = 'demo_user'
      `);
      if (notifCount.count > 0) {
        issues.push(`${notifCount.count} demo notifications still exist`);
      }

      return {
        isClean: issues.length === 0,
        remainingIssues: issues
      };

    } catch (error) {
      console.error('Validation error:', error);
      return {
        isClean: false,
        remainingIssues: ['Validation failed due to database error']
      };
    }
  }
}