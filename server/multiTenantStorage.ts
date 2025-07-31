import { eq, and, desc, sql, ilike } from 'drizzle-orm';
import { db } from './db';
import * as schema from '@shared/schema';
import { 
  users, 
  employees, 
  leaveRequests, 
  leaveTypes, 
  payrollRecords, 
  timeCards, 
  documents,
  districts,
  type User,
  type Employee,
  type LeaveRequest,
  type LeaveType,
  type PayrollRecord,
  type TimeCard,
  type Document,
  type InsertEmployee,
  type InsertLeaveRequest,
  type InsertLeaveType,
  type InsertPayrollRecord,
  type InsertTimeCard,
  type InsertDocument
} from '@shared/schema';

/**
 * Multi-tenant storage layer that ensures complete data isolation between districts
 * All operations are scoped to the current district context
 */
export class MultiTenantStorage {
  private districtId: number;

  constructor(districtId: number) {
    this.districtId = districtId;
  }

  // Employee operations with district isolation
  async getEmployees(): Promise<Employee[]> {
    return await db
      .select()
      .from(employees)
      .where(eq(employees.districtId, this.districtId));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(
        eq(employees.id, id),
        eq(employees.districtId, this.districtId)
      ));
    return employee;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db
      .insert(employees)
      .values({ ...employee, districtId: this.districtId })
      .returning();
    return newEmployee;
  }

  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee> {
    const [updatedEmployee] = await db
      .update(employees)
      .set({ ...employee, updatedAt: new Date() })
      .where(and(
        eq(employees.id, id),
        eq(employees.districtId, this.districtId)
      ))
      .returning();
    return updatedEmployee;
  }

  async deleteEmployee(id: number): Promise<void> {
    await db
      .delete(employees)
      .where(and(
        eq(employees.id, id),
        eq(employees.districtId, this.districtId)
      ));
  }

  // Leave operations with district isolation
  async getLeaveRequests(): Promise<LeaveRequest[]> {
    return await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.districtId, this.districtId))
      .orderBy(desc(leaveRequests.createdAt));
  }

  async getLeaveRequest(id: number): Promise<LeaveRequest | undefined> {
    const [request] = await db
      .select()
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.id, id),
        eq(leaveRequests.districtId, this.districtId)
      ));
    return request;
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    const [newRequest] = await db
      .insert(leaveRequests)
      .values({ ...request, districtId: this.districtId })
      .returning();
    return newRequest;
  }

  async updateLeaveRequest(id: number, request: Partial<InsertLeaveRequest>): Promise<LeaveRequest> {
    const [updatedRequest] = await db
      .update(leaveRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(and(
        eq(leaveRequests.id, id),
        eq(leaveRequests.districtId, this.districtId)
      ))
      .returning();
    return updatedRequest;
  }

  // Leave types with district isolation
  async getLeaveTypes(): Promise<LeaveType[]> {
    return await db
      .select()
      .from(leaveTypes)
      .where(eq(leaveTypes.districtId, this.districtId));
  }

  async createLeaveType(leaveType: InsertLeaveType): Promise<LeaveType> {
    const [newLeaveType] = await db
      .insert(leaveTypes)
      .values({ ...leaveType, districtId: this.districtId })
      .returning();
    return newLeaveType;
  }

  // Payroll operations with district isolation
  async getPayrollRecords(): Promise<PayrollRecord[]> {
    return await db
      .select()
      .from(payrollRecords)
      .where(eq(payrollRecords.districtId, this.districtId))
      .orderBy(desc(payrollRecords.createdAt));
  }

  async getPayrollRecord(id: number): Promise<PayrollRecord | undefined> {
    const [record] = await db
      .select()
      .from(payrollRecords)
      .where(and(
        eq(payrollRecords.id, id),
        eq(payrollRecords.districtId, this.districtId)
      ));
    return record;
  }

  async createPayrollRecord(record: InsertPayrollRecord): Promise<PayrollRecord> {
    const [newRecord] = await db
      .insert(payrollRecords)
      .values({ ...record, districtId: this.districtId })
      .returning();
    return newRecord;
  }

  // Time card operations with district isolation
  async getTimeCards(): Promise<TimeCard[]> {
    return await db
      .select()
      .from(timeCards)
      .where(eq(timeCards.districtId, this.districtId))
      .orderBy(desc(timeCards.createdAt));
  }

  async getTimeCard(id: number): Promise<TimeCard | undefined> {
    const [timeCard] = await db
      .select()
      .from(timeCards)
      .where(and(
        eq(timeCards.id, id),
        eq(timeCards.districtId, this.districtId)
      ));
    return timeCard;
  }

  async createTimeCard(timeCard: InsertTimeCard): Promise<TimeCard> {
    const [newTimeCard] = await db
      .insert(timeCards)
      .values({ ...timeCard, districtId: this.districtId })
      .returning();
    return newTimeCard;
  }

  async updateTimeCard(id: number, timeCard: Partial<InsertTimeCard>): Promise<TimeCard> {
    const [updatedTimeCard] = await db
      .update(timeCards)
      .set({ ...timeCard, updatedAt: new Date() })
      .where(and(
        eq(timeCards.id, id),
        eq(timeCards.districtId, this.districtId)
      ))
      .returning();
    return updatedTimeCard;
  }

  // Document operations with district isolation
  async getDocuments(): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.districtId, this.districtId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, id),
        eq(documents.districtId, this.districtId)
      ));
    return document;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values({ ...document, districtId: this.districtId })
      .returning();
    return newDocument;
  }

  // Search operations with district isolation
  async searchEmployees(query: string): Promise<Employee[]> {
    return await db
      .select()
      .from(employees)
      .where(and(
        eq(employees.districtId, this.districtId),
        sql`${employees.firstName} ILIKE ${'%' + query + '%'} OR ${employees.lastName} ILIKE ${'%' + query + '%'} OR ${employees.email} ILIKE ${'%' + query + '%'}`
      ));
  }

  async searchDocuments(query: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.districtId, this.districtId),
        sql`${documents.title} ILIKE ${'%' + query + '%'} OR ${documents.description} ILIKE ${'%' + query + '%'}`
      ));
  }

  // Analytics and reporting (district-scoped)
  async getEmployeeCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(eq(employees.districtId, this.districtId));
    return result?.count || 0;
  }

  async getActiveLeaveRequests(): Promise<LeaveRequest[]> {
    return await db
      .select()
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.districtId, this.districtId),
        sql`${leaveRequests.status} IN ('pending', 'approved')`
      ));
  }

  async getDistrictUsageStats(): Promise<{
    employeeCount: number,
    documentCount: number,
    leaveRequestCount: number,
    payrollRecordCount: number
  }> {
    const [employeeCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(eq(employees.districtId, this.districtId));

    const [documentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(eq(documents.districtId, this.districtId));

    const [leaveRequestCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leaveRequests)
      .where(eq(leaveRequests.districtId, this.districtId));

    const [payrollRecordCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(payrollRecords)
      .where(eq(payrollRecords.districtId, this.districtId));

    return {
      employeeCount: employeeCount?.count || 0,
      documentCount: documentCount?.count || 0,
      leaveRequestCount: leaveRequestCount?.count || 0,
      payrollRecordCount: payrollRecordCount?.count || 0
    };
  }
}

// Factory function to create district-scoped storage
export function createDistrictStorage(districtId: number): MultiTenantStorage {
  return new MultiTenantStorage(districtId);
}

// Helper function to get district storage from request context
export function getDistrictStorage(req: any): MultiTenantStorage {
  if (!req.district?.id) {
    throw new Error("District context not found. Use tenant middleware first.");
  }
  return new MultiTenantStorage(req.district.id);
}