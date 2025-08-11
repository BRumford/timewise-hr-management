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
      // Clean demo documents
      const docResult = await db.execute(sql`
        DELETE FROM support_documents 
        WHERE author_id = 'demo_user'
      `);
      recordsRemoved += docResult.rowCount || 0;

      // Clean demo security notifications
      const notificationResult = await db.execute(sql`
        DELETE FROM security_notifications 
        WHERE created_by = 'demo_user'
      `);
      recordsRemoved += notificationResult.rowCount || 0;

      // Clean demo security updates
      const updateResult = await db.execute(sql`
        DELETE FROM security_updates 
        WHERE released_by = 'demo_user'
      `);
      recordsRemoved += updateResult.rowCount || 0;

      // Clean demo vulnerability assessments
      const vulnResult = await db.execute(sql`
        DELETE FROM vulnerability_assessments 
        WHERE title LIKE '%demo%' OR title LIKE '%test%'
      `);
      recordsRemoved += vulnResult.rowCount || 0;

      // Clean demo employees and related data (handle foreign key constraints)
      // First delete dependent records
      await db.execute(sql`
        DELETE FROM letters 
        WHERE employee_id IN (
          SELECT id FROM employees 
          WHERE email LIKE '%demo%' OR email LIKE '%test%' OR first_name = 'Demo'
        )
      `);

      await db.execute(sql`
        DELETE FROM time_cards 
        WHERE employee_id IN (
          SELECT id FROM employees 
          WHERE email LIKE '%demo%' OR email LIKE '%test%' OR first_name = 'Demo'
        )
      `);

      await db.execute(sql`
        DELETE FROM payroll_records 
        WHERE employee_id IN (
          SELECT id FROM employees 
          WHERE email LIKE '%demo%' OR email LIKE '%test%' OR first_name = 'Demo'
        )
      `);

      // Now delete the employees
      const employeeResult = await db.execute(sql`
        DELETE FROM employees 
        WHERE email LIKE '%demo%' OR email LIKE '%test%' OR first_name = 'Demo'
      `);
      recordsRemoved += employeeResult.rowCount || 0;

      // Clean demo PAF submissions
      const pafResult = await db.execute(sql`
        DELETE FROM paf_submissions 
        WHERE created_by = 'demo_user'
      `);
      recordsRemoved += pafResult.rowCount || 0;

      // Clean demo leave requests
      const leaveResult = await db.execute(sql`
        DELETE FROM leave_requests 
        WHERE created_by = 'demo_user'
      `);
      recordsRemoved += leaveResult.rowCount || 0;

      // Note: Demo timecards and payroll records are now cleaned above with employees to handle foreign keys

      console.log(`Data cleanup completed: ${recordsRemoved} records removed`);

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