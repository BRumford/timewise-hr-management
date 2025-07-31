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
  extraPayCustomFields,
  districtSettings,
  payPeriods,
  auditLogs,
  securityEvents,
  securityAlerts,
  userSessions,
  secureFiles,
  dataEncryptionKeys,
  rolePermissions,
  employeeAccounts,
  benefitsDocuments,
  benefitsPlans,
  openEnrollmentCampaigns,
  openEnrollmentEmails,
  type User,
  type UpsertUser,
  type EmployeeAccount,
  type InsertEmployeeAccount,
  type RolePermission,
  type InsertRolePermission,
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
  type ExtraPayCustomField,
  type InsertExtraPayCustomField,
  type Letter,
  type InsertLetter,
  letters,
  type TimecardTemplate,
  type InsertTimecardTemplate,
  type TimecardTemplateField,
  type InsertTimecardTemplateField,
  timecardTemplates,
  timecardTemplateFields,
  monthlyTimecards,
  type DistrictSettings,
  type InsertDistrictSettings,
  type PayPeriod,
  type InsertPayPeriod,
  customFieldLabels,
  type CustomFieldLabel,
  type InsertCustomFieldLabel,
  passwordResetTokens,
  type AuditLog,
  type InsertAuditLog,
  signatureRequests,
  signatureTemplates,
  type SignatureRequest,
  type InsertSignatureRequest,
  type SignatureTemplate,
  type InsertSignatureTemplate,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  dropdownOptions,
  type DropdownOption,
  type InsertDropdownOption,
  type BenefitsDocument,
  type InsertBenefitsDocument,
  type BenefitsPlan,
  type InsertBenefitsPlan,
  type OpenEnrollmentCampaign,
  type InsertOpenEnrollmentCampaign,
  type OpenEnrollmentEmail,
  type InsertOpenEnrollmentEmail,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, or, count, sql, ne, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User operations (required for authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  incrementFailedLoginAttempts(userId: string): Promise<void>;
  resetFailedLoginAttempts(userId: string): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
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
  getEmployeesWithoutUserAccounts(): Promise<Employee[]>;
  updateEmployeeUserId(employeeId: number, userId: string): Promise<void>;
  
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
  getPayrollRecordsByPeriod(startDate: Date, endDate: Date): Promise<PayrollRecord[]>;
  
  // Payroll Reporting
  getPayrollSummaryReport(startDate: Date, endDate: Date): Promise<any>;
  getTaxLiabilityReport(startDate: Date, endDate: Date): Promise<any>;
  getEmployeePayrollReport(employeeId: number, startDate: Date, endDate: Date): Promise<any>;
  getPayrollComplianceReport(startDate: Date, endDate: Date): Promise<any>;
  getPayrollCostAnalysis(startDate: Date, endDate: Date): Promise<any>;
  
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
  getTimeCardsByLeaveRequest(leaveRequestId: number): Promise<TimeCard[]>;
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
  
  // Password reset functionality
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenAsUsed(tokenId: number): Promise<void>;
  cleanupExpiredTokens(): Promise<void>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;

  // E-Signature functionality
  getSignatureRequests(): Promise<SignatureRequest[]>;
  getSignatureRequest(id: number): Promise<SignatureRequest | undefined>;
  createSignatureRequest(request: InsertSignatureRequest): Promise<SignatureRequest>;
  updateSignatureRequest(id: number, request: Partial<InsertSignatureRequest>): Promise<SignatureRequest>;
  deleteSignatureRequest(id: number): Promise<void>;
  getSignatureRequestsByEmployee(employeeId: number): Promise<SignatureRequest[]>;
  getSignatureRequestsByDocument(documentType: string, documentId: number): Promise<SignatureRequest[]>;
  getPendingSignatureRequests(): Promise<SignatureRequest[]>;
  markSignatureRequestSigned(id: number, signatureData: string, signedBy: string, ipAddress?: string, userAgent?: string): Promise<SignatureRequest>;
  markSignatureRequestDeclined(id: number, notes?: string): Promise<SignatureRequest>;
  expireSignatureRequest(id: number): Promise<SignatureRequest>;
  sendSignatureRequestReminder(id: number): Promise<SignatureRequest>;

  // Signature Templates
  getSignatureTemplates(): Promise<SignatureTemplate[]>;
  getSignatureTemplate(id: number): Promise<SignatureTemplate | undefined>;
  createSignatureTemplate(template: InsertSignatureTemplate): Promise<SignatureTemplate>;
  updateSignatureTemplate(id: number, template: Partial<InsertSignatureTemplate>): Promise<SignatureTemplate>;
  deleteSignatureTemplate(id: number): Promise<void>;
  getSignatureTemplatesByDocumentType(documentType: string): Promise<SignatureTemplate[]>;
  getActiveSignatureTemplates(): Promise<SignatureTemplate[]>;
  
  // Benefits documents
  getBenefitsDocuments(): Promise<BenefitsDocument[]>;
  getBenefitsDocument(id: number): Promise<BenefitsDocument | undefined>;
  createBenefitsDocument(document: InsertBenefitsDocument): Promise<BenefitsDocument>;
  updateBenefitsDocument(id: number, document: Partial<InsertBenefitsDocument>): Promise<BenefitsDocument>;
  deleteBenefitsDocument(id: number): Promise<void>;
  getBenefitsDocumentsByClassification(classification: string): Promise<BenefitsDocument[]>;
  getBenefitsDocumentsByType(documentType: string): Promise<BenefitsDocument[]>;
  getBenefitsDocumentsByPlanYear(planYear: string): Promise<BenefitsDocument[]>;
  searchBenefitsDocuments(query: string): Promise<BenefitsDocument[]>;
  
  // Benefits plans
  getBenefitsPlans(): Promise<BenefitsPlan[]>;
  getBenefitsPlan(id: number): Promise<BenefitsPlan | undefined>;
  createBenefitsPlan(plan: InsertBenefitsPlan): Promise<BenefitsPlan>;
  updateBenefitsPlan(id: number, plan: Partial<InsertBenefitsPlan>): Promise<BenefitsPlan>;
  deleteBenefitsPlan(id: number): Promise<void>;
  getBenefitsPlansByClassification(classification: string): Promise<BenefitsPlan[]>;
  getBenefitsPlansByType(planType: string): Promise<BenefitsPlan[]>;
  getBenefitsPlansByPlanYear(planYear: string): Promise<BenefitsPlan[]>;
  
  // Open Enrollment Campaigns
  getOpenEnrollmentCampaigns(): Promise<OpenEnrollmentCampaign[]>;
  createOpenEnrollmentCampaign(campaign: InsertOpenEnrollmentCampaign): Promise<OpenEnrollmentCampaign>;
  updateOpenEnrollmentCampaign(id: number, campaign: Partial<InsertOpenEnrollmentCampaign>): Promise<OpenEnrollmentCampaign>;
  deleteOpenEnrollmentCampaign(id: number): Promise<void>;
  
  // Open Enrollment Emails
  getOpenEnrollmentEmails(campaignId: number): Promise<OpenEnrollmentEmail[]>;
  createOpenEnrollmentEmail(email: InsertOpenEnrollmentEmail): Promise<OpenEnrollmentEmail>;
  updateOpenEnrollmentEmail(id: number, email: Partial<InsertOpenEnrollmentEmail>): Promise<OpenEnrollmentEmail>;
  getEmployeesForOpenEnrollment(classifications?: string[]): Promise<Employee[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async incrementFailedLoginAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async resetFailedLoginAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        failedLoginAttempts: 0,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updateLastLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
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
    // Clean and prepare employee data
    const cleanedEmployee = { ...employee };
    
    // Ensure hireDate is properly converted to Date if it's a string
    if (cleanedEmployee.hireDate && typeof cleanedEmployee.hireDate === 'string') {
      cleanedEmployee.hireDate = new Date(cleanedEmployee.hireDate);
    }
    
    // Add default districtId if missing
    if (!cleanedEmployee.districtId) {
      cleanedEmployee.districtId = 1; // Default district
    }
    
    // Remove undefined values completely and ensure proper typing
    const finalEmployeeData = Object.fromEntries(
      Object.entries(cleanedEmployee).filter(([_, value]) => value !== undefined)
    ) as InsertEmployee;
    
    const [newEmployee] = await db.insert(employees).values(finalEmployeeData).returning();
    
    // Automatically create a time card for the new employee
    const currentDate = new Date();
    
    try {
      const timeCardInsertData = {
        employeeId: newEmployee.id,
        date: currentDate,
        totalHours: "0",
        status: 'draft' as const,
        notes: 'Automatically created for new employee'
      };
      await db.insert(timeCards).values(timeCardInsertData);
      
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
    // Clean employee data and add districtId if missing
    const cleanedEmployee = { ...employee };
    if (!cleanedEmployee.districtId) {
      cleanedEmployee.districtId = 1; // Default district
    }
    
    const [updatedEmployee] = await db
      .update(employees)
      .set({ ...cleanedEmployee, updatedAt: new Date() })
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
          const cleanedData = { ...employeeData };
          
          // Ensure hireDate is properly converted to Date if it's a string
          if (cleanedData.hireDate && typeof cleanedData.hireDate === 'string') {
            cleanedData.hireDate = new Date(cleanedData.hireDate);
          }
          
          // Remove undefined values completely and ensure proper typing
          const finalData = Object.fromEntries(
            Object.entries(cleanedData).filter(([_, value]) => value !== undefined)
          ) as InsertEmployee;
          
          const [created] = await db.insert(employees).values(finalData).returning();
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

  async getEmployeesWithoutUserAccounts(): Promise<Employee[]> {
    const result = await db.select().from(employees).where(
      or(
        eq(employees.userId, ''),
        sql`${employees.userId} IS NULL`
      )
    );
    return result.filter(emp => emp.email); // Only return employees with email addresses
  }

  async updateEmployeeUserId(employeeId: number, userId: string): Promise<void> {
    await db.update(employees).set({ 
      userId,
      updatedAt: new Date()
    }).where(eq(employees.id, employeeId));
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

  async getPayrollRecordsByPeriod(startDate: Date, endDate: Date): Promise<PayrollRecord[]> {
    return await db.select().from(payrollRecords).where(
      and(
        gte(payrollRecords.payPeriodStart, startDate),
        lte(payrollRecords.payPeriodEnd, endDate)
      )
    );
  }



  async getPayrollSummaryReport(startDate: Date, endDate: Date): Promise<any> {
    const records = await db.select()
      .from(payrollRecords)
      .where(
        and(
          gte(payrollRecords.payPeriodStart, startDate),
          lte(payrollRecords.payPeriodEnd, endDate)
        )
      );

    if (records.length === 0) {
      return {
        period: { startDate, endDate },
        summary: {
          totalEmployees: 0,
          totalRecords: 0,
          totalGrossPay: 0,
          totalNetPay: 0,
          totalTaxes: 0,
          totalDeductions: 0
        },
        detailedRecords: []
      };
    }

    const employeeIds = Array.from(new Set(records.map(r => r.employeeId)));
    const totalGrossPay = records.reduce((sum, record) => sum + parseFloat(record.grossPay || '0'), 0);
    const totalNetPay = records.reduce((sum, record) => sum + parseFloat(record.netPay || '0'), 0);
    const totalDeductions = records.reduce((sum, record) => sum + parseFloat(record.deductions || '0'), 0);
    
    // Calculate taxes from payroll_details JSON
    const totalTaxes = records.reduce((sum, record) => {
      const details = record.payrollDetails as any;
      if (details) {
        const federal = parseFloat(details.federalTax || '0');
        const state = parseFloat(details.stateTax || '0');
        const social = parseFloat(details.socialSecurityTax || '0');
        const medicare = parseFloat(details.medicareTax || '0');
        const unemployment = parseFloat(details.unemploymentTax || '0');
        const disability = parseFloat(details.stateDisabilityTax || '0');
        return sum + federal + state + social + medicare + unemployment + disability;
      }
      return sum;
    }, 0);

    return {
      period: { startDate, endDate },
      summary: {
        totalEmployees: employeeIds.length,
        totalRecords: records.length,
        totalGrossPay,
        totalNetPay,
        totalTaxes,
        totalDeductions
      },
      detailedRecords: records
    };
  }

  async getTaxLiabilityReport(startDate: Date, endDate: Date): Promise<any> {
    const records = await db.select()
      .from(payrollRecords)
      .where(
        and(
          gte(payrollRecords.payPeriodStart, startDate),
          lte(payrollRecords.payPeriodEnd, endDate)
        )
      );

    if (records.length === 0) {
      return {
        period: { startDate, endDate },
        federalTax: 0,
        stateTax: 0,
        socialSecurityTax: 0,
        medicareTax: 0,
        unemploymentTax: 0,
        disabilityTax: 0,
        totalTaxLiability: 0
      };
    }

    // Calculate taxes from payroll_details JSON
    const federalTax = records.reduce((sum, r) => {
      const details = r.payrollDetails as any;
      return sum + parseFloat(details?.federalTax || '0');
    }, 0);
    
    const stateTax = records.reduce((sum, r) => {
      const details = r.payrollDetails as any;
      return sum + parseFloat(details?.stateTax || '0');
    }, 0);
    
    const socialSecurityTax = records.reduce((sum, r) => {
      const details = r.payrollDetails as any;
      return sum + parseFloat(details?.socialSecurityTax || '0');
    }, 0);
    
    const medicareTax = records.reduce((sum, r) => {
      const details = r.payrollDetails as any;
      return sum + parseFloat(details?.medicareTax || '0');
    }, 0);
    
    const unemploymentTax = records.reduce((sum, r) => {
      const details = r.payrollDetails as any;
      return sum + parseFloat(details?.unemploymentTax || '0');
    }, 0);
    
    const disabilityTax = records.reduce((sum, r) => {
      const details = r.payrollDetails as any;
      return sum + parseFloat(details?.stateDisabilityTax || '0');
    }, 0);
    
    return {
      period: { startDate, endDate },
      federalTax,
      stateTax,
      socialSecurityTax,
      medicareTax,
      unemploymentTax,
      disabilityTax,
      totalTaxLiability: federalTax + stateTax + socialSecurityTax + medicareTax + unemploymentTax + disabilityTax
    };
  }

  // Removed duplicate getBenefitsReport function

  async getEmployeePayrollReport(employeeId: number, startDate: Date, endDate: Date): Promise<any> {
    const employee = await this.getEmployee(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    const records = await db.select().from(payrollRecords).where(
      and(
        eq(payrollRecords.employeeId, employeeId),
        gte(payrollRecords.payPeriodStart, startDate),
        lte(payrollRecords.payPeriodEnd, endDate)
      )
    );
    
    const totals = records.reduce((acc, record) => {
      acc.grossPay += parseFloat(record.grossPay || '0');
      acc.netPay += parseFloat(record.netPay || '0');
      acc.totalDeductions += parseFloat(record.deductions || '0');
      // Extract tax details from payrollDetails JSON
      const details = record.payrollDetails as any;
      const taxes = parseFloat(details?.federalTax || '0') + parseFloat(details?.stateTax || '0') + parseFloat(details?.socialSecurityTax || '0') + parseFloat(details?.medicareTax || '0') + parseFloat(details?.unemploymentTax || '0');
      acc.totalTaxes += taxes;
      acc.regularHours += parseFloat(record.hoursWorked || '0') - parseFloat(record.overtimeHours || '0');
      acc.overtimeHours += parseFloat(record.overtimeHours || '0');
      return acc;
    }, {
      grossPay: 0,
      netPay: 0,
      totalDeductions: 0,
      totalTaxes: 0,
      regularHours: 0,
      overtimeHours: 0
    });
    
    return {
      employee,
      period: { startDate, endDate },
      records,
      totals,
      recordCount: records.length
    };
  }

  async getPayrollComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    const records = await this.getPayrollRecordsByPeriod(startDate, endDate);
    const employeeIds = Array.from(new Set(records.map(r => r.employeeId)));
    
    const employeeData = await db.select().from(employees).where(
      inArray(employees.id, employeeIds)
    );
    
    const complianceIssues = [];
    
    // Check for overtime compliance
    const overtimeViolations = records.filter(record => 
      parseFloat(record.overtimeHours || '0') > 0 && 
      parseFloat(record.hoursWorked || '0') < 40 // Assuming 40 hours regular
    );
    
    if (overtimeViolations.length > 0) {
      complianceIssues.push({
        type: 'Overtime Calculation Issues',
        severity: 'Medium',
        count: overtimeViolations.length,
        description: 'Records with overtime pay but low regular pay'
      });
    }
    
    return {
      period: { startDate, endDate },
      complianceIssues,
      totalRecords: records.length,
      totalEmployees: employeeIds.length,
      complianceScore: complianceIssues.length === 0 ? 100 : Math.max(0, 100 - (complianceIssues.length * 10))
    };
  }

  async getPayrollCostAnalysis(startDate: Date, endDate: Date): Promise<any> {
    const records = await this.getPayrollRecordsByPeriod(startDate, endDate);
    const employeeIds = Array.from(new Set(records.map(r => r.employeeId)));
    
    const employeeData = await db.select().from(employees).where(
      inArray(employees.id, employeeIds)
    );
    const employeeMap = new Map(employeeData.map(emp => [emp.id, emp]));
    
    // Calculate cost analysis by department
    const departmentCosts = records.reduce((acc, record) => {
      const employee = employeeMap.get(record.employeeId);
      const dept = employee?.department || 'Unknown';
      
      if (!acc[dept]) {
        acc[dept] = {
          department: dept,
          employeeCount: 0,
          grossPay: 0,
          benefits: 0,
          taxes: 0,
          totalCost: 0
        };
      }
      
      const grossPay = parseFloat(record.grossPay || '0');
      const benefits = parseFloat(record.deductions || '0');
      // Extract tax details from payrollDetails JSON
      const details = record.payrollDetails as any;
      const taxes = parseFloat(details?.federalTax || '0') + parseFloat(details?.stateTax || '0') + parseFloat(details?.socialSecurityTax || '0') + parseFloat(details?.medicareTax || '0') + parseFloat(details?.unemploymentTax || '0');
      
      acc[dept].employeeCount++;
      acc[dept].grossPay += grossPay;
      acc[dept].benefits += benefits;
      acc[dept].taxes += taxes;
      acc[dept].totalCost += grossPay + benefits + taxes;
      
      return acc;
    }, {} as any);
    
    return {
      period: { startDate, endDate },
      departmentCosts: Object.values(departmentCosts),
      totalRecords: records.length,
      totalEmployees: employeeIds.length
    };
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

  // Payroll Reports - removed duplicate function

  // Removed duplicate getTaxLiabilityReport function

  async getBenefitsReport(startDate: Date, endDate: Date): Promise<any> {
    const records = await db.select()
      .from(payrollRecords)
      .where(
        and(
          gte(payrollRecords.payPeriodStart, startDate),
          lte(payrollRecords.payPeriodEnd, endDate)
        )
      );
    
    if (records.length === 0) {
      return {
        period: { startDate, endDate },
        totalEmployees: 0,
        totalBenefitDeductions: 0,
        benefitTypes: [],
        employeeBenefits: []
      };
    }

    const employeeIds = Array.from(new Set(records.map(r => r.employeeId)));
    const benefitElections = await db.select()
      .from(employeeBenefitElections)
      .where(inArray(employeeBenefitElections.employeeId, employeeIds));

    const employeeList = await db.select()
      .from(employees)
      .where(inArray(employees.id, employeeIds));

    const benefitsSummary = {
      period: { startDate, endDate },
      totalEmployees: employeeIds.length,
      totalBenefitDeductions: records.reduce((sum, r) => sum + parseFloat(r.deductions || '0'), 0),
      benefitTypes: this.groupBenefitsByType(benefitElections),
      employeeBenefits: this.getEmployeeBenefitsBreakdown(records, employeeList, benefitElections)
    };

    return benefitsSummary;
  }

  private groupBenefitsByType(elections: any[]) {
    const benefitTypes: { [key: string]: any } = {};
    
    elections.forEach(election => {
      if (!benefitTypes[election.benefitType]) {
        benefitTypes[election.benefitType] = {
          type: election.benefitType,
          enrolledEmployees: 0,
          totalContributions: 0
        };
      }
      
      benefitTypes[election.benefitType].enrolledEmployees++;
      benefitTypes[election.benefitType].totalContributions += parseFloat(election.employeeContribution || '0');
    });

    return Object.values(benefitTypes);
  }

  private getEmployeeBenefitsBreakdown(records: any[], employees: any[], elections: any[]) {
    const employeeMap = new Map(employees.map(e => [e.id, e]));
    const electionMap = new Map();
    
    elections.forEach(election => {
      if (!electionMap.has(election.employeeId)) {
        electionMap.set(election.employeeId, []);
      }
      electionMap.get(election.employeeId).push(election);
    });

    return records.map(record => {
      const employee = employeeMap.get(record.employeeId);
      const employeeElections = electionMap.get(record.employeeId) || [];
      
      return {
        employeeId: record.employeeId,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
        department: employee?.department || 'Unknown',
        grossPay: parseFloat(record.grossPay || '0'),
        totalDeductions: parseFloat(record.totalDeductions || '0'),
        benefits: employeeElections.map((election: any) => ({
          type: election.benefitType,
          contribution: parseFloat(election.employeeContribution || '0'),
          coverage: election.coverageType
        }))
      };
    });
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

  async getOnboardingWorkflowsByEmployee(employeeId: number): Promise<OnboardingWorkflow[]> {
    return await db.select().from(onboardingWorkflows).where(eq(onboardingWorkflows.employeeId, employeeId)).orderBy(desc(onboardingWorkflows.createdAt));
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

  async getOnboardingFormSubmissionsByEmployee(employeeId: number): Promise<OnboardingFormSubmission[]> {
    return await db.select().from(onboardingFormSubmissions).where(eq(onboardingFormSubmissions.employeeId, employeeId)).orderBy(desc(onboardingFormSubmissions.createdAt));
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

  async getTimeCardsByLeaveRequest(leaveRequestId: number): Promise<TimeCard[]> {
    return await db
      .select()
      .from(timeCards)
      .where(eq(timeCards.leaveRequestId, leaveRequestId))
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

  async getSubstituteTimecardByParams(substituteId: number, templateId: number, workDate: string): Promise<SubstituteTimeCard | undefined> {
    const [timeCard] = await db.select().from(substituteTimeCards).where(
      and(
        eq(substituteTimeCards.substituteId, substituteId),
        eq(substituteTimeCards.templateId, templateId),
        eq(substituteTimeCards.workDate, workDate)
      )
    );
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
      isLocked: true,
      lockedBy: 'System',
      lockedAt: new Date(),
      lockReason: 'Automatically locked when submitted for approval'
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

  async lockSubstituteTimeCard(id: number, lockedBy: string, lockReason?: string): Promise<SubstituteTimeCard> {
    const [timecard] = await db.update(substituteTimeCards)
      .set({
        isLocked: true,
        lockedBy,
        lockedAt: new Date(),
        lockReason,
        updatedAt: new Date()
      })
      .where(eq(substituteTimeCards.id, id))
      .returning();
    return timecard;
  }

  async unlockSubstituteTimeCard(id: number): Promise<SubstituteTimeCard> {
    const [timecard] = await db.update(substituteTimeCards)
      .set({
        isLocked: false,
        lockedBy: null,
        lockedAt: null,
        lockReason: null,
        updatedAt: new Date()
      })
      .where(eq(substituteTimeCards.id, id))
      .returning();
    return timecard;
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

  // Extra Pay Custom Fields operations
  async getExtraPayCustomFields(): Promise<ExtraPayCustomField[]> {
    return await db.select().from(extraPayCustomFields).orderBy(extraPayCustomFields.section, extraPayCustomFields.displayOrder);
  }

  async getExtraPayCustomFieldsBySection(section: string): Promise<ExtraPayCustomField[]> {
    return await db.select().from(extraPayCustomFields)
      .where(and(eq(extraPayCustomFields.section, section), eq(extraPayCustomFields.isVisible, true)))
      .orderBy(extraPayCustomFields.displayOrder);
  }

  async createExtraPayCustomField(field: InsertExtraPayCustomField): Promise<ExtraPayCustomField> {
    const [newField] = await db.insert(extraPayCustomFields).values(field).returning();
    return newField;
  }

  async updateExtraPayCustomField(id: number, field: Partial<InsertExtraPayCustomField>): Promise<ExtraPayCustomField> {
    const [updated] = await db.update(extraPayCustomFields).set({
      ...field,
      updatedAt: new Date(),
    }).where(eq(extraPayCustomFields.id, id)).returning();
    return updated;
  }

  async deleteExtraPayCustomField(id: number): Promise<void> {
    await db.delete(extraPayCustomFields).where(eq(extraPayCustomFields.id, id));
  }

  async initializeDefaultExtraPayCustomFields(): Promise<void> {
    // Check if fields already exist
    const existingFields = await this.getExtraPayCustomFields();
    if (existingFields.length > 0) {
      return; // Already initialized
    }

    // Default custom fields for extra pay system
    const defaultCustomFields: InsertExtraPayCustomField[] = [
      // Contract fields
      {
        fieldName: 'specialEquipment',
        displayLabel: 'Special Equipment Required',
        fieldType: 'text',
        section: 'contract',
        category: 'contracts',
        isRequired: false,
        displayOrder: 1,
        helpText: 'List any special equipment needed for this position'
      },
      {
        fieldName: 'minimumQualifications',
        displayLabel: 'Minimum Qualifications',
        fieldType: 'textarea',
        section: 'contract',
        category: 'contracts',
        isRequired: false,
        displayOrder: 2,
        helpText: 'Specify minimum qualifications or certifications required'
      },
      {
        fieldName: 'contractLocation',
        displayLabel: 'Primary Work Location',
        fieldType: 'select',
        section: 'contract',
        category: 'contracts',
        isRequired: false,
        displayOrder: 3,
        fieldOptions: JSON.stringify({
          options: ['Main Office', 'Elementary School', 'Middle School', 'High School', 'Multiple Locations']
        })
      },
      
      // Request fields
      {
        fieldName: 'overtimeRate',
        displayLabel: 'Overtime Rate Applied',
        fieldType: 'number',
        section: 'request',
        category: 'requests',
        isRequired: false,
        displayOrder: 1,
        validationRules: JSON.stringify({ min: 0, step: 0.01 }),
        helpText: 'Enter overtime rate if applicable'
      },
      {
        fieldName: 'additionalDuties',
        displayLabel: 'Additional Duties Performed',
        fieldType: 'textarea',
        section: 'request',
        category: 'requests',
        isRequired: false,
        displayOrder: 2,
        helpText: 'Describe any additional duties beyond the standard contract'
      },
      {
        fieldName: 'workingConditions',
        displayLabel: 'Special Working Conditions',
        fieldType: 'select',
        section: 'request',
        category: 'requests',
        isRequired: false,
        displayOrder: 3,
        fieldOptions: JSON.stringify({
          options: ['Normal', 'Evening/Night', 'Weekend', 'Holiday', 'Emergency']
        })
      },
      
      // Approval fields
      {
        fieldName: 'budgetAccount',
        displayLabel: 'Budget Account Code',
        fieldType: 'text',
        section: 'approval',
        category: 'requests',
        isRequired: false,
        displayOrder: 1,
        helpText: 'Enter the budget account code for this expense'
      },
      {
        fieldName: 'approvalPriority',
        displayLabel: 'Approval Priority',
        fieldType: 'select',
        section: 'approval',
        category: 'requests',
        isRequired: false,
        displayOrder: 2,
        fieldOptions: JSON.stringify({
          options: ['Low', 'Normal', 'High', 'Urgent']
        })
      }
    ];

    // Insert all default custom fields
    for (const field of defaultCustomFields) {
      await this.createExtraPayCustomField(field);
    }
  }

  // Password reset functionality
  async createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db.insert(passwordResetTokens).values(tokenData).returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db.select().from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false),
        gte(passwordResetTokens.expiresAt, new Date())
      ));
    return resetToken;
  }

  async markTokenAsUsed(tokenId: number): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async cleanupExpiredTokens(): Promise<void> {
    await db.delete(passwordResetTokens)
      .where(or(
        eq(passwordResetTokens.used, true),
        lte(passwordResetTokens.expiresAt, new Date())
      ));
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db.update(users)
      .set({ 
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  // Security-related methods
  async createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(auditLog).returning();
    return log;
  }

  async getAuditLogs(filters: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    action?: string;
    resource?: string;
  }): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);
    
    const conditions = [];
    if (filters.startDate) {
      conditions.push(gte(auditLogs.timestamp, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(auditLogs.timestamp, filters.endDate));
    }
    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters.resource) {
      conditions.push(eq(auditLogs.resource, filters.resource));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(auditLogs.timestamp));
  }

  async createSecurityEvent(securityEvent: InsertSecurityEvent): Promise<SecurityEvent> {
    const [event] = await db.insert(securityEvents).values(securityEvent).returning();
    return event;
  }

  async createSecurityAlert(securityAlert: InsertSecurityAlert): Promise<SecurityAlert> {
    const [alert] = await db.insert(securityAlerts).values(securityAlert).returning();
    return alert;
  }

  async createSession(session: InsertUserSession): Promise<UserSession> {
    const [newSession] = await db.insert(userSessions).values(session).returning();
    return newSession;
  }

  async getSession(sessionId: string): Promise<UserSession | undefined> {
    const [session] = await db.select().from(userSessions)
      .where(and(
        eq(userSessions.sessionId, sessionId),
        eq(userSessions.active, true),
        gte(userSessions.expiresAt, new Date())
      ));
    return session;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await db.update(userSessions)
      .set({ active: false })
      .where(eq(userSessions.sessionId, sessionId));
  }

  async logSecurityEvent(event: {
    userId: string;
    action: string;
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
  }): Promise<void> {
    await db.insert(securityEvents).values({
      userId: event.userId,
      action: event.action,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      timestamp: event.timestamp,
      riskLevel: 'MEDIUM'
    });
  }

  async isMFARequired(userId: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.mfaEnabled || false;
  }

  async verifyMFAToken(userId: string, token: string): Promise<boolean> {
    // This would integrate with an MFA provider like Google Authenticator
    // For now, return true for demo purposes
    return true;
  }

  async createSecureFile(secureFile: InsertSecureFile): Promise<SecureFile> {
    const [file] = await db.insert(secureFiles).values(secureFile).returning();
    return file;
  }

  async getSecureFile(fileId: number): Promise<SecureFile | undefined> {
    const [file] = await db.select().from(secureFiles).where(eq(secureFiles.id, fileId));
    return file;
  }

  async updateFileAccessCount(fileId: number): Promise<void> {
    await db.update(secureFiles)
      .set({ 
        accessCount: sql`${secureFiles.accessCount} + 1`,
        lastAccessed: new Date()
      })
      .where(eq(secureFiles.id, fileId));
  }

  // Monthly timecard methods
  async getMonthlyTimecard(employeeId: number, month: number, year: number): Promise<any> {
    const [timecard] = await db.select().from(monthlyTimecards).where(
      and(
        eq(monthlyTimecards.employeeId, employeeId),
        eq(monthlyTimecards.month, month),
        eq(monthlyTimecards.year, year)
      )
    );
    
    return timecard || null;
  }

  async getMonthlyTimecardsByEmployee(employeeId: number): Promise<any[]> {
    const timecards = await db.select().from(monthlyTimecards)
      .where(eq(monthlyTimecards.employeeId, employeeId))
      .orderBy(desc(monthlyTimecards.year), desc(monthlyTimecards.month));
    
    return timecards;
  }

  async getMonthlyTimecardsBySite(site: string): Promise<any[]> {
    const timecards = await db.select({
      id: monthlyTimecards.id,
      employeeId: monthlyTimecards.employeeId,
      templateId: monthlyTimecards.templateId,
      month: monthlyTimecards.month,
      year: monthlyTimecards.year,
      payPeriodStart: monthlyTimecards.payPeriodStart,
      payPeriodEnd: monthlyTimecards.payPeriodEnd,
      status: monthlyTimecards.status,
      entries: monthlyTimecards.entries,
      customFieldsData: monthlyTimecards.customFieldsData,
      notes: monthlyTimecards.notes,
      submittedBy: monthlyTimecards.submittedBy,
      submittedAt: monthlyTimecards.submittedAt,
      isLocked: monthlyTimecards.isLocked,
      lockedBy: monthlyTimecards.lockedBy,
      lockedAt: monthlyTimecards.lockedAt,
      lockReason: monthlyTimecards.lockReason,
      createdAt: monthlyTimecards.createdAt,
      updatedAt: monthlyTimecards.updatedAt,
      employeeName: sql`${employees.firstName} || ' ' || ${employees.lastName}`,
      employeeFirstName: employees.firstName,
      employeeLastName: employees.lastName,
      employeeDepartment: employees.department,
      employeePosition: employees.position,
    })
    .from(monthlyTimecards)
    .innerJoin(employees, eq(monthlyTimecards.employeeId, employees.id))
    .where(eq(employees.department, site))
    .orderBy(desc(monthlyTimecards.year), desc(monthlyTimecards.month), employees.lastName, employees.firstName);
    
    return timecards;
  }

  async createMonthlyTimecard(data: any): Promise<any> {
    const [timecard] = await db.insert(monthlyTimecards).values({
      employeeId: data.employeeId,
      templateId: data.templateId,
      month: data.month,
      year: data.year,
      payPeriodStart: data.payPeriodStart,
      payPeriodEnd: data.payPeriodEnd,
      status: data.status || 'draft',
      entries: JSON.stringify(data.entries || []),
      customFieldsData: JSON.stringify(data.customFieldsData || {}),
      notes: data.notes || null
    }).returning();

    return timecard;
  }

  async updateMonthlyTimecard(id: number, data: any): Promise<any> {
    // Auto-lock timecard if status is being changed to submitted
    const shouldLock = data.status === 'submitted';
    
    // Update the timecard
    const [timecard] = await db.update(monthlyTimecards)
      .set({
        status: data.status,
        payPeriodStart: data.payPeriodStart,
        payPeriodEnd: data.payPeriodEnd,
        entries: JSON.stringify(data.entries || []),
        customFieldsData: JSON.stringify(data.customFieldsData || {}),
        notes: data.notes,
        ...(shouldLock && {
          isLocked: true,
          lockedBy: 'System',
          lockedAt: new Date(),
          lockReason: 'Automatically locked when submitted to payroll'
        }),
        updatedAt: new Date()
      })
      .where(eq(monthlyTimecards.id, id))
      .returning();

    return timecard;
  }

  async lockMonthlyTimecard(id: number, lockedBy: string, lockReason?: string): Promise<any> {
    const [timecard] = await db.update(monthlyTimecards)
      .set({
        isLocked: true,
        lockedBy,
        lockedAt: new Date(),
        lockReason,
        updatedAt: new Date()
      })
      .where(eq(monthlyTimecards.id, id))
      .returning();
    return timecard;
  }

  async unlockMonthlyTimecard(id: number): Promise<any> {
    const [timecard] = await db.update(monthlyTimecards)
      .set({
        isLocked: false,
        lockedBy: null,
        lockedAt: null,
        lockReason: null,
        updatedAt: new Date()
      })
      .where(eq(monthlyTimecards.id, id))
      .returning();
    return timecard;
  }

  async getAllMonthlyTimecards(): Promise<any[]> {
    const timecards = await db.select().from(monthlyTimecards)
      .orderBy(desc(monthlyTimecards.createdAt));
    return timecards;
  }

  async submitTimecardToEmployee(id: number, submittedBy: string): Promise<any> {
    const [timecard] = await db.update(monthlyTimecards)
      .set({
        status: 'submitted_to_employee',
        submittedBy,
        submittedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(monthlyTimecards.id, id))
      .returning();
    return timecard;
  }

  async employeeApproveTimecard(id: number, employeeApprovedBy: string, notes?: string): Promise<any> {
    const [timecard] = await db.update(monthlyTimecards)
      .set({
        status: 'employee_approved',
        employeeApprovedBy,
        employeeApprovedAt: new Date(),
        employeeApprovalNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(monthlyTimecards.id, id))
      .returning();
    return timecard;
  }

  async submitTimecardToAdmin(id: number, submittedBy: string): Promise<any> {
    const [timecard] = await db.update(monthlyTimecards)
      .set({
        status: 'submitted_to_admin',
        updatedAt: new Date()
      })
      .where(eq(monthlyTimecards.id, id))
      .returning();
    return timecard;
  }

  async batchSubmitTimecardsToAdmin(timecardIds: number[], submittedBy: string): Promise<any[]> {
    const results = [];
    for (const id of timecardIds) {
      const [timecard] = await db.update(monthlyTimecards)
        .set({
          status: 'submitted_to_admin',
          updatedAt: new Date()
        })
        .where(eq(monthlyTimecards.id, id))
        .returning();
      results.push(timecard);
    }
    return results;
  }

  async adminApproveTimecard(id: number, adminApprovedBy: string, notes?: string): Promise<any> {
    const [timecard] = await db.update(monthlyTimecards)
      .set({
        status: 'submitted_to_payroll',
        adminApprovedBy,
        adminApprovedAt: new Date(),
        adminApprovalNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(monthlyTimecards.id, id))
      .returning();
    return timecard;
  }

  async submitTimecardToPayroll(id: number, submittedBy: string): Promise<any> {
    const [timecard] = await db.update(monthlyTimecards)
      .set({
        status: 'submitted_to_payroll',
        updatedAt: new Date()
      })
      .where(eq(monthlyTimecards.id, id))
      .returning();
    return timecard;
  }

  async batchSubmitTimecardsToPayroll(timecardIds: number[], submittedBy: string): Promise<any[]> {
    const results = [];
    for (const id of timecardIds) {
      const [timecard] = await db.update(monthlyTimecards)
        .set({
          status: 'submitted_to_payroll',
          updatedAt: new Date()
        })
        .where(eq(monthlyTimecards.id, id))
        .returning();
      results.push(timecard);
    }
    return results;
  }

  async payrollProcessTimecard(id: number, payrollProcessedBy: string, notes?: string): Promise<any> {
    const [timecard] = await db.update(monthlyTimecards)
      .set({
        status: 'payroll_processed',
        payrollProcessedBy,
        payrollProcessedAt: new Date(),
        payrollNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(monthlyTimecards.id, id))
      .returning();
    return timecard;
  }

  async rejectMonthlyTimecard(id: number, rejectedBy: string, reason: string): Promise<any> {
    const [timecard] = await db.update(monthlyTimecards)
      .set({
        status: 'rejected',
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date()
      })
      .where(eq(monthlyTimecards.id, id))
      .returning();
    return timecard;
  }

  // Dropdown options methods
  async getDropdownOptions(category: string): Promise<DropdownOption[]> {
    return await db.select().from(dropdownOptions)
      .where(and(
        eq(dropdownOptions.category, category),
        eq(dropdownOptions.isActive, true)
      ))
      .orderBy(dropdownOptions.displayOrder);
  }

  async createDropdownOption(data: InsertDropdownOption): Promise<DropdownOption> {
    const [option] = await db.insert(dropdownOptions).values(data).returning();
    return option;
  }

  async updateDropdownOption(id: number, data: Partial<InsertDropdownOption>): Promise<DropdownOption> {
    const [option] = await db.update(dropdownOptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dropdownOptions.id, id))
      .returning();
    return option;
  }

  async deleteDropdownOption(id: number): Promise<void> {
    await db.delete(dropdownOptions).where(eq(dropdownOptions.id, id));
  }

  async getAllDropdownOptions(): Promise<DropdownOption[]> {
    return await db.select().from(dropdownOptions)
      .orderBy(dropdownOptions.category, dropdownOptions.displayOrder);
  }

  // Role permissions methods
  async getRolePermissions(role: string): Promise<RolePermission[]> {
    return await db.select().from(rolePermissions).where(eq(rolePermissions.role, role));
  }

  async updateRolePermission(role: string, pagePath: string, canAccess: boolean): Promise<RolePermission> {
    const [permission] = await db
      .insert(rolePermissions)
      .values({ role, pagePath, canAccess })
      .onConflictDoUpdate({
        target: [rolePermissions.role, rolePermissions.pagePath],
        set: { canAccess, updatedAt: new Date() }
      })
      .returning();
    return permission;
  }

  async getAllRolePermissions(): Promise<RolePermission[]> {
    return await db.select().from(rolePermissions);
  }

  async createRolePermission(data: InsertRolePermission): Promise<RolePermission> {
    const [permission] = await db.insert(rolePermissions).values(data).returning();
    return permission;
  }

  async deleteRolePermission(id: number): Promise<void> {
    await db.delete(rolePermissions).where(eq(rolePermissions.id, id));
  }

  // E-Signature functionality implementation
  async getSignatureRequests(): Promise<SignatureRequest[]> {
    return await db.select().from(signatureRequests).orderBy(desc(signatureRequests.createdAt));
  }

  async getSignatureRequest(id: number): Promise<SignatureRequest | undefined> {
    const [request] = await db.select().from(signatureRequests).where(eq(signatureRequests.id, id));
    return request;
  }

  async createSignatureRequest(request: InsertSignatureRequest): Promise<SignatureRequest> {
    const [newRequest] = await db.insert(signatureRequests).values(request).returning();
    return newRequest;
  }

  async updateSignatureRequest(id: number, request: Partial<InsertSignatureRequest>): Promise<SignatureRequest> {
    const [updatedRequest] = await db.update(signatureRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(signatureRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async deleteSignatureRequest(id: number): Promise<void> {
    await db.delete(signatureRequests).where(eq(signatureRequests.id, id));
  }

  async getSignatureRequestsByEmployee(employeeId: number): Promise<SignatureRequest[]> {
    return await db.select().from(signatureRequests)
      .where(eq(signatureRequests.employeeId, employeeId))
      .orderBy(desc(signatureRequests.createdAt));
  }

  async getSignatureRequestsByDocument(documentType: string, documentId: number): Promise<SignatureRequest[]> {
    return await db.select().from(signatureRequests)
      .where(and(
        eq(signatureRequests.documentType, documentType),
        eq(signatureRequests.documentId, documentId)
      ))
      .orderBy(desc(signatureRequests.createdAt));
  }

  async getPendingSignatureRequests(): Promise<SignatureRequest[]> {
    return await db.select().from(signatureRequests)
      .where(eq(signatureRequests.status, 'pending'))
      .orderBy(desc(signatureRequests.createdAt));
  }

  async markSignatureRequestSigned(id: number, signatureData: string, signedBy: string, ipAddress?: string, userAgent?: string): Promise<SignatureRequest> {
    const [signedRequest] = await db.update(signatureRequests)
      .set({
        status: 'signed',
        signatureData,
        signedBy,
        signedAt: new Date(),
        ipAddress,
        userAgent,
        updatedAt: new Date()
      })
      .where(eq(signatureRequests.id, id))
      .returning();
    return signedRequest;
  }

  async markSignatureRequestDeclined(id: number, notes?: string): Promise<SignatureRequest> {
    const [declinedRequest] = await db.update(signatureRequests)
      .set({
        status: 'declined',
        notes,
        updatedAt: new Date()
      })
      .where(eq(signatureRequests.id, id))
      .returning();
    return declinedRequest;
  }

  async expireSignatureRequest(id: number): Promise<SignatureRequest> {
    const [expiredRequest] = await db.update(signatureRequests)
      .set({
        status: 'expired',
        updatedAt: new Date()
      })
      .where(eq(signatureRequests.id, id))
      .returning();
    return expiredRequest;
  }

  async sendSignatureRequestReminder(id: number): Promise<SignatureRequest> {
    const [reminderRequest] = await db.update(signatureRequests)
      .set({
        reminderCount: sql`${signatureRequests.reminderCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(signatureRequests.id, id))
      .returning();
    return reminderRequest;
  }

  // Signature Templates implementation
  async getSignatureTemplates(): Promise<SignatureTemplate[]> {
    return await db.select().from(signatureTemplates).orderBy(desc(signatureTemplates.createdAt));
  }

  async getSignatureTemplate(id: number): Promise<SignatureTemplate | undefined> {
    const [template] = await db.select().from(signatureTemplates).where(eq(signatureTemplates.id, id));
    return template;
  }

  async createSignatureTemplate(template: InsertSignatureTemplate): Promise<SignatureTemplate> {
    const [newTemplate] = await db.insert(signatureTemplates).values(template).returning();
    return newTemplate;
  }

  async updateSignatureTemplate(id: number, template: Partial<InsertSignatureTemplate>): Promise<SignatureTemplate> {
    const [updatedTemplate] = await db.update(signatureTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(signatureTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteSignatureTemplate(id: number): Promise<void> {
    await db.delete(signatureTemplates).where(eq(signatureTemplates.id, id));
  }

  async getSignatureTemplatesByDocumentType(documentType: string): Promise<SignatureTemplate[]> {
    return await db.select().from(signatureTemplates)
      .where(eq(signatureTemplates.documentType, documentType))
      .orderBy(desc(signatureTemplates.createdAt));
  }

  async getActiveSignatureTemplates(): Promise<SignatureTemplate[]> {
    return await db.select().from(signatureTemplates)
      .where(eq(signatureTemplates.isActive, true))
      .orderBy(desc(signatureTemplates.createdAt));
  }

  // Employee Account Management methods
  async getEmployeeAccounts(): Promise<any[]> {
    return await db.select({
      id: employeeAccounts.id,
      employeeId: employeeAccounts.employeeId,
      userId: employeeAccounts.userId,
      hasAccess: employeeAccounts.hasAccess,
      loginEnabled: employeeAccounts.loginEnabled,
      accessGrantedBy: employeeAccounts.accessGrantedBy,
      accessGrantedAt: employeeAccounts.accessGrantedAt,
      accessRevokedBy: employeeAccounts.accessRevokedBy,
      accessRevokedAt: employeeAccounts.accessRevokedAt,
      temporaryAccessUntil: employeeAccounts.temporaryAccessUntil,
      notes: employeeAccounts.notes,
      createdAt: employeeAccounts.createdAt,
      updatedAt: employeeAccounts.updatedAt,
      // Join employee data
      firstName: employees.firstName,
      lastName: employees.lastName,
      email: employees.email,
      employeeIdNumber: employees.employeeId,
      department: employees.department,
      position: employees.position,
      status: employees.status,
      // Join user data
      userEmail: users.email,
      lastLoginAt: users.lastLoginAt,
      accountLocked: users.accountLocked,
    }).from(employeeAccounts)
      .leftJoin(employees, eq(employeeAccounts.employeeId, employees.id))
      .leftJoin(users, eq(employeeAccounts.userId, users.id))
      .orderBy(desc(employeeAccounts.createdAt));
  }

  async createEmployeeAccount(data: {
    employeeId: number;
    username: string;
    password: string;
    tempPassword: boolean;
    createdBy: string;
  }): Promise<any> {
    // First create the user account
    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    const [user] = await db.insert(users).values({
      id: data.username,
      email: data.username,
      role: 'employee',
      passwordHash: hashedPassword,
      passwordChangedAt: data.tempPassword ? null : new Date(),
    }).returning();

    // Then create the employee account record
    const [account] = await db.insert(employeeAccounts).values({
      employeeId: data.employeeId,
      userId: user.id,
      hasAccess: true,
      loginEnabled: true,
      accessGrantedBy: data.createdBy,
      accessGrantedAt: new Date(),
      notes: data.tempPassword ? 'Account created with temporary password - requires password change on first login' : 'Account created with permanent password',
    }).returning();

    return { account, user };
  }

  async grantEmployeeAccess(accountId: number, grantedBy: string, temporaryUntil?: string, notes?: string): Promise<EmployeeAccount> {
    const [account] = await db.update(employeeAccounts)
      .set({
        hasAccess: true,
        loginEnabled: true,
        accessGrantedBy: grantedBy,
        accessGrantedAt: new Date(),
        temporaryAccessUntil: temporaryUntil ? new Date(temporaryUntil) : null,
        notes: notes || 'Access granted by HR/Admin',
        updatedAt: new Date(),
      })
      .where(eq(employeeAccounts.id, accountId))
      .returning();
    return account;
  }

  async revokeEmployeeAccess(accountId: number, revokedBy: string, notes?: string): Promise<EmployeeAccount> {
    const [account] = await db.update(employeeAccounts)
      .set({
        hasAccess: false,
        loginEnabled: false,
        accessRevokedBy: revokedBy,
        accessRevokedAt: new Date(),
        notes: notes || 'Access revoked by HR/Admin',
        updatedAt: new Date(),
      })
      .where(eq(employeeAccounts.id, accountId))
      .returning();
    return account;
  }

  async resetEmployeePassword(accountId: number, newPassword: string, requirePasswordChange: boolean, resetBy: string): Promise<{ success: boolean; message: string }> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Get the employee account to find the user
    const [account] = await db.select().from(employeeAccounts).where(eq(employeeAccounts.id, accountId));
    if (!account) {
      throw new Error('Employee account not found');
    }

    // Update the password
    await db.update(users)
      .set({
        passwordHash: hashedPassword,
        passwordChangedAt: requirePasswordChange ? null : new Date(),
        failedLoginAttempts: 0,
        accountLocked: false,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, account.userId));

    // Update the account notes
    const noteMessage = requirePasswordChange 
      ? `Password reset by ${resetBy} - requires password change on next login`
      : `Password reset by ${resetBy}`;

    await db.update(employeeAccounts)
      .set({
        notes: noteMessage,
        updatedAt: new Date(),
      })
      .where(eq(employeeAccounts.id, accountId));

    return {
      success: true,
      message: 'Password reset successfully'
    };
  }

  async updateEmployeeAccount(accountId: number, data: {
    loginEnabled?: boolean;
    notes?: string;
    updatedBy: string;
  }): Promise<EmployeeAccount> {
    const [account] = await db.update(employeeAccounts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(employeeAccounts.id, accountId))
      .returning();
    return account;
  }

  // Benefits documents implementation
  async getBenefitsDocuments(): Promise<BenefitsDocument[]> {
    return await db.select().from(benefitsDocuments).orderBy(desc(benefitsDocuments.createdAt));
  }

  async getBenefitsDocument(id: number): Promise<BenefitsDocument | undefined> {
    const [document] = await db.select().from(benefitsDocuments).where(eq(benefitsDocuments.id, id));
    return document;
  }

  async createBenefitsDocument(document: InsertBenefitsDocument): Promise<BenefitsDocument> {
    const [created] = await db.insert(benefitsDocuments).values(document).returning();
    return created;
  }

  async updateBenefitsDocument(id: number, document: Partial<InsertBenefitsDocument>): Promise<BenefitsDocument> {
    const [updated] = await db.update(benefitsDocuments)
      .set({ ...document, updatedAt: new Date() })
      .where(eq(benefitsDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteBenefitsDocument(id: number): Promise<void> {
    await db.delete(benefitsDocuments).where(eq(benefitsDocuments.id, id));
  }

  async getBenefitsDocumentsByClassification(classification: string): Promise<BenefitsDocument[]> {
    return await db.select().from(benefitsDocuments)
      .where(eq(benefitsDocuments.classification, classification))
      .orderBy(desc(benefitsDocuments.createdAt));
  }

  async getBenefitsDocumentsByType(documentType: string): Promise<BenefitsDocument[]> {
    return await db.select().from(benefitsDocuments)
      .where(eq(benefitsDocuments.documentType, documentType))
      .orderBy(desc(benefitsDocuments.createdAt));
  }

  async getBenefitsDocumentsByPlanYear(planYear: string): Promise<BenefitsDocument[]> {
    return await db.select().from(benefitsDocuments)
      .where(eq(benefitsDocuments.planYear, planYear))
      .orderBy(desc(benefitsDocuments.createdAt));
  }

  async searchBenefitsDocuments(query: string): Promise<BenefitsDocument[]> {
    return await db.select().from(benefitsDocuments)
      .where(or(
        sql`${benefitsDocuments.title} ILIKE ${`%${query}%`}`,
        sql`${benefitsDocuments.description} ILIKE ${`%${query}%`}`,
        sql`${benefitsDocuments.category} ILIKE ${`%${query}%`}`
      ))
      .orderBy(desc(benefitsDocuments.createdAt));
  }

  // Benefits plans implementation
  async getBenefitsPlans(): Promise<BenefitsPlan[]> {
    return await db.select().from(benefitsPlans).orderBy(desc(benefitsPlans.createdAt));
  }

  async getBenefitsPlan(id: number): Promise<BenefitsPlan | undefined> {
    const [plan] = await db.select().from(benefitsPlans).where(eq(benefitsPlans.id, id));
    return plan;
  }

  async createBenefitsPlan(plan: InsertBenefitsPlan): Promise<BenefitsPlan> {
    const [created] = await db.insert(benefitsPlans).values(plan).returning();
    return created;
  }

  async updateBenefitsPlan(id: number, plan: Partial<InsertBenefitsPlan>): Promise<BenefitsPlan> {
    const [updated] = await db.update(benefitsPlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(benefitsPlans.id, id))
      .returning();
    return updated;
  }

  async deleteBenefitsPlan(id: number): Promise<void> {
    await db.delete(benefitsPlans).where(eq(benefitsPlans.id, id));
  }

  async getBenefitsPlansByClassification(classification: string): Promise<BenefitsPlan[]> {
    return await db.select().from(benefitsPlans)
      .where(eq(benefitsPlans.classification, classification))
      .orderBy(desc(benefitsPlans.createdAt));
  }

  async getBenefitsPlansByType(planType: string): Promise<BenefitsPlan[]> {
    return await db.select().from(benefitsPlans)
      .where(eq(benefitsPlans.planType, planType))
      .orderBy(desc(benefitsPlans.createdAt));
  }

  async getBenefitsPlansByPlanYear(planYear: string): Promise<BenefitsPlan[]> {
    return await db.select().from(benefitsPlans)
      .where(eq(benefitsPlans.planYear, planYear))
      .orderBy(desc(benefitsPlans.createdAt));
  }

  // Open Enrollment Campaign methods
  async getOpenEnrollmentCampaigns(): Promise<OpenEnrollmentCampaign[]> {
    return await db.select().from(openEnrollmentCampaigns).orderBy(desc(openEnrollmentCampaigns.createdAt));
  }

  async createOpenEnrollmentCampaign(campaign: InsertOpenEnrollmentCampaign): Promise<OpenEnrollmentCampaign> {
    const [newCampaign] = await db.insert(openEnrollmentCampaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateOpenEnrollmentCampaign(id: number, campaign: Partial<InsertOpenEnrollmentCampaign>): Promise<OpenEnrollmentCampaign> {
    const [updatedCampaign] = await db.update(openEnrollmentCampaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(eq(openEnrollmentCampaigns.id, id))
      .returning();
    return updatedCampaign;
  }

  async deleteOpenEnrollmentCampaign(id: number): Promise<void> {
    await db.delete(openEnrollmentCampaigns).where(eq(openEnrollmentCampaigns.id, id));
  }

  // Open Enrollment Email methods
  async getOpenEnrollmentEmails(campaignId: number): Promise<OpenEnrollmentEmail[]> {
    return await db.select().from(openEnrollmentEmails)
      .where(eq(openEnrollmentEmails.campaignId, campaignId))
      .orderBy(desc(openEnrollmentEmails.createdAt));
  }

  async createOpenEnrollmentEmail(email: InsertOpenEnrollmentEmail): Promise<OpenEnrollmentEmail> {
    const [newEmail] = await db.insert(openEnrollmentEmails).values(email).returning();
    return newEmail;
  }

  async updateOpenEnrollmentEmail(id: number, email: Partial<InsertOpenEnrollmentEmail>): Promise<OpenEnrollmentEmail> {
    const [updatedEmail] = await db.update(openEnrollmentEmails)
      .set(email)
      .where(eq(openEnrollmentEmails.id, id))
      .returning();
    return updatedEmail;
  }

  async getEmployeesForOpenEnrollment(classifications?: string[]): Promise<Employee[]> {
    let query = db.select().from(employees).where(eq(employees.isActive, true));
    
    if (classifications && classifications.length > 0) {
      query = query.where(inArray(employees.employeeType, classifications));
    }
    
    return query;
  }
}

export const storage = new DatabaseStorage();
