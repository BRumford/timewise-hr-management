import {
  users,
  employees,
  leaveRequests,
  leaveTypes,
  payrollRecords,
  taxWithholdingConfigs,
  employeeBenefitElections,
  employeeTaxWithholdings,
  payrollBatches,
  documents,
  onboardingWorkflows,
  onboardingForms,
  onboardingFormSubmissions,
  substituteAssignments,
  timeCards,
  substituteTimeCards,
  activityLogs,
  extraPayContracts,
  extraPayRequests,
  districtSettings,
  payPeriods,
  type User,
  type UpsertUser,
  type Employee,
  type InsertEmployee,
  type LeaveRequest,
  type InsertLeaveRequest,
  type LeaveType,
  type PayrollRecord,
  type InsertPayrollRecord,
  type TaxWithholdingConfig,
  type InsertTaxWithholdingConfig,
  type EmployeeBenefitElection,
  type InsertEmployeeBenefitElection,
  type EmployeeTaxWithholding,
  type InsertEmployeeTaxWithholding,
  type PayrollBatch,
  type InsertPayrollBatch,
  type Document,
  type InsertDocument,
  type OnboardingWorkflow,
  type InsertOnboardingWorkflow,
  type OnboardingForm,
  type InsertOnboardingForm,
  type OnboardingFormSubmission,
  type InsertOnboardingFormSubmission,
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
  type TimecardTemplate,
  type InsertTimecardTemplate,
  type TimecardTemplateField,
  type InsertTimecardTemplateField,
  timecardTemplates,
  timecardTemplateFields,
  type DistrictSettings,
  type InsertDistrictSettings,
  type PayPeriod,
  type InsertPayPeriod,
  customFieldLabels,
  type CustomFieldLabel,
  type InsertCustomFieldLabel,
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
  getEmployeeByUserId(userId: string): Promise<Employee | undefined>;
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
  
  // Onboarding forms
  getOnboardingForms(): Promise<OnboardingForm[]>;
  getOnboardingForm(id: number): Promise<OnboardingForm | undefined>;
  createOnboardingForm(form: InsertOnboardingForm): Promise<OnboardingForm>;
  updateOnboardingForm(id: number, form: Partial<InsertOnboardingForm>): Promise<OnboardingForm>;
  deleteOnboardingForm(id: number): Promise<void>;
  getOnboardingFormsByType(formType: string): Promise<OnboardingForm[]>;
  getOnboardingFormsByCategory(category: string): Promise<OnboardingForm[]>;
  getOnboardingFormsByEmployeeType(employeeType: string): Promise<OnboardingForm[]>;
  getActiveOnboardingForms(): Promise<OnboardingForm[]>;
  
  // Onboarding form submissions
  getOnboardingFormSubmissions(): Promise<OnboardingFormSubmission[]>;
  getOnboardingFormSubmission(id: number): Promise<OnboardingFormSubmission | undefined>;
  createOnboardingFormSubmission(submission: InsertOnboardingFormSubmission): Promise<OnboardingFormSubmission>;
  updateOnboardingFormSubmission(id: number, submission: Partial<InsertOnboardingFormSubmission>): Promise<OnboardingFormSubmission>;
  getOnboardingFormSubmissionsByEmployee(employeeId: number): Promise<OnboardingFormSubmission[]>;
  getOnboardingFormSubmissionsByForm(formId: number): Promise<OnboardingFormSubmission[]>;
  getOnboardingFormSubmissionsByWorkflow(workflowId: number): Promise<OnboardingFormSubmission[]>;
  getPendingOnboardingFormSubmissions(): Promise<OnboardingFormSubmission[]>;
  
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
  
  // Timecard Templates
  getTimecardTemplates(): Promise<TimecardTemplate[]>;
  getTimecardTemplate(id: number): Promise<TimecardTemplate | undefined>;
  createTimecardTemplate(template: InsertTimecardTemplate): Promise<TimecardTemplate>;
  updateTimecardTemplate(id: number, template: Partial<InsertTimecardTemplate>): Promise<TimecardTemplate>;
  deleteTimecardTemplate(id: number): Promise<void>;
  getTimecardTemplatesByEmployeeType(employeeType: string): Promise<TimecardTemplate[]>;
  getActiveTimecardTemplates(): Promise<TimecardTemplate[]>;
  getDefaultTimecardTemplate(employeeType: string): Promise<TimecardTemplate | undefined>;
  
  // Timecard Template Fields
  getTimecardTemplateFields(templateId: number): Promise<TimecardTemplateField[]>;
  getTimecardTemplateField(id: number): Promise<TimecardTemplateField | undefined>;
  createTimecardTemplateField(field: InsertTimecardTemplateField): Promise<TimecardTemplateField>;
  updateTimecardTemplateField(id: number, field: Partial<InsertTimecardTemplateField>): Promise<TimecardTemplateField>;
  deleteTimecardTemplateField(id: number): Promise<void>;
  getTimecardTemplateFieldsBySection(templateId: number, section: string): Promise<TimecardTemplateField[]>;
  
  // District Settings
  getDistrictSettings(): Promise<DistrictSettings | undefined>;
  createDistrictSettings(settings: InsertDistrictSettings): Promise<DistrictSettings>;
  updateDistrictSettings(id: number, settings: Partial<InsertDistrictSettings>): Promise<DistrictSettings>;
  upsertDistrictSettings(settings: InsertDistrictSettings): Promise<DistrictSettings>;
  
  // Pay Periods
  getPayPeriods(): Promise<PayPeriod[]>;
  getPayPeriod(id: number): Promise<PayPeriod | undefined>;
  createPayPeriod(period: InsertPayPeriod): Promise<PayPeriod>;
  updatePayPeriod(id: number, period: Partial<InsertPayPeriod>): Promise<PayPeriod>;
  deletePayPeriod(id: number): Promise<void>;
  getCurrentPayPeriod(): Promise<PayPeriod | undefined>;
  getPayPeriodsByDateRange(startDate: Date, endDate: Date): Promise<PayPeriod[]>;
  getPayPeriodsByStatus(status: string): Promise<PayPeriod[]>;
  getActivePayPeriods(): Promise<PayPeriod[]>;

  // Custom field label operations
  getCustomFieldLabels(): Promise<CustomFieldLabel[]>;
  getCustomFieldLabel(fieldName: string): Promise<CustomFieldLabel | undefined>;
  createCustomFieldLabel(label: InsertCustomFieldLabel): Promise<CustomFieldLabel>;
  updateCustomFieldLabel(id: number, label: Partial<InsertCustomFieldLabel>): Promise<CustomFieldLabel>;
  deleteCustomFieldLabel(id: number): Promise<void>;
  initializeDefaultFieldLabels(): Promise<void>;
  generatePayPeriods(startDate: Date, endDate: Date, frequency: string): Promise<PayPeriod[]>;
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

  async getEmployeeByUserId(userId: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.userId, userId));
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
        totalDeductions: sql<number>`sum(${payrollRecords.totalDeductions})`,
        totalNetPay: sql<number>`sum(${payrollRecords.netPay})`,
      })
      .from(payrollRecords)
      .where(gte(payrollRecords.payPeriodStart, currentMonth));
    
    return summary;
  }

  // Tax configuration management
  async getTaxConfigs(): Promise<TaxWithholdingConfig[]> {
    return await db.select().from(taxWithholdingConfigs).orderBy(desc(taxWithholdingConfigs.createdAt));
  }

  async createTaxConfig(config: InsertTaxWithholdingConfig): Promise<TaxWithholdingConfig> {
    const [newConfig] = await db.insert(taxWithholdingConfigs).values(config).returning();
    return newConfig;
  }

  async updateTaxConfig(id: number, config: Partial<InsertTaxWithholdingConfig>): Promise<TaxWithholdingConfig> {
    const [updatedConfig] = await db
      .update(taxWithholdingConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(taxWithholdingConfigs.id, id))
      .returning();
    return updatedConfig;
  }

  // Employee benefit elections management
  async getBenefitElections(): Promise<EmployeeBenefitElection[]> {
    return await db.select().from(employeeBenefitElections).orderBy(desc(employeeBenefitElections.createdAt));
  }

  async createBenefitElection(election: InsertEmployeeBenefitElection): Promise<EmployeeBenefitElection> {
    const [newElection] = await db.insert(employeeBenefitElections).values(election).returning();
    return newElection;
  }

  async getBenefitElectionsByEmployee(employeeId: number): Promise<EmployeeBenefitElection[]> {
    return await db.select().from(employeeBenefitElections).where(eq(employeeBenefitElections.employeeId, employeeId));
  }

  // Employee tax withholding management
  async getEmployeeTaxWithholdings(): Promise<EmployeeTaxWithholding[]> {
    return await db.select().from(employeeTaxWithholdings).orderBy(desc(employeeTaxWithholdings.createdAt));
  }

  async createEmployeeTaxWithholding(withholding: InsertEmployeeTaxWithholding): Promise<EmployeeTaxWithholding> {
    const [newWithholding] = await db.insert(employeeTaxWithholdings).values(withholding).returning();
    return newWithholding;
  }

  async getEmployeeTaxWithholdingsByEmployee(employeeId: number): Promise<EmployeeTaxWithholding[]> {
    return await db.select().from(employeeTaxWithholdings).where(eq(employeeTaxWithholdings.employeeId, employeeId));
  }

  // Payroll batch management
  async getPayrollBatches(): Promise<PayrollBatch[]> {
    return await db.select().from(payrollBatches).orderBy(desc(payrollBatches.createdAt));
  }

  async createPayrollBatch(batch: InsertPayrollBatch): Promise<PayrollBatch> {
    const [newBatch] = await db.insert(payrollBatches).values(batch).returning();
    return newBatch;
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

  // Onboarding forms methods
  async getOnboardingForms(): Promise<OnboardingForm[]> {
    return await db.select().from(onboardingForms).orderBy(onboardingForms.createdAt);
  }

  async getOnboardingForm(id: number): Promise<OnboardingForm | undefined> {
    const [form] = await db.select().from(onboardingForms).where(eq(onboardingForms.id, id));
    return form;
  }

  async createOnboardingForm(form: InsertOnboardingForm): Promise<OnboardingForm> {
    const [newForm] = await db.insert(onboardingForms).values(form).returning();
    return newForm;
  }

  async updateOnboardingForm(id: number, form: Partial<InsertOnboardingForm>): Promise<OnboardingForm> {
    const [updatedForm] = await db
      .update(onboardingForms)
      .set({ ...form, updatedAt: new Date() })
      .where(eq(onboardingForms.id, id))
      .returning();
    return updatedForm;
  }

  async deleteOnboardingForm(id: number): Promise<void> {
    await db.delete(onboardingForms).where(eq(onboardingForms.id, id));
  }

  async getOnboardingFormsByType(formType: string): Promise<OnboardingForm[]> {
    return await db.select().from(onboardingForms).where(eq(onboardingForms.formType, formType));
  }

  async getOnboardingFormsByCategory(category: string): Promise<OnboardingForm[]> {
    return await db.select().from(onboardingForms).where(eq(onboardingForms.category, category));
  }

  async getOnboardingFormsByEmployeeType(employeeType: string): Promise<OnboardingForm[]> {
    return await db.select().from(onboardingForms).where(
      sql`${onboardingForms.applicableEmployeeTypes} @> ARRAY[${employeeType}]`
    );
  }

  async getActiveOnboardingForms(): Promise<OnboardingForm[]> {
    return await db.select().from(onboardingForms).where(eq(onboardingForms.isActive, true));
  }

  // Onboarding form submissions methods
  async getOnboardingFormSubmissions(): Promise<OnboardingFormSubmission[]> {
    return await db.select().from(onboardingFormSubmissions).orderBy(onboardingFormSubmissions.createdAt);
  }

  async getOnboardingFormSubmission(id: number): Promise<OnboardingFormSubmission | undefined> {
    const [submission] = await db.select().from(onboardingFormSubmissions).where(eq(onboardingFormSubmissions.id, id));
    return submission;
  }

  async createOnboardingFormSubmission(submission: InsertOnboardingFormSubmission): Promise<OnboardingFormSubmission> {
    const [newSubmission] = await db.insert(onboardingFormSubmissions).values(submission).returning();
    return newSubmission;
  }

  async updateOnboardingFormSubmission(id: number, submission: Partial<InsertOnboardingFormSubmission>): Promise<OnboardingFormSubmission> {
    const [updatedSubmission] = await db
      .update(onboardingFormSubmissions)
      .set({ ...submission, updatedAt: new Date() })
      .where(eq(onboardingFormSubmissions.id, id))
      .returning();
    return updatedSubmission;
  }

  async getOnboardingFormSubmissionsByEmployee(employeeId: number): Promise<OnboardingFormSubmission[]> {
    return await db.select().from(onboardingFormSubmissions).where(eq(onboardingFormSubmissions.employeeId, employeeId));
  }

  async getOnboardingFormSubmissionsByForm(formId: number): Promise<OnboardingFormSubmission[]> {
    return await db.select().from(onboardingFormSubmissions).where(eq(onboardingFormSubmissions.formId, formId));
  }

  async getOnboardingFormSubmissionsByWorkflow(workflowId: number): Promise<OnboardingFormSubmission[]> {
    return await db.select().from(onboardingFormSubmissions).where(eq(onboardingFormSubmissions.workflowId, workflowId));
  }

  async getPendingOnboardingFormSubmissions(): Promise<OnboardingFormSubmission[]> {
    return await db.select().from(onboardingFormSubmissions).where(eq(onboardingFormSubmissions.status, "pending"));
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

  // Timecard Template operations
  async getTimecardTemplates(): Promise<TimecardTemplate[]> {
    return await db.select().from(timecardTemplates).orderBy(desc(timecardTemplates.createdAt));
  }

  async getTimecardTemplate(id: number): Promise<TimecardTemplate | undefined> {
    const [template] = await db.select().from(timecardTemplates).where(eq(timecardTemplates.id, id));
    return template;
  }

  async createTimecardTemplate(template: InsertTimecardTemplate): Promise<TimecardTemplate> {
    const [newTemplate] = await db.insert(timecardTemplates).values(template).returning();
    return newTemplate;
  }

  async updateTimecardTemplate(id: number, template: Partial<InsertTimecardTemplate>): Promise<TimecardTemplate> {
    const [updated] = await db.update(timecardTemplates).set({
      ...template,
      updatedAt: new Date(),
    }).where(eq(timecardTemplates.id, id)).returning();
    return updated;
  }

  async deleteTimecardTemplate(id: number): Promise<void> {
    await db.delete(timecardTemplates).where(eq(timecardTemplates.id, id));
  }

  async getTimecardTemplatesByEmployeeType(employeeType: string): Promise<TimecardTemplate[]> {
    return await db.select().from(timecardTemplates).where(eq(timecardTemplates.employeeType, employeeType));
  }

  async getActiveTimecardTemplates(): Promise<TimecardTemplate[]> {
    return await db.select().from(timecardTemplates).where(eq(timecardTemplates.isActive, true));
  }

  async getDefaultTimecardTemplate(employeeType: string): Promise<TimecardTemplate | undefined> {
    const [template] = await db.select().from(timecardTemplates).where(
      and(
        eq(timecardTemplates.employeeType, employeeType),
        eq(timecardTemplates.isDefault, true),
        eq(timecardTemplates.isActive, true)
      )
    );
    return template;
  }

  // Timecard Template Fields operations
  async getTimecardTemplateFields(templateId: number): Promise<TimecardTemplateField[]> {
    return await db.select().from(timecardTemplateFields)
      .where(eq(timecardTemplateFields.templateId, templateId))
      .orderBy(timecardTemplateFields.displayOrder);
  }

  async getTimecardTemplateField(id: number): Promise<TimecardTemplateField | undefined> {
    const [field] = await db.select().from(timecardTemplateFields).where(eq(timecardTemplateFields.id, id));
    return field;
  }

  async createTimecardTemplateField(field: InsertTimecardTemplateField): Promise<TimecardTemplateField> {
    const [newField] = await db.insert(timecardTemplateFields).values(field).returning();
    return newField;
  }

  async updateTimecardTemplateField(id: number, field: Partial<InsertTimecardTemplateField>): Promise<TimecardTemplateField> {
    const [updated] = await db.update(timecardTemplateFields).set({
      ...field,
      updatedAt: new Date(),
    }).where(eq(timecardTemplateFields.id, id)).returning();
    return updated;
  }

  async deleteTimecardTemplateField(id: number): Promise<void> {
    await db.delete(timecardTemplateFields).where(eq(timecardTemplateFields.id, id));
  }

  async getTimecardTemplateFieldsBySection(templateId: number, section: string): Promise<TimecardTemplateField[]> {
    return await db.select().from(timecardTemplateFields).where(
      and(
        eq(timecardTemplateFields.templateId, templateId),
        eq(timecardTemplateFields.section, section)
      )
    ).orderBy(timecardTemplateFields.displayOrder);
  }

  // District Settings operations
  async getDistrictSettings(): Promise<DistrictSettings | undefined> {
    const [settings] = await db.select().from(districtSettings).limit(1);
    return settings;
  }

  async createDistrictSettings(settings: InsertDistrictSettings): Promise<DistrictSettings> {
    const [newSettings] = await db.insert(districtSettings).values(settings).returning();
    return newSettings;
  }

  async updateDistrictSettings(id: number, settings: Partial<InsertDistrictSettings>): Promise<DistrictSettings> {
    const [updated] = await db.update(districtSettings).set({
      ...settings,
      updatedAt: new Date(),
    }).where(eq(districtSettings.id, id)).returning();
    return updated;
  }

  async upsertDistrictSettings(settings: InsertDistrictSettings): Promise<DistrictSettings> {
    const existingSettings = await this.getDistrictSettings();
    
    if (existingSettings) {
      return await this.updateDistrictSettings(existingSettings.id, settings);
    } else {
      return await this.createDistrictSettings(settings);
    }
  }

  // Pay Periods operations
  async getPayPeriods(): Promise<PayPeriod[]> {
    return await db.select().from(payPeriods).orderBy(desc(payPeriods.startDate));
  }

  async getPayPeriod(id: number): Promise<PayPeriod | undefined> {
    const [period] = await db.select().from(payPeriods).where(eq(payPeriods.id, id));
    return period;
  }

  async createPayPeriod(period: InsertPayPeriod): Promise<PayPeriod> {
    const [newPeriod] = await db.insert(payPeriods).values(period).returning();
    return newPeriod;
  }

  async updatePayPeriod(id: number, period: Partial<InsertPayPeriod>): Promise<PayPeriod> {
    const [updated] = await db.update(payPeriods).set({
      ...period,
      updatedAt: new Date(),
    }).where(eq(payPeriods.id, id)).returning();
    return updated;
  }

  async deletePayPeriod(id: number): Promise<void> {
    await db.delete(payPeriods).where(eq(payPeriods.id, id));
  }

  async getCurrentPayPeriod(): Promise<PayPeriod | undefined> {
    const currentDate = new Date();
    const [period] = await db.select().from(payPeriods).where(
      and(
        lte(payPeriods.startDate, currentDate.toISOString().split('T')[0]),
        gte(payPeriods.endDate, currentDate.toISOString().split('T')[0]),
        eq(payPeriods.isActive, true)
      )
    );
    return period;
  }

  async getPayPeriodsByDateRange(startDate: Date, endDate: Date): Promise<PayPeriod[]> {
    return await db.select().from(payPeriods).where(
      and(
        gte(payPeriods.startDate, startDate.toISOString().split('T')[0]),
        lte(payPeriods.endDate, endDate.toISOString().split('T')[0])
      )
    ).orderBy(payPeriods.startDate);
  }

  async getPayPeriodsByStatus(status: string): Promise<PayPeriod[]> {
    return await db.select().from(payPeriods).where(eq(payPeriods.status, status));
  }

  async getActivePayPeriods(): Promise<PayPeriod[]> {
    return await db.select().from(payPeriods).where(eq(payPeriods.isActive, true));
  }

  async generatePayPeriods(startDate: Date, endDate: Date, frequency: string): Promise<PayPeriod[]> {
    const periods: PayPeriod[] = [];
    const settings = await this.getDistrictSettings();
    
    if (!settings) {
      throw new Error('District settings not found. Please configure district settings first.');
    }

    let currentDate = new Date(startDate);
    let periodNumber = 1;

    while (currentDate < endDate) {
      const periodStartDate = new Date(currentDate);
      let periodEndDate = new Date(currentDate);
      
      // Calculate period end date based on frequency
      switch (frequency) {
        case 'weekly':
          periodEndDate.setDate(periodEndDate.getDate() + 6);
          break;
        case 'bi-weekly':
          periodEndDate.setDate(periodEndDate.getDate() + 13);
          break;
        case 'monthly':
          periodEndDate.setMonth(periodEndDate.getMonth() + 1);
          periodEndDate.setDate(0); // Last day of the month
          break;
        case 'semi-monthly':
          if (periodStartDate.getDate() === 1) {
            periodEndDate.setDate(15);
          } else {
            periodEndDate.setMonth(periodEndDate.getMonth() + 1);
            periodEndDate.setDate(0);
          }
          break;
        default:
          throw new Error(`Unsupported frequency: ${frequency}`);
      }

      // Don't go past the end date
      if (periodEndDate > endDate) {
        periodEndDate = new Date(endDate);
      }

      // Calculate cutoff dates and deadlines
      const timecardCutoffDate = new Date(periodEndDate);
      timecardCutoffDate.setDate(settings.timecardCutoffDay);
      
      const timecardSubmissionDeadline = new Date(timecardCutoffDate);
      timecardSubmissionDeadline.setDate(timecardSubmissionDeadline.getDate() + settings.timecardSubmissionDeadline);
      
      const timecardApprovalDeadline = new Date(timecardCutoffDate);
      timecardApprovalDeadline.setDate(timecardApprovalDeadline.getDate() + settings.timecardApprovalDeadline);
      
      const payrollProcessingDate = new Date(timecardApprovalDeadline);
      payrollProcessingDate.setDate(payrollProcessingDate.getDate() + 2);
      
      const payDate = new Date(periodEndDate);
      payDate.setDate(settings.payrollPayDay);
      if (payDate < periodEndDate) {
        payDate.setMonth(payDate.getMonth() + 1);
      }

      const periodData: InsertPayPeriod = {
        periodName: `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Period ${periodNumber} - ${periodStartDate.toLocaleDateString()}`,
        periodType: frequency,
        startDate: periodStartDate.toISOString().split('T')[0],
        endDate: periodEndDate.toISOString().split('T')[0],
        timecardCutoffDate: timecardCutoffDate.toISOString().split('T')[0],
        timecardSubmissionDeadline: timecardSubmissionDeadline.toISOString().split('T')[0],
        timecardApprovalDeadline: timecardApprovalDeadline.toISOString().split('T')[0],
        payrollProcessingDate: payrollProcessingDate.toISOString().split('T')[0],
        payDate: payDate.toISOString().split('T')[0],
        status: 'upcoming',
        isActive: true,
      };

      const newPeriod = await this.createPayPeriod(periodData);
      periods.push(newPeriod);

      // Move to next period
      currentDate = new Date(periodEndDate);
      currentDate.setDate(currentDate.getDate() + 1);
      periodNumber++;
    }

    return periods;
  }

  // Custom field label operations
  async getCustomFieldLabels(): Promise<CustomFieldLabel[]> {
    return await db.select().from(customFieldLabels).orderBy(customFieldLabels.category, customFieldLabels.displayOrder);
  }

  async getCustomFieldLabel(fieldName: string): Promise<CustomFieldLabel | undefined> {
    const [label] = await db.select().from(customFieldLabels).where(eq(customFieldLabels.fieldName, fieldName));
    return label;
  }

  async createCustomFieldLabel(label: InsertCustomFieldLabel): Promise<CustomFieldLabel> {
    const [newLabel] = await db.insert(customFieldLabels).values(label).returning();
    return newLabel;
  }

  async updateCustomFieldLabel(id: number, label: Partial<InsertCustomFieldLabel>): Promise<CustomFieldLabel> {
    const [updated] = await db.update(customFieldLabels).set({
      ...label,
      updatedAt: new Date(),
    }).where(eq(customFieldLabels.id, id)).returning();
    return updated;
  }

  async deleteCustomFieldLabel(id: number): Promise<void> {
    await db.delete(customFieldLabels).where(eq(customFieldLabels.id, id));
  }

  async initializeDefaultFieldLabels(): Promise<void> {
    // Check if labels already exist
    const existingLabels = await this.getCustomFieldLabels();
    if (existingLabels.length > 0) {
      return; // Already initialized
    }

    // Default field labels for employee form
    const defaultLabels: InsertCustomFieldLabel[] = [
      // General Information
      { fieldName: 'employeeId', displayLabel: 'Employee ID', category: 'general', displayOrder: 1, isRequired: true },
      { fieldName: 'firstName', displayLabel: 'First Name', category: 'general', displayOrder: 2, isRequired: true },
      { fieldName: 'lastName', displayLabel: 'Last Name', category: 'general', displayOrder: 3, isRequired: true },
      { fieldName: 'status', displayLabel: 'Status', category: 'general', displayOrder: 4, isRequired: true },
      
      // Contact Information
      { fieldName: 'email', displayLabel: 'Email Address', category: 'contact', displayOrder: 1, isRequired: true },
      { fieldName: 'phoneNumber', displayLabel: 'Phone Number', category: 'contact', displayOrder: 2, isRequired: false },
      { fieldName: 'address', displayLabel: 'Address', category: 'contact', displayOrder: 3, isRequired: false },
      
      // Employment Information
      { fieldName: 'department', displayLabel: 'Department', category: 'employment', displayOrder: 1, isRequired: true },
      { fieldName: 'position', displayLabel: 'Position', category: 'employment', displayOrder: 2, isRequired: true },
      { fieldName: 'employeeType', displayLabel: 'Employee Type', category: 'employment', displayOrder: 3, isRequired: true },
      { fieldName: 'hireDate', displayLabel: 'Hire Date', category: 'employment', displayOrder: 4, isRequired: true },
      { fieldName: 'salary', displayLabel: 'Salary', category: 'employment', displayOrder: 5, isRequired: true },
      { fieldName: 'payGrade', displayLabel: 'Pay Grade', category: 'employment', displayOrder: 6, isRequired: false },
      { fieldName: 'supervisorId', displayLabel: 'Supervisor ID', category: 'employment', displayOrder: 7, isRequired: false },
      
      // Certification Information
      { fieldName: 'educationLevel', displayLabel: 'Education Level', category: 'certification', displayOrder: 1, isRequired: false },
      { fieldName: 'certifications', displayLabel: 'Certifications', category: 'certification', displayOrder: 2, isRequired: false },
    ];

    // Insert all default labels
    for (const label of defaultLabels) {
      await this.createCustomFieldLabel(label);
    }
  }
}

export const storage = new DatabaseStorage();
