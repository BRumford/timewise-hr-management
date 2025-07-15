import {
  users,
  employees,
  leaveRequests,
  leaveTypes,
  payrollRecords,
  documents,
  onboardingWorkflows,
  substituteAssignments,
  timeCards,
  substituteTimeCards,
  activityLogs,
  extraPayContracts,
  extraPayRequests,
  type User,
  type UpsertUser,
  type Employee,
  type InsertEmployee,
  type LeaveRequest,
  type InsertLeaveRequest,
  type LeaveType,
  type PayrollRecord,
  type InsertPayrollRecord,
  type Document,
  type InsertDocument,
  type OnboardingWorkflow,
  type InsertOnboardingWorkflow,
  type SubstituteAssignment,
  type TimeCard,
  type InsertTimeCard,
  type SubstituteTimeCard,
  type InsertSubstituteTimeCard,
  type ActivityLog,
  type InsertActivityLog,
  type ExtraPayContract,
  type InsertExtraPayContract,
  type ExtraPayRequest,
  type InsertExtraPayRequest,
  type Letter,
  type InsertLetter,
  letters,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, or, count, sql, ne } from "drizzle-orm";

export interface IStorage {
  // User operations (required for authentication)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Employee operations
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: number): Promise<void>;
  getEmployeesByDepartment(department: string): Promise<Employee[]>;
  getEmployeesByType(type: string): Promise<Employee[]>;
  bulkImportEmployees(employees: InsertEmployee[]): Promise<Employee[]>;
  bulkUpdateEmployees(updates: { id: number; data: Partial<InsertEmployee> }[]): Promise<Employee[]>;
  
  // Leave management
  getLeaveTypes(): Promise<LeaveType[]>;
  getLeaveRequests(): Promise<LeaveRequest[]>;
  getLeaveRequest(id: number): Promise<LeaveRequest | undefined>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: number, request: Partial<InsertLeaveRequest>): Promise<LeaveRequest>;
  getLeaveRequestsByEmployee(employeeId: number): Promise<LeaveRequest[]>;
  getPendingLeaveRequests(): Promise<LeaveRequest[]>;
  
  // Substitute management
  getSubstituteAssignments(): Promise<SubstituteAssignment[]>;
  createSubstituteAssignment(assignment: any): Promise<SubstituteAssignment>;
  getAvailableSubstitutes(): Promise<Employee[]>;
  
  // Payroll operations
  getPayrollRecords(): Promise<PayrollRecord[]>;
  getPayrollRecord(id: number): Promise<PayrollRecord | undefined>;
  createPayrollRecord(record: InsertPayrollRecord): Promise<PayrollRecord>;
  getPayrollRecordsByEmployee(employeeId: number): Promise<PayrollRecord[]>;
  getCurrentPayrollSummary(): Promise<any>;
  
  // Document management
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document>;
  getDocumentsByEmployee(employeeId: number): Promise<Document[]>;
  getPendingDocuments(): Promise<Document[]>;
  
  // Onboarding workflows
  getOnboardingWorkflows(): Promise<OnboardingWorkflow[]>;
  getOnboardingWorkflow(id: number): Promise<OnboardingWorkflow | undefined>;
  createOnboardingWorkflow(workflow: InsertOnboardingWorkflow): Promise<OnboardingWorkflow>;
  updateOnboardingWorkflow(id: number, workflow: Partial<InsertOnboardingWorkflow>): Promise<OnboardingWorkflow>;
  getOnboardingWorkflowByEmployee(employeeId: number): Promise<OnboardingWorkflow | undefined>;
  
  // Time cards
  getTimeCards(): Promise<TimeCard[]>;
  getTimeCard(id: number): Promise<TimeCard | undefined>;
  createTimeCard(timeCard: InsertTimeCard): Promise<TimeCard>;
  updateTimeCard(id: number, timeCard: Partial<InsertTimeCard>): Promise<TimeCard>;
  deleteTimeCard(id: number): Promise<void>;
  getTimeCardsByEmployee(employeeId: number): Promise<TimeCard[]>;
  getPendingTimeCards(): Promise<TimeCard[]>;
  getTimeCardsByDateRange(startDate: Date, endDate: Date): Promise<TimeCard[]>;
  getTimeCardsByApprovalStage(stage: string): Promise<TimeCard[]>;
  submitTimeCardForApproval(id: number, submittedBy: number): Promise<TimeCard>;
  approveTimeCardByEmployee(id: number, employeeId: number, notes?: string): Promise<TimeCard>;
  approveTimeCardByAdmin(id: number, adminId: number, notes?: string): Promise<TimeCard>;
  processTimeCardByPayroll(id: number, payrollId: number, notes?: string): Promise<TimeCard>;
  rejectTimeCard(id: number, rejectedBy: number, notes?: string): Promise<TimeCard>;
  
  // Substitute time cards
  getSubstituteTimeCards(): Promise<SubstituteTimeCard[]>;
  getSubstituteTimeCard(id: number): Promise<SubstituteTimeCard | undefined>;
  createSubstituteTimeCard(timeCard: InsertSubstituteTimeCard): Promise<SubstituteTimeCard>;
  updateSubstituteTimeCard(id: number, timeCard: Partial<InsertSubstituteTimeCard>): Promise<SubstituteTimeCard>;
  deleteSubstituteTimeCard(id: number): Promise<void>;
  getSubstituteTimeCardsBySubstitute(substituteId: number): Promise<SubstituteTimeCard[]>;
  getPendingSubstituteTimeCards(): Promise<SubstituteTimeCard[]>;
  getSubstituteTimeCardsByApprovalStage(stage: string): Promise<SubstituteTimeCard[]>;
  submitSubstituteTimeCardForApproval(id: number, submittedBy: number): Promise<SubstituteTimeCard>;
  approveSubstituteTimeCardByAdmin(id: number, adminId: number, notes?: string): Promise<SubstituteTimeCard>;
  processSubstituteTimeCardByPayroll(id: number, payrollId: number, notes?: string): Promise<SubstituteTimeCard>;
  rejectSubstituteTimeCard(id: number, rejectedBy: number, notes?: string): Promise<SubstituteTimeCard>;
  
  // Activity logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getRecentActivityLogs(): Promise<ActivityLog[]>;
  
  // Dashboard statistics
  getDashboardStats(): Promise<any>;
  
  // Extra Pay Contracts
  getExtraPayContracts(): Promise<ExtraPayContract[]>;
  getExtraPayContract(id: number): Promise<ExtraPayContract | undefined>;
  createExtraPayContract(contract: InsertExtraPayContract): Promise<ExtraPayContract>;
  updateExtraPayContract(id: number, contract: Partial<InsertExtraPayContract>): Promise<ExtraPayContract>;
  deleteExtraPayContract(id: number): Promise<void>;
  getActiveExtraPayContracts(): Promise<ExtraPayContract[]>;
  
  // Extra Pay Requests
  getExtraPayRequests(): Promise<ExtraPayRequest[]>;
  getExtraPayRequest(id: number): Promise<ExtraPayRequest | undefined>;
  createExtraPayRequest(request: InsertExtraPayRequest): Promise<ExtraPayRequest>;
  updateExtraPayRequest(id: number, request: Partial<InsertExtraPayRequest>): Promise<ExtraPayRequest>;
  deleteExtraPayRequest(id: number): Promise<void>;
  getExtraPayRequestsByEmployee(employeeId: number): Promise<ExtraPayRequest[]>;
  getExtraPayRequestsByContract(contractId: number): Promise<ExtraPayRequest[]>;
  getPendingExtraPayRequests(): Promise<ExtraPayRequest[]>;
  approveExtraPayRequest(id: number, approvedBy: string): Promise<ExtraPayRequest>;
  rejectExtraPayRequest(id: number, rejectedBy: string, reason: string): Promise<ExtraPayRequest>;
  markExtraPayRequestPaid(id: number): Promise<ExtraPayRequest>;
  
  // Letters
  getLetters(): Promise<Letter[]>;
  getLetter(id: number): Promise<Letter | undefined>;
  createLetter(letter: InsertLetter): Promise<Letter>;
  updateLetter(id: number, letter: Partial<InsertLetter>): Promise<Letter>;
  deleteLetter(id: number): Promise<void>;
  getLettersByEmployee(employeeId: number): Promise<Letter[]>;
  processLetterTemplate(id: number, employeeData: any): Promise<Letter>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Employee operations
  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).orderBy(desc(employees.createdAt));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    
    // Automatically create a time card for the new employee
    const currentDate = new Date();
    const timeCardData = {
      employeeId: newEmployee.id,
      date: currentDate,
      totalHours: "0",
      status: 'draft' as const,
      notes: 'Automatically created for new employee',
      currentApprovalStage: 'secretary' as const,
    };
    
    try {
      await db.insert(timeCards).values(timeCardData);
      
      // Create activity log for the automatic time card creation
      await this.createActivityLog({
        action: 'time_card_created',
        description: `Time card automatically created for new employee ${newEmployee.firstName} ${newEmployee.lastName}`,
        userId: 'system',
        entityType: 'employee',
        entityId: newEmployee.id,
      });
    } catch (error) {
      console.error('Error creating automatic time card for new employee:', error);
      // Don't fail the employee creation if time card creation fails
    }
    
    return newEmployee;
  }



  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee> {
    const [updatedEmployee] = await db
      .update(employees)
      .set({ ...employee, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return updatedEmployee;
  }

  async deleteEmployee(id: number): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  async getEmployeesByDepartment(department: string): Promise<Employee[]> {
    return await db.select().from(employees).where(eq(employees.department, department));
  }

  async getEmployeesByType(type: string): Promise<Employee[]> {
    return await db.select().from(employees).where(eq(employees.employeeType, type));
  }

  async bulkImportEmployees(employeeDataList: InsertEmployee[]): Promise<Employee[]> {
    const importedEmployees = [];
    
    for (const employeeData of employeeDataList) {
      try {
        // Check if employee already exists by employeeId
        const existingEmployee = await db.select().from(employees).where(eq(employees.employeeId, employeeData.employeeId));
        
        if (existingEmployee.length > 0) {
          // Update existing employee
          const [updated] = await db.update(employees).set({
            ...employeeData,
            updatedAt: new Date(),
          }).where(eq(employees.employeeId, employeeData.employeeId)).returning();
          importedEmployees.push(updated);
        } else {
          // Create new employee
          const [created] = await db.insert(employees).values(employeeData).returning();
          
          // Automatically create a time card for the new employee
          const currentDate = new Date();
          const timeCardData = {
            employeeId: created.id,
            date: currentDate,
            totalHours: "0",
            status: 'draft' as const,
            notes: 'Automatically created for imported employee',
            currentApprovalStage: 'secretary' as const,
          };
          
          try {
            await db.insert(timeCards).values(timeCardData);
            
            // Create activity log for the automatic time card creation
            await this.createActivityLog({
              action: 'time_card_created',
              description: `Time card automatically created for imported employee ${created.firstName} ${created.lastName}`,
              userId: 'system',
              entityType: 'employee',
              entityId: created.id,
            });
          } catch (timeCardError) {
            console.error('Error creating automatic time card for imported employee:', timeCardError);
            // Don't fail the import if time card creation fails
          }
          
          importedEmployees.push(created);
        }
      } catch (error) {
        console.error(`Error importing employee ${employeeData.employeeId}:`, error);
        // Continue with other employees
      }
    }
    
    return importedEmployees;
  }

  async bulkUpdateEmployees(updates: { id: number; data: Partial<InsertEmployee> }[]): Promise<Employee[]> {
    const updatedEmployees = [];
    
    for (const update of updates) {
      try {
        const [updated] = await db.update(employees).set({
          ...update.data,
          updatedAt: new Date(),
        }).where(eq(employees.id, update.id)).returning();
        updatedEmployees.push(updated);
      } catch (error) {
        console.error(`Error updating employee ${update.id}:`, error);
        // Continue with other employees
      }
    }
    
    return updatedEmployees;
  }

  // Leave management
  async getLeaveTypes(): Promise<LeaveType[]> {
    return await db.select().from(leaveTypes);
  }

  async getLeaveRequests(): Promise<LeaveRequest[]> {
    return await db.select().from(leaveRequests).orderBy(desc(leaveRequests.createdAt));
  }

  async getLeaveRequest(id: number): Promise<LeaveRequest | undefined> {
    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    return request;
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    const [newRequest] = await db.insert(leaveRequests).values(request).returning();
    return newRequest;
  }

  async updateLeaveRequest(id: number, request: Partial<InsertLeaveRequest>): Promise<LeaveRequest> {
    const [updatedRequest] = await db
      .update(leaveRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async getLeaveRequestsByEmployee(employeeId: number): Promise<LeaveRequest[]> {
    return await db.select().from(leaveRequests).where(eq(leaveRequests.employeeId, employeeId));
  }

  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    return await db.select().from(leaveRequests).where(eq(leaveRequests.status, "pending"));
  }

  // Substitute management
  async getSubstituteAssignments(): Promise<SubstituteAssignment[]> {
    return await db.select().from(substituteAssignments).orderBy(desc(substituteAssignments.createdAt));
  }

  async createSubstituteAssignment(assignment: any): Promise<SubstituteAssignment> {
    const [newAssignment] = await db.insert(substituteAssignments).values(assignment).returning();
    return newAssignment;
  }

  async getAvailableSubstitutes(): Promise<Employee[]> {
    return await db.select().from(employees).where(eq(employees.employeeType, "substitute"));
  }

  // Payroll operations
  async getPayrollRecords(): Promise<PayrollRecord[]> {
    return await db.select().from(payrollRecords).orderBy(desc(payrollRecords.createdAt));
  }

  async getPayrollRecord(id: number): Promise<PayrollRecord | undefined> {
    const [record] = await db.select().from(payrollRecords).where(eq(payrollRecords.id, id));
    return record;
  }

  async createPayrollRecord(record: InsertPayrollRecord): Promise<PayrollRecord> {
    const [newRecord] = await db.insert(payrollRecords).values(record).returning();
    return newRecord;
  }

  async getPayrollRecordsByEmployee(employeeId: number): Promise<PayrollRecord[]> {
    return await db.select().from(payrollRecords).where(eq(payrollRecords.employeeId, employeeId));
  }

  async getCurrentPayrollSummary(): Promise<any> {
    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of current month
    
    const [summary] = await db
      .select({
        totalPayroll: sql<number>`sum(${payrollRecords.grossPay})`,
        employeeCount: count(payrollRecords.id),
        totalDeductions: sql<number>`sum(${payrollRecords.deductions})`,
        totalNetPay: sql<number>`sum(${payrollRecords.netPay})`,
      })
      .from(payrollRecords)
      .where(gte(payrollRecords.payPeriodStart, currentMonth));
    
    return summary;
  }

  // Document management
  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document> {
    const [updatedDocument] = await db
      .update(documents)
      .set({ ...document, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
  }

  async getDocumentsByEmployee(employeeId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.employeeId, employeeId));
  }

  async getPendingDocuments(): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.status, "pending"));
  }

  // Onboarding workflows
  async getOnboardingWorkflows(): Promise<OnboardingWorkflow[]> {
    return await db.select().from(onboardingWorkflows).orderBy(desc(onboardingWorkflows.createdAt));
  }

  async getOnboardingWorkflow(id: number): Promise<OnboardingWorkflow | undefined> {
    const [workflow] = await db.select().from(onboardingWorkflows).where(eq(onboardingWorkflows.id, id));
    return workflow;
  }

  async createOnboardingWorkflow(workflow: InsertOnboardingWorkflow): Promise<OnboardingWorkflow> {
    const [newWorkflow] = await db.insert(onboardingWorkflows).values(workflow).returning();
    return newWorkflow;
  }

  async updateOnboardingWorkflow(id: number, workflow: Partial<InsertOnboardingWorkflow>): Promise<OnboardingWorkflow> {
    const [updatedWorkflow] = await db
      .update(onboardingWorkflows)
      .set({ ...workflow, updatedAt: new Date() })
      .where(eq(onboardingWorkflows.id, id))
      .returning();
    return updatedWorkflow;
  }

  async getOnboardingWorkflowByEmployee(employeeId: number): Promise<OnboardingWorkflow | undefined> {
    const [workflow] = await db.select().from(onboardingWorkflows).where(eq(onboardingWorkflows.employeeId, employeeId));
    return workflow;
  }

  // Time cards
  async getTimeCards(): Promise<TimeCard[]> {
    return await db
      .select()
      .from(timeCards)
      .orderBy(desc(timeCards.date));
  }

  async getTimeCard(id: number): Promise<TimeCard | undefined> {
    const [timeCard] = await db
      .select()
      .from(timeCards)
      .where(eq(timeCards.id, id));
    return timeCard;
  }

  async createTimeCard(timeCard: InsertTimeCard): Promise<TimeCard> {
    const [newTimeCard] = await db
      .insert(timeCards)
      .values(timeCard)
      .returning();
    return newTimeCard;
  }

  async updateTimeCard(id: number, timeCard: Partial<InsertTimeCard>): Promise<TimeCard> {
    const [updatedTimeCard] = await db
      .update(timeCards)
      .set({
        ...timeCard,
        updatedAt: new Date(),
      })
      .where(eq(timeCards.id, id))
      .returning();
    return updatedTimeCard;
  }

  async deleteTimeCard(id: number): Promise<void> {
    await db
      .delete(timeCards)
      .where(eq(timeCards.id, id));
  }

  async getTimeCardsByEmployee(employeeId: number): Promise<TimeCard[]> {
    return await db
      .select()
      .from(timeCards)
      .where(eq(timeCards.employeeId, employeeId))
      .orderBy(desc(timeCards.date));
  }

  async getPendingTimeCards(): Promise<TimeCard[]> {
    return await db
      .select()
      .from(timeCards)
      .where(ne(timeCards.status, "draft"))
      .orderBy(desc(timeCards.date));
  }

  async getTimeCardsByApprovalStage(stage: string): Promise<TimeCard[]> {
    return await db
      .select()
      .from(timeCards)
      .where(eq(timeCards.currentApprovalStage, stage))
      .orderBy(desc(timeCards.date));
  }

  async submitTimeCardForApproval(id: number, submittedBy: number): Promise<TimeCard> {
    const [updatedTimeCard] = await db
      .update(timeCards)
      .set({
        status: "secretary_submitted",
        currentApprovalStage: "employee",
        submittedBy,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(timeCards.id, id))
      .returning();
    return updatedTimeCard;
  }

  async approveTimeCardByEmployee(id: number, employeeId: number, notes?: string): Promise<TimeCard> {
    const [updatedTimeCard] = await db
      .update(timeCards)
      .set({
        status: "employee_approved",
        currentApprovalStage: "administrator",
        approvedByEmployee: employeeId,
        employeeApprovedAt: new Date(),
        employeeNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(timeCards.id, id))
      .returning();
    return updatedTimeCard;
  }

  async approveTimeCardByAdmin(id: number, adminId: number, notes?: string): Promise<TimeCard> {
    const [updatedTimeCard] = await db
      .update(timeCards)
      .set({
        status: "admin_approved",
        currentApprovalStage: "payroll",
        approvedByAdmin: adminId,
        adminApprovedAt: new Date(),
        adminNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(timeCards.id, id))
      .returning();
    return updatedTimeCard;
  }

  async processTimeCardByPayroll(id: number, payrollId: number, notes?: string): Promise<TimeCard> {
    const [updatedTimeCard] = await db
      .update(timeCards)
      .set({
        status: "payroll_processed",
        currentApprovalStage: "completed",
        processedByPayroll: payrollId,
        payrollProcessedAt: new Date(),
        payrollNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(timeCards.id, id))
      .returning();
    return updatedTimeCard;
  }

  async rejectTimeCard(id: number, rejectedBy: number, notes?: string): Promise<TimeCard> {
    const [updatedTimeCard] = await db
      .update(timeCards)
      .set({
        status: "rejected",
        notes: notes,
        updatedAt: new Date(),
      })
      .where(eq(timeCards.id, id))
      .returning();
    return updatedTimeCard;
  }

  async getTimeCardsByDateRange(startDate: Date, endDate: Date): Promise<TimeCard[]> {
    return await db
      .select()
      .from(timeCards)
      .where(and(
        gte(timeCards.date, startDate),
        lte(timeCards.date, endDate)
      ))
      .orderBy(desc(timeCards.date));
  }

  // Activity logs
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  async getRecentActivityLogs(): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(10);
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<any> {
    const [employeeStats] = await db
      .select({
        totalEmployees: count(employees.id),
        teachers: sql<number>`sum(case when ${employees.employeeType} = 'teacher' then 1 else 0 end)`,
        supportStaff: sql<number>`sum(case when ${employees.employeeType} = 'support_staff' then 1 else 0 end)`,
        administrators: sql<number>`sum(case when ${employees.employeeType} = 'administrator' then 1 else 0 end)`,
        substitutes: sql<number>`sum(case when ${employees.employeeType} = 'substitute' then 1 else 0 end)`,
      })
      .from(employees)
      .where(eq(employees.status, "active"));

    const [pendingStats] = await db
      .select({
        pendingOnboarding: sql<number>`sum(case when ${onboardingWorkflows.status} != 'completed' then 1 else 0 end)`,
        pendingLeaveRequests: sql<number>`sum(case when ${leaveRequests.status} = 'pending' then 1 else 0 end)`,
        pendingDocuments: sql<number>`sum(case when ${documents.status} = 'pending' then 1 else 0 end)`,
      })
      .from(onboardingWorkflows)
      .fullJoin(leaveRequests, sql`1=1`)
      .fullJoin(documents, sql`1=1`);

    const todayAssignments = await db
      .select({ count: count(substituteAssignments.id) })
      .from(substituteAssignments)
      .where(gte(substituteAssignments.assignedDate, new Date(new Date().setHours(0, 0, 0, 0))));

    return {
      ...employeeStats,
      ...pendingStats,
      todaySubstituteAssignments: todayAssignments[0].count,
    };
  }

  // Substitute time cards methods
  async getSubstituteTimeCards(): Promise<SubstituteTimeCard[]> {
    return await db.select().from(substituteTimeCards).orderBy(desc(substituteTimeCards.createdAt));
  }

  async getSubstituteTimeCard(id: number): Promise<SubstituteTimeCard | undefined> {
    const [timeCard] = await db.select().from(substituteTimeCards).where(eq(substituteTimeCards.id, id));
    return timeCard;
  }

  async createSubstituteTimeCard(timeCard: InsertSubstituteTimeCard): Promise<SubstituteTimeCard> {
    const [created] = await db.insert(substituteTimeCards).values(timeCard).returning();
    return created;
  }

  async updateSubstituteTimeCard(id: number, timeCard: Partial<InsertSubstituteTimeCard>): Promise<SubstituteTimeCard> {
    const [updated] = await db.update(substituteTimeCards).set(timeCard).where(eq(substituteTimeCards.id, id)).returning();
    return updated;
  }

  async deleteSubstituteTimeCard(id: number): Promise<void> {
    await db.delete(substituteTimeCards).where(eq(substituteTimeCards.id, id));
  }

  async getSubstituteTimeCardsBySubstitute(substituteId: number): Promise<SubstituteTimeCard[]> {
    return await db.select().from(substituteTimeCards).where(eq(substituteTimeCards.substituteId, substituteId));
  }

  async getPendingSubstituteTimeCards(): Promise<SubstituteTimeCard[]> {
    return await db.select().from(substituteTimeCards).where(ne(substituteTimeCards.status, "payroll_processed"));
  }

  async getSubstituteTimeCardsByApprovalStage(stage: string): Promise<SubstituteTimeCard[]> {
    return await db.select().from(substituteTimeCards).where(eq(substituteTimeCards.currentApprovalStage, stage));
  }

  async submitSubstituteTimeCardForApproval(id: number, submittedBy: number): Promise<SubstituteTimeCard> {
    const [updated] = await db.update(substituteTimeCards).set({
      status: "secretary_submitted",
      currentApprovalStage: "administrator",
      submittedBy: submittedBy,
      submittedAt: new Date(),
    }).where(eq(substituteTimeCards.id, id)).returning();
    return updated;
  }

  async approveSubstituteTimeCardByAdmin(id: number, adminId: number, notes?: string): Promise<SubstituteTimeCard> {
    const [updated] = await db.update(substituteTimeCards).set({
      status: "admin_approved",
      currentApprovalStage: "payroll",
      approvedByAdmin: adminId,
      adminApprovedAt: new Date(),
      adminNotes: notes,
    }).where(eq(substituteTimeCards.id, id)).returning();
    return updated;
  }

  async processSubstituteTimeCardByPayroll(id: number, payrollId: number, notes?: string): Promise<SubstituteTimeCard> {
    const [updated] = await db.update(substituteTimeCards).set({
      status: "payroll_processed",
      currentApprovalStage: "completed",
      processedByPayroll: payrollId,
      payrollProcessedAt: new Date(),
      payrollNotes: notes,
    }).where(eq(substituteTimeCards.id, id)).returning();
    return updated;
  }

  async rejectSubstituteTimeCard(id: number, rejectedBy: number, notes?: string): Promise<SubstituteTimeCard> {
    const [updated] = await db.update(substituteTimeCards).set({
      status: "rejected",
      adminNotes: notes,
    }).where(eq(substituteTimeCards.id, id)).returning();
    return updated;
  }

  // Extra Pay Contracts
  async getExtraPayContracts(): Promise<ExtraPayContract[]> {
    return await db.select().from(extraPayContracts).orderBy(desc(extraPayContracts.createdAt));
  }

  async getExtraPayContract(id: number): Promise<ExtraPayContract | undefined> {
    const [contract] = await db.select().from(extraPayContracts).where(eq(extraPayContracts.id, id));
    return contract;
  }

  async createExtraPayContract(contract: InsertExtraPayContract): Promise<ExtraPayContract> {
    const [newContract] = await db.insert(extraPayContracts).values(contract).returning();
    return newContract;
  }

  async updateExtraPayContract(id: number, contract: Partial<InsertExtraPayContract>): Promise<ExtraPayContract> {
    const [updated] = await db.update(extraPayContracts).set({
      ...contract,
      updatedAt: new Date(),
    }).where(eq(extraPayContracts.id, id)).returning();
    return updated;
  }

  async deleteExtraPayContract(id: number): Promise<void> {
    await db.delete(extraPayContracts).where(eq(extraPayContracts.id, id));
  }

  async getActiveExtraPayContracts(): Promise<ExtraPayContract[]> {
    return await db.select().from(extraPayContracts).where(eq(extraPayContracts.status, "active"));
  }

  // Extra Pay Requests
  async getExtraPayRequests(): Promise<ExtraPayRequest[]> {
    return await db.select().from(extraPayRequests).orderBy(desc(extraPayRequests.createdAt));
  }

  async getExtraPayRequest(id: number): Promise<ExtraPayRequest | undefined> {
    const [request] = await db.select().from(extraPayRequests).where(eq(extraPayRequests.id, id));
    return request;
  }

  async createExtraPayRequest(request: InsertExtraPayRequest): Promise<ExtraPayRequest> {
    const [newRequest] = await db.insert(extraPayRequests).values(request).returning();
    return newRequest;
  }

  async updateExtraPayRequest(id: number, request: Partial<InsertExtraPayRequest>): Promise<ExtraPayRequest> {
    const [updated] = await db.update(extraPayRequests).set({
      ...request,
      updatedAt: new Date(),
    }).where(eq(extraPayRequests.id, id)).returning();
    return updated;
  }

  async deleteExtraPayRequest(id: number): Promise<void> {
    await db.delete(extraPayRequests).where(eq(extraPayRequests.id, id));
  }

  async getExtraPayRequestsByEmployee(employeeId: number): Promise<ExtraPayRequest[]> {
    return await db.select().from(extraPayRequests).where(eq(extraPayRequests.employeeId, employeeId));
  }

  async getExtraPayRequestsByContract(contractId: number): Promise<ExtraPayRequest[]> {
    return await db.select().from(extraPayRequests).where(eq(extraPayRequests.contractId, contractId));
  }

  async getPendingExtraPayRequests(): Promise<ExtraPayRequest[]> {
    return await db.select().from(extraPayRequests).where(eq(extraPayRequests.status, "pending"));
  }

  async approveExtraPayRequest(id: number, approvedBy: string): Promise<ExtraPayRequest> {
    const [updated] = await db.update(extraPayRequests).set({
      status: "approved",
      approvedBy: approvedBy,
      approvedAt: new Date(),
    }).where(eq(extraPayRequests.id, id)).returning();
    return updated;
  }

  async rejectExtraPayRequest(id: number, rejectedBy: string, reason: string): Promise<ExtraPayRequest> {
    const [updated] = await db.update(extraPayRequests).set({
      status: "rejected",
      rejectedBy: rejectedBy,
      rejectedAt: new Date(),
      rejectionReason: reason,
    }).where(eq(extraPayRequests.id, id)).returning();
    return updated;
  }

  async markExtraPayRequestPaid(id: number): Promise<ExtraPayRequest> {
    const [updated] = await db.update(extraPayRequests).set({
      status: "paid",
      paidAt: new Date(),
    }).where(eq(extraPayRequests.id, id)).returning();
    return updated;
  }

  // Letters operations
  async getLetters(): Promise<Letter[]> {
    return await db.select().from(letters).orderBy(desc(letters.createdAt));
  }

  async getLetter(id: number): Promise<Letter | undefined> {
    const [letter] = await db.select().from(letters).where(eq(letters.id, id));
    return letter;
  }

  async createLetter(letter: InsertLetter): Promise<Letter> {
    const [newLetter] = await db.insert(letters).values(letter).returning();
    return newLetter;
  }

  async updateLetter(id: number, letter: Partial<InsertLetter>): Promise<Letter> {
    const [updated] = await db.update(letters).set({
      ...letter,
      updatedAt: new Date(),
    }).where(eq(letters.id, id)).returning();
    return updated;
  }

  async deleteLetter(id: number): Promise<void> {
    await db.delete(letters).where(eq(letters.id, id));
  }

  async getLettersByEmployee(employeeId: number): Promise<Letter[]> {
    return await db.select().from(letters).where(eq(letters.employeeId, employeeId));
  }

  async processLetterTemplate(id: number, employeeData: any): Promise<Letter> {
    const letter = await this.getLetter(id);
    if (!letter) {
      throw new Error('Letter not found');
    }

    // Replace placeholders with employee data
    let processedContent = letter.templateContent;
    const placeholders = [];

    // Common placeholders
    const replacements = {
      '{{firstName}}': employeeData.firstName || '',
      '{{lastName}}': employeeData.lastName || '',
      '{{fullName}}': `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim(),
      '{{employeeId}}': employeeData.employeeId || '',
      '{{email}}': employeeData.email || '',
      '{{department}}': employeeData.department || '',
      '{{position}}': employeeData.position || '',
      '{{startDate}}': employeeData.startDate ? new Date(employeeData.startDate).toLocaleDateString() : '',
      '{{salary}}': employeeData.salary || '',
      '{{phone}}': employeeData.phone || '',
      '{{address}}': employeeData.address || '',
      '{{emergencyContact}}': employeeData.emergencyContact || '',
      '{{emergencyPhone}}': employeeData.emergencyPhone || '',
      '{{currentDate}}': new Date().toLocaleDateString(),
      '{{currentYear}}': new Date().getFullYear().toString(),
    };

    // Replace placeholders and track what was replaced
    for (const [placeholder, value] of Object.entries(replacements)) {
      if (processedContent.includes(placeholder)) {
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
        placeholders.push({ placeholder, value });
      }
    }

    // Update the letter with processed content
    const [updated] = await db.update(letters).set({
      processedContent,
      placeholders,
      status: 'processed',
      processedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(letters.id, id)).returning();

    return updated;
  }
}

export const storage = new DatabaseStorage();
