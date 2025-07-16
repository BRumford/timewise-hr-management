import { 
  pgTable, 
  text, 
  varchar, 
  serial, 
  integer, 
  boolean, 
  timestamp, 
  decimal, 
  jsonb,
  index,
  date
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - required for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("employee"), // hr, admin, employee
  passwordHash: varchar("password_hash"), // For password authentication
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Employee information table
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  employeeId: varchar("employee_id").notNull().unique(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull().unique(),
  phoneNumber: varchar("phone_number"),
  address: text("address"),
  department: varchar("department").notNull(),
  position: varchar("position").notNull(),
  employeeType: varchar("employee_type").notNull(), // teacher, administrator, support_staff, substitute
  hireDate: timestamp("hire_date").notNull(),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  payGrade: varchar("pay_grade"),
  educationLevel: varchar("education_level"),
  certifications: text("certifications").array(),
  status: varchar("status").notNull().default("active"), // active, inactive, on_leave, terminated
  supervisorId: integer("supervisor_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leave types table
export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  maxDaysPerYear: integer("max_days_per_year"),
  isPaid: boolean("is_paid").default(true),
  requiresApproval: boolean("requires_approval").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Leave requests table
export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  leaveTypeId: integer("leave_type_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected, cancelled
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  substituteRequired: boolean("substitute_required").default(false),
  substituteAssigned: integer("substitute_assigned"),
  
  // Workers Compensation specific fields
  isWorkersComp: boolean("is_workers_comp").default(false),
  injuryDate: timestamp("injury_date"),
  injuryDescription: text("injury_description"),
  incidentLocation: varchar("incident_location"),
  witnessName: varchar("witness_name"),
  witnessContact: varchar("witness_contact"),
  claimNumber: varchar("claim_number"),
  insuranceProvider: varchar("insurance_provider"),
  doctorName: varchar("doctor_name"),
  doctorContact: varchar("doctor_contact"),
  expectedReturnDate: timestamp("expected_return_date"),
  workRestrictions: text("work_restrictions"),
  
  // Medical Leave specific fields
  isMedicalLeave: boolean("is_medical_leave").default(false),
  isFmla: boolean("is_fmla").default(false), // Family Medical Leave Act
  medicalProvider: varchar("medical_provider"),
  medicalProviderContact: varchar("medical_provider_contact"),
  diagnosisCode: varchar("diagnosis_code"),
  medicalCertificationDate: timestamp("medical_certification_date"),
  medicalCertificationExpiry: timestamp("medical_certification_expiry"),
  intermittentLeave: boolean("intermittent_leave").default(false),
  reducedSchedule: boolean("reduced_schedule").default(false),
  accommodationsNeeded: text("accommodations_needed"),
  
  // General supporting documentation
  supportingDocuments: text("supporting_documents").array().default([]),
  medicalDocuments: text("medical_documents").array().default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Substitute assignments table
export const substituteAssignments = pgTable("substitute_assignments", {
  id: serial("id").primaryKey(),
  leaveRequestId: integer("leave_request_id").notNull(),
  substituteEmployeeId: integer("substitute_employee_id").notNull(),
  assignedDate: timestamp("assigned_date").notNull(),
  status: varchar("status").notNull().default("assigned"), // assigned, confirmed, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payroll records table (simplified version that matches actual database)
export const payrollRecords = pgTable("payroll_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  payPeriodStart: timestamp("pay_period_start").notNull(),
  payPeriodEnd: timestamp("pay_period_end").notNull(),
  grossPay: decimal("gross_pay", { precision: 10, scale: 2 }).notNull(),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0"),
  netPay: decimal("net_pay", { precision: 10, scale: 2 }).notNull(),
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0"),
  payrollDetails: jsonb("payroll_details"), // store detailed breakdown of taxes and benefits
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tax withholding configurations
export const taxWithholdingConfigs = pgTable("tax_withholding_configs", {
  id: serial("id").primaryKey(),
  taxType: varchar("tax_type").notNull(), // federal, state, social_security, medicare, etc.
  employeeType: varchar("employee_type").notNull(), // certificated, classified, substitute, all
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).notNull(), // e.g., 0.0765 for 7.65%
  maxTaxableIncome: decimal("max_taxable_income", { precision: 12, scale: 2 }), // Annual limit
  minTaxableIncome: decimal("min_taxable_income", { precision: 12, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee benefit elections
export const employeeBenefitElections = pgTable("employee_benefit_elections", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  benefitType: varchar("benefit_type").notNull(), // health, dental, vision, retirement, etc.
  planName: varchar("plan_name").notNull(),
  coverageType: varchar("coverage_type"), // individual, family, spouse, etc.
  employeeContribution: decimal("employee_contribution", { precision: 10, scale: 2 }).notNull(),
  employerContribution: decimal("employer_contribution", { precision: 10, scale: 2 }).default("0"),
  deductionFrequency: varchar("deduction_frequency").notNull().default("bi-weekly"), // weekly, bi-weekly, monthly
  isActive: boolean("is_active").default(true),
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee tax withholding settings (W-4 information)
export const employeeTaxWithholdings = pgTable("employee_tax_withholdings", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  filingStatus: varchar("filing_status").notNull(), // single, married_filing_jointly, married_filing_separately, head_of_household
  allowances: integer("allowances").default(0), // Federal allowances
  additionalWithholding: decimal("additional_withholding", { precision: 10, scale: 2 }).default("0"),
  exemptFromFederal: boolean("exempt_from_federal").default(false),
  exemptFromState: boolean("exempt_from_state").default(false),
  exemptFromSocialSecurity: boolean("exempt_from_social_security").default(false),
  exemptFromMedicare: boolean("exempt_from_medicare").default(false),
  stateAllowances: integer("state_allowances").default(0),
  stateAdditionalWithholding: decimal("state_additional_withholding", { precision: 10, scale: 2 }).default("0"),
  effectiveDate: timestamp("effective_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payroll batches for processing multiple employees
export const payrollBatches = pgTable("payroll_batches", {
  id: serial("id").primaryKey(),
  batchNumber: varchar("batch_number").notNull().unique(),
  payPeriodStart: timestamp("pay_period_start").notNull(),
  payPeriodEnd: timestamp("pay_period_end").notNull(),
  payDate: timestamp("pay_date").notNull(),
  employeeType: varchar("employee_type").notNull(), // certificated, classified, substitute, all
  totalEmployees: integer("total_employees").default(0),
  totalGrossPay: decimal("total_gross_pay", { precision: 12, scale: 2 }).default("0"),
  totalNetPay: decimal("total_net_pay", { precision: 12, scale: 2 }).default("0"),
  totalTaxes: decimal("total_taxes", { precision: 12, scale: 2 }).default("0"),
  totalBenefits: decimal("total_benefits", { precision: 12, scale: 2 }).default("0"),
  status: varchar("status").notNull().default("draft"), // draft, processing, completed, cancelled
  processedBy: varchar("processed_by"),
  processedAt: timestamp("processed_at"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document management table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  documentType: varchar("document_type").notNull(), // background_check, certification, contract, etc.
  fileName: varchar("file_name").notNull(),
  fileUrl: varchar("file_url").notNull(),
  fileSize: integer("file_size"),
  status: varchar("status").notNull().default("pending"), // pending, processed, approved, rejected
  aiProcessingResults: jsonb("ai_processing_results"),
  expirationDate: timestamp("expiration_date"),
  uploadedBy: varchar("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Onboarding workflows table
export const onboardingWorkflows = pgTable("onboarding_workflows", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  status: varchar("status").notNull().default("started"), // started, in_progress, completed, stalled
  currentStep: varchar("current_step").notNull(),
  completedSteps: text("completed_steps").array().default([]),
  requiredDocuments: text("required_documents").array().default([]),
  submittedDocuments: text("submitted_documents").array().default([]),
  assignedTo: varchar("assigned_to"), // HR person handling onboarding
  startDate: timestamp("start_date").defaultNow(),
  targetCompletionDate: timestamp("target_completion_date"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Time cards table
export const timeCards = pgTable("time_cards", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  payPeriodId: integer("pay_period_id").references(() => payPeriods.id),
  templateId: integer("template_id").references(() => timecardTemplates.id),
  date: timestamp("date").notNull(),
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
  breakStart: timestamp("break_start"),
  breakEnd: timestamp("break_end"),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0"),
  leaveRequestId: integer("leave_request_id"), // Reference to approved leave request
  leaveType: varchar("leave_type"), // Type of leave (sick, vacation, personal, etc.)
  isPaidLeave: boolean("is_paid_leave").default(false), // Whether this is paid leave
  customFieldsData: jsonb("custom_fields_data").default({}), // Store custom field values
  status: varchar("status").notNull().default("draft"), // draft, secretary_submitted, employee_approved, admin_approved, payroll_processed, rejected
  currentApprovalStage: varchar("current_approval_stage").default("secretary"), // secretary, employee, administrator, payroll
  notes: text("notes"),
  secretaryNotes: text("secretary_notes"),
  employeeNotes: text("employee_notes"),
  adminNotes: text("admin_notes"),
  payrollNotes: text("payroll_notes"),
  submittedBy: integer("submitted_by"), // Secretary who submitted
  approvedByEmployee: integer("approved_by_employee"),
  approvedByAdmin: integer("approved_by_admin"),
  processedByPayroll: integer("processed_by_payroll"),
  submittedAt: timestamp("submitted_at"),
  employeeApprovedAt: timestamp("employee_approved_at"),
  adminApprovedAt: timestamp("admin_approved_at"),
  payrollProcessedAt: timestamp("payroll_processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Substitute time cards table
export const substituteTimeCards = pgTable("substitute_time_cards", {
  id: serial("id").primaryKey(),
  substituteId: integer("substitute_id").notNull(),
  payPeriodId: integer("pay_period_id").references(() => payPeriods.id),
  assignmentId: integer("assignment_id"), // Reference to substitute assignment
  date: timestamp("date").notNull(),
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
  breakStart: timestamp("break_start"),
  breakEnd: timestamp("break_end"),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0"),
  dailyRate: decimal("daily_rate", { precision: 8, scale: 2 }), // Daily substitute rate
  totalPay: decimal("total_pay", { precision: 8, scale: 2 }), // Calculated total pay
  status: varchar("status").notNull().default("draft"), // draft, secretary_submitted, admin_approved, payroll_processed, rejected
  currentApprovalStage: varchar("current_approval_stage").default("secretary"), // secretary, administrator, payroll
  notes: text("notes"),
  secretaryNotes: text("secretary_notes"),
  adminNotes: text("admin_notes"),
  payrollNotes: text("payroll_notes"),
  submittedBy: integer("submitted_by"), // Secretary who submitted
  approvedByAdmin: integer("approved_by_admin"),
  processedByPayroll: integer("processed_by_payroll"),
  submittedAt: timestamp("submitted_at"),
  adminApprovedAt: timestamp("admin_approved_at"),
  payrollProcessedAt: timestamp("payroll_processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Onboarding forms table for custom district forms
export const onboardingForms = pgTable("onboarding_forms", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  formType: varchar("form_type").notNull(), // hr_form, tax_form, benefits_form, emergency_contact, etc.
  category: varchar("category").notNull(), // new_hire, annual_update, position_change, etc.
  templateContent: text("template_content"), // HTML/text template with placeholders
  fileUrl: varchar("file_url"), // URL to uploaded form file
  fileName: varchar("file_name"), // Original file name
  fileSize: integer("file_size"), // File size in bytes
  mimeType: varchar("mime_type"), // File MIME type
  version: varchar("version").default("1.0"), // Version number for form updates
  parentFormId: integer("parent_form_id"), // Reference to original form for versioning
  isTemplate: boolean("is_template").default(true), // Whether this is a reusable template
  isRequired: boolean("is_required").default(false), // Whether form is required for onboarding
  isActive: boolean("is_active").default(true), // Whether form is currently active
  applicableEmployeeTypes: text("applicable_employee_types").array().default([]), // teacher, administrator, etc.
  department: varchar("department"), // If form is department-specific
  instructions: text("instructions"), // Instructions for completing the form
  dueDate: integer("due_date"), // Days after start date when form is due
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Onboarding form submissions table
export const onboardingFormSubmissions = pgTable("onboarding_form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => onboardingForms.id).notNull(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  workflowId: integer("workflow_id").references(() => onboardingWorkflows.id).notNull(),
  status: varchar("status").notNull().default("pending"), // pending, submitted, approved, rejected
  submissionData: jsonb("submission_data"), // Form field data
  fileUrls: text("file_urls").array().default([]), // URLs to uploaded files
  submittedAt: timestamp("submitted_at"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity logs table
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type").notNull(), // employee, leave_request, payroll, etc.
  entityId: integer("entity_id"),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Extra Pay Activities - Contracts
export const extraPayContracts = pgTable("extra_pay_contracts", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: varchar("status").notNull().default("active"), // active, inactive, expired
  contractType: varchar("contract_type").notNull(), // coaching, tutoring, after_school, etc.
  department: varchar("department"),
  requirements: text("requirements"),
  documentUrl: varchar("document_url"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Extra Pay Activities - Requests to Pay
export const extraPayRequests = pgTable("extra_pay_requests", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").references(() => extraPayContracts.id),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  requestedBy: varchar("requested_by").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }),
  dateWorked: date("date_worked").notNull(),
  description: text("description").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected, paid
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectedBy: varchar("rejected_by"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  supportingDocuments: text("supporting_documents").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Letters table for automated document generation
export const letters = pgTable("letters", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  templateContent: text("template_content").notNull(), // Original template with placeholders
  processedContent: text("processed_content"), // Content with employee data filled in
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  letterType: varchar("letter_type").notNull(), // offer, recommendation, disciplinary, etc.
  status: varchar("status").notNull().default("draft"), // draft, processed, sent, archived
  placeholders: jsonb("placeholders"), // Metadata about what placeholders were used
  createdBy: varchar("created_by").notNull(),
  processedAt: timestamp("processed_at"),
  sentAt: timestamp("sent_at"),
  documentUrl: varchar("document_url"), // URL to the generated document
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// District configuration settings
export const districtSettings = pgTable("district_settings", {
  id: serial("id").primaryKey(),
  districtName: varchar("district_name", { length: 200 }).notNull(),
  districtCode: varchar("district_code", { length: 50 }).notNull().unique(),
  // Payroll settings
  payrollFrequency: varchar("payroll_frequency", { length: 20 }).notNull().default("bi-weekly"), // weekly, bi-weekly, monthly, semi-monthly
  payrollCutoffDay: integer("payroll_cutoff_day").notNull().default(25), // Day of month for cutoff
  payrollPayDay: integer("payroll_pay_day").notNull().default(10), // Day of month for pay
  // Timecard settings
  timecardCutoffDay: integer("timecard_cutoff_day").notNull().default(25), // Day of month for timecard cutoff
  timecardSubmissionDeadline: integer("timecard_submission_deadline").notNull().default(2), // Days after cutoff for submission
  timecardApprovalDeadline: integer("timecard_approval_deadline").notNull().default(5), // Days after cutoff for approval
  // Calendar settings
  fiscalYearStart: date("fiscal_year_start").notNull().default("2024-07-01"),
  workingDays: jsonb("working_days").default(["monday", "tuesday", "wednesday", "thursday", "friday"]),
  holidays: jsonb("holidays").default([]), // Array of holiday dates
  // Approval settings
  requireManagerApproval: boolean("require_manager_approval").default(true),
  requirePayrollApproval: boolean("require_payroll_approval").default(true),
  autoApprovalThreshold: decimal("auto_approval_threshold", { precision: 8, scale: 2 }).default("0.00"), // Hours that auto-approve
  // Notification settings
  enableEmailNotifications: boolean("enable_email_notifications").default(true),
  enableSmsNotifications: boolean("enable_sms_notifications").default(false),
  reminderDaysBefore: integer("reminder_days_before").default(3), // Days before cutoff to send reminders
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Custom field labels table for employee forms
export const customFieldLabels = pgTable("custom_field_labels", {
  id: serial("id").primaryKey(),
  fieldName: varchar("field_name").notNull().unique(), // e.g., "firstName", "lastName", "department"
  displayLabel: varchar("display_label").notNull(), // e.g., "First Name", "Given Name", "Department"
  description: text("description"), // Optional description for the field
  isRequired: boolean("is_required").default(false), // Whether field is required
  isVisible: boolean("is_visible").default(true), // Whether field is visible in forms
  category: varchar("category").notNull().default("general"), // general, contact, employment, certification
  displayOrder: integer("display_order").default(0), // Order for displaying fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pay periods table
export const payPeriods = pgTable("pay_periods", {
  id: serial("id").primaryKey(),
  periodName: varchar("period_name", { length: 100 }).notNull(), // "January 2024 - 1st Half", "Pay Period 1"
  periodType: varchar("period_type", { length: 20 }).notNull(), // weekly, bi-weekly, monthly, semi-monthly
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  timecardCutoffDate: date("timecard_cutoff_date").notNull(),
  timecardSubmissionDeadline: date("timecard_submission_deadline").notNull(),
  timecardApprovalDeadline: date("timecard_approval_deadline").notNull(),
  payrollProcessingDate: date("payroll_processing_date").notNull(),
  payDate: date("pay_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("upcoming"), // upcoming, current, cutoff_passed, processed, paid
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Custom timecard templates
export const timecardTemplates = pgTable("timecard_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  employeeType: varchar("employee_type", { length: 50 }).notNull(), // certificated, classified, substitute
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  approvalWorkflow: jsonb("approval_workflow").default([]), // Array of approval stages
  settings: jsonb("settings").default({}), // Template-specific settings
  createdBy: varchar("created_by", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const timecardTemplateFields = pgTable("timecard_template_fields", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => timecardTemplates.id, { onDelete: "cascade" }),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  fieldLabel: varchar("field_label", { length: 200 }).notNull(),
  fieldType: varchar("field_type", { length: 50 }).notNull(), // text, number, date, time, dropdown, checkbox, textarea
  fieldOptions: jsonb("field_options").default({}), // For dropdown options, validation rules, etc.
  isRequired: boolean("is_required").default(false),
  isReadOnly: boolean("is_read_only").default(false),
  displayOrder: integer("display_order").default(0),
  section: varchar("section", { length: 100 }).default("general"), // general, time_tracking, breaks, approval, etc.
  validationRules: jsonb("validation_rules").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  employees: many(employees),
  activityLogs: many(activityLogs),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, { fields: [employees.userId], references: [users.id] }),
  supervisor: one(employees, { fields: [employees.supervisorId], references: [employees.id] }),
  subordinates: many(employees),
  leaveRequests: many(leaveRequests),
  payrollRecords: many(payrollRecords),
  documents: many(documents),
  timeCards: many(timeCards),
  onboardingWorkflow: one(onboardingWorkflows),
  substituteAssignments: many(substituteAssignments),
  extraPayRequests: many(extraPayRequests),
  letters: many(letters),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one, many }) => ({
  employee: one(employees, { fields: [leaveRequests.employeeId], references: [employees.id] }),
  leaveType: one(leaveTypes, { fields: [leaveRequests.leaveTypeId], references: [leaveTypes.id] }),
  approver: one(employees, { fields: [leaveRequests.approvedBy], references: [employees.id] }),
  substituteAssignments: many(substituteAssignments),
}));

export const substituteAssignmentsRelations = relations(substituteAssignments, ({ one }) => ({
  leaveRequest: one(leaveRequests, { fields: [substituteAssignments.leaveRequestId], references: [leaveRequests.id] }),
  substitute: one(employees, { fields: [substituteAssignments.substituteEmployeeId], references: [employees.id] }),
}));

export const payrollRecordsRelations = relations(payrollRecords, ({ one }) => ({
  employee: one(employees, { fields: [payrollRecords.employeeId], references: [employees.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  employee: one(employees, { fields: [documents.employeeId], references: [employees.id] }),
}));

export const onboardingWorkflowsRelations = relations(onboardingWorkflows, ({ one, many }) => ({
  employee: one(employees, { fields: [onboardingWorkflows.employeeId], references: [employees.id] }),
  formSubmissions: many(onboardingFormSubmissions),
}));

export const onboardingFormsRelations = relations(onboardingForms, ({ many }) => ({
  submissions: many(onboardingFormSubmissions),
}));

export const onboardingFormSubmissionsRelations = relations(onboardingFormSubmissions, ({ one }) => ({
  form: one(onboardingForms, { fields: [onboardingFormSubmissions.formId], references: [onboardingForms.id] }),
  employee: one(employees, { fields: [onboardingFormSubmissions.employeeId], references: [employees.id] }),
  workflow: one(onboardingWorkflows, { fields: [onboardingFormSubmissions.workflowId], references: [onboardingWorkflows.id] }),
}));

export const timeCardsRelations = relations(timeCards, ({ one }) => ({
  employee: one(employees, { fields: [timeCards.employeeId], references: [employees.id] }),
  payPeriod: one(payPeriods, { fields: [timeCards.payPeriodId], references: [payPeriods.id] }),
  template: one(timecardTemplates, { fields: [timeCards.templateId], references: [timecardTemplates.id] }),
  submitter: one(employees, { fields: [timeCards.submittedBy], references: [employees.id] }),
  employeeApprover: one(employees, { fields: [timeCards.approvedByEmployee], references: [employees.id] }),
  adminApprover: one(employees, { fields: [timeCards.approvedByAdmin], references: [employees.id] }),
  payrollProcessor: one(employees, { fields: [timeCards.processedByPayroll], references: [employees.id] }),
}));

export const substituteTimeCardsRelations = relations(substituteTimeCards, ({ one }) => ({
  substitute: one(employees, { fields: [substituteTimeCards.substituteId], references: [employees.id] }),
  payPeriod: one(payPeriods, { fields: [substituteTimeCards.payPeriodId], references: [payPeriods.id] }),
  assignment: one(substituteAssignments, { fields: [substituteTimeCards.assignmentId], references: [substituteAssignments.id] }),
  submitter: one(employees, { fields: [substituteTimeCards.submittedBy], references: [employees.id] }),
  adminApprover: one(employees, { fields: [substituteTimeCards.approvedByAdmin], references: [employees.id] }),
  payrollProcessor: one(employees, { fields: [substituteTimeCards.processedByPayroll], references: [employees.id] }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}));

export const extraPayContractsRelations = relations(extraPayContracts, ({ many }) => ({
  payRequests: many(extraPayRequests),
}));

export const extraPayRequestsRelations = relations(extraPayRequests, ({ one }) => ({
  contract: one(extraPayContracts, { fields: [extraPayRequests.contractId], references: [extraPayContracts.id] }),
  employee: one(employees, { fields: [extraPayRequests.employeeId], references: [employees.id] }),
}));

export const lettersRelations = relations(letters, ({ one }) => ({
  employee: one(employees, { fields: [letters.employeeId], references: [employees.id] }),
}));

export const timecardTemplatesRelations = relations(timecardTemplates, ({ many }) => ({
  fields: many(timecardTemplateFields),
  timeCards: many(timeCards),
}));

export const timecardTemplateFieldsRelations = relations(timecardTemplateFields, ({ one }) => ({
  template: one(timecardTemplates, { fields: [timecardTemplateFields.templateId], references: [timecardTemplates.id] }),
}));

export const payPeriodsRelations = relations(payPeriods, ({ many }) => ({
  timeCards: many(timeCards),
  substituteTimeCards: many(substituteTimeCards),
}));

// Zod schemas
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  hireDate: z.coerce.date().optional(),
  certifications: z.array(z.string()).optional(),
});
export const insertLeaveRequestSchema = z.object({
  employeeId: z.number(),
  leaveTypeId: z.number(), 
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string(),
  substituteRequired: z.boolean().default(false),
  status: z.string().default("pending"),
  notes: z.string().optional(),
  approvedBy: z.number().optional(),
  approvedAt: z.date().optional(),
  
  // Workers Compensation fields
  isWorkersComp: z.boolean().default(false),
  injuryDate: z.coerce.date().optional(),
  injuryDescription: z.string().optional(),
  incidentLocation: z.string().optional(),
  witnessName: z.string().optional(),
  witnessContact: z.string().optional(),
  claimNumber: z.string().optional(),
  insuranceProvider: z.string().optional(),
  doctorName: z.string().optional(),
  doctorContact: z.string().optional(),
  expectedReturnDate: z.coerce.date().optional(),
  workRestrictions: z.string().optional(),
  
  // Medical Leave fields
  isMedicalLeave: z.boolean().default(false),
  isFmla: z.boolean().default(false),
  medicalProvider: z.string().optional(),
  medicalProviderContact: z.string().optional(),
  diagnosisCode: z.string().optional(),
  medicalCertificationDate: z.coerce.date().optional(),
  medicalCertificationExpiry: z.coerce.date().optional(),
  intermittentLeave: z.boolean().default(false),
  reducedSchedule: z.boolean().default(false),
  accommodationsNeeded: z.string().optional(),
  
  // Supporting documentation
  supportingDocuments: z.array(z.string()).default([]),
  medicalDocuments: z.array(z.string()).default([]),
});
export const insertPayrollRecordSchema = createInsertSchema(payrollRecords).omit({ id: true, createdAt: true });
export const insertTaxWithholdingConfigSchema = createInsertSchema(taxWithholdingConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmployeeBenefitElectionSchema = createInsertSchema(employeeBenefitElections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmployeeTaxWithholdingSchema = createInsertSchema(employeeTaxWithholdings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPayrollBatchSchema = createInsertSchema(payrollBatches).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOnboardingWorkflowSchema = createInsertSchema(onboardingWorkflows).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOnboardingFormSchema = createInsertSchema(onboardingForms).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOnboardingFormSubmissionSchema = createInsertSchema(onboardingFormSubmissions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTimeCardSchema = createInsertSchema(timeCards).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubstituteTimeCardSchema = createInsertSchema(substituteTimeCards).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export const insertExtraPayContractSchema = createInsertSchema(extraPayContracts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExtraPayRequestSchema = createInsertSchema(extraPayRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLetterSchema = createInsertSchema(letters).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTimecardTemplateSchema = createInsertSchema(timecardTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTimecardTemplateFieldSchema = createInsertSchema(timecardTemplateFields).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDistrictSettingsSchema = createInsertSchema(districtSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPayPeriodSchema = createInsertSchema(payPeriods).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomFieldLabelSchema = createInsertSchema(customFieldLabels).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type LeaveType = typeof leaveTypes.$inferSelect;
export type InsertPayrollRecord = z.infer<typeof insertPayrollRecordSchema>;
export type PayrollRecord = typeof payrollRecords.$inferSelect;
export type InsertTaxWithholdingConfig = z.infer<typeof insertTaxWithholdingConfigSchema>;
export type TaxWithholdingConfig = typeof taxWithholdingConfigs.$inferSelect;
export type InsertEmployeeBenefitElection = z.infer<typeof insertEmployeeBenefitElectionSchema>;
export type EmployeeBenefitElection = typeof employeeBenefitElections.$inferSelect;
export type InsertEmployeeTaxWithholding = z.infer<typeof insertEmployeeTaxWithholdingSchema>;
export type EmployeeTaxWithholding = typeof employeeTaxWithholdings.$inferSelect;
export type InsertPayrollBatch = z.infer<typeof insertPayrollBatchSchema>;
export type PayrollBatch = typeof payrollBatches.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertOnboardingWorkflow = z.infer<typeof insertOnboardingWorkflowSchema>;
export type OnboardingWorkflow = typeof onboardingWorkflows.$inferSelect;
export type InsertOnboardingForm = z.infer<typeof insertOnboardingFormSchema>;
export type OnboardingForm = typeof onboardingForms.$inferSelect;
export type InsertOnboardingFormSubmission = z.infer<typeof insertOnboardingFormSubmissionSchema>;
export type OnboardingFormSubmission = typeof onboardingFormSubmissions.$inferSelect;
export type SubstituteAssignment = typeof substituteAssignments.$inferSelect;
export type InsertTimeCard = z.infer<typeof insertTimeCardSchema>;
export type TimeCard = typeof timeCards.$inferSelect;
export type InsertSubstituteTimeCard = z.infer<typeof insertSubstituteTimeCardSchema>;
export type SubstituteTimeCard = typeof substituteTimeCards.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertExtraPayContract = z.infer<typeof insertExtraPayContractSchema>;
export type ExtraPayContract = typeof extraPayContracts.$inferSelect;
export type InsertExtraPayRequest = z.infer<typeof insertExtraPayRequestSchema>;
export type ExtraPayRequest = typeof extraPayRequests.$inferSelect;
export type InsertLetter = z.infer<typeof insertLetterSchema>;
export type Letter = typeof letters.$inferSelect;
export type InsertTimecardTemplate = z.infer<typeof insertTimecardTemplateSchema>;
export type TimecardTemplate = typeof timecardTemplates.$inferSelect;
export type InsertTimecardTemplateField = z.infer<typeof insertTimecardTemplateFieldSchema>;
export type TimecardTemplateField = typeof timecardTemplateFields.$inferSelect;
export type InsertDistrictSettings = z.infer<typeof insertDistrictSettingsSchema>;
export type DistrictSettings = typeof districtSettings.$inferSelect;
export type InsertPayPeriod = z.infer<typeof insertPayPeriodSchema>;
export type PayPeriod = typeof payPeriods.$inferSelect;
export type InsertCustomFieldLabel = z.infer<typeof insertCustomFieldLabelSchema>;
export type CustomFieldLabel = typeof customFieldLabels.$inferSelect;

// Password reset types
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Retirees table for benefit information
export const retirees = pgTable("retirees", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  retirementDate: date("retirement_date").notNull(),
  yearsOfService: integer("years_of_service"),
  
  // Benefit information
  pensionPlan: varchar("pension_plan"),
  pensionAmount: decimal("pension_amount", { precision: 10, scale: 2 }),
  healthInsurance: varchar("health_insurance"),
  healthInsurancePremium: decimal("health_insurance_premium", { precision: 10, scale: 2 }),
  dentalInsurance: varchar("dental_insurance"),
  visionInsurance: varchar("vision_insurance"),
  lifeInsurance: varchar("life_insurance"),
  lifeInsuranceAmount: decimal("life_insurance_amount", { precision: 10, scale: 2 }),
  
  // Contact and emergency information
  address: text("address"),
  emergencyContactName: varchar("emergency_contact_name"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  emergencyContactRelation: varchar("emergency_contact_relation"),
  
  // Medicare information
  medicarePartA: boolean("medicare_part_a").default(false),
  medicarePartB: boolean("medicare_part_b").default(false),
  medicarePartD: boolean("medicare_part_d").default(false),
  medicareNumber: varchar("medicare_number"),
  
  // Additional notes
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Archived employees table for personnel files
export const archivedEmployees = pgTable("archived_employees", {
  id: serial("id").primaryKey(),
  originalEmployeeId: varchar("original_employee_id").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  department: varchar("department"),
  position: varchar("position"),
  hireDate: date("hire_date"),
  terminationDate: date("termination_date"),
  terminationReason: varchar("termination_reason"),
  
  // Archive information
  archiveDate: timestamp("archive_date").defaultNow(),
  archivedBy: varchar("archived_by").notNull(),
  archiveReason: varchar("archive_reason"),
  
  // Personnel file tracking
  personnelFilesCount: integer("personnel_files_count").default(0),
  lastFileUpload: timestamp("last_file_upload"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Personnel files for archived employees
export const personnelFiles = pgTable("personnel_files", {
  id: serial("id").primaryKey(),
  archivedEmployeeId: integer("archived_employee_id").notNull().references(() => archivedEmployees.id),
  fileName: varchar("file_name").notNull(),
  originalFileName: varchar("original_file_name").notNull(),
  fileType: varchar("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: varchar("file_path").notNull(),
  
  // File categorization
  category: varchar("category").notNull(), // 'application', 'evaluation', 'disciplinary', 'training', 'medical', 'other'
  description: text("description"),
  
  // Document metadata
  documentDate: date("document_date"),
  scannedDate: timestamp("scanned_date").defaultNow(),
  uploadedBy: varchar("uploaded_by").notNull(),
  
  // Search and indexing
  searchableText: text("searchable_text"),
  tags: text("tags").array(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Add relations for new tables
export const retireesRelations = relations(retirees, ({ one }) => ({
  // No direct relations, but could link to original employee records if needed
}));

export const archivedEmployeesRelations = relations(archivedEmployees, ({ many }) => ({
  personnelFiles: many(personnelFiles),
}));

export const personnelFilesRelations = relations(personnelFiles, ({ one }) => ({
  archivedEmployee: one(archivedEmployees, {
    fields: [personnelFiles.archivedEmployeeId],
    references: [archivedEmployees.id],
  }),
}));

// Add insert schemas and types for new tables
export const insertRetireeSchema = z.object({
  employeeId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  retirementDate: z.coerce.date(),
  yearsOfService: z.coerce.number().optional(),
  pensionPlan: z.string().optional(),
  pensionAmount: z.union([z.string(), z.number()]).optional(),
  healthInsurance: z.string().optional(),
  healthInsurancePremium: z.union([z.string(), z.number()]).optional(),
  dentalInsurance: z.string().optional(),
  visionInsurance: z.string().optional(),
  lifeInsurance: z.string().optional(),
  lifeInsuranceAmount: z.union([z.string(), z.number()]).optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  medicarePartA: z.boolean().optional(),
  medicarePartB: z.boolean().optional(),
  medicarePartD: z.boolean().optional(),
  medicareNumber: z.string().optional(),
  notes: z.string().optional(),
});
export const insertArchivedEmployeeSchema = z.object({
  originalEmployeeId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  hireDate: z.coerce.date().optional(),
  terminationDate: z.coerce.date().optional(),
  terminationReason: z.string().optional(),
  archivedBy: z.string(),
  archiveReason: z.string().optional(),
  personnelFilesCount: z.coerce.number().optional(),
  lastFileUpload: z.coerce.date().optional(),
});
export const insertPersonnelFileSchema = createInsertSchema(personnelFiles).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertRetiree = z.infer<typeof insertRetireeSchema>;
export type Retiree = typeof retirees.$inferSelect;
export type InsertArchivedEmployee = z.infer<typeof insertArchivedEmployeeSchema>;
export type ArchivedEmployee = typeof archivedEmployees.$inferSelect;
export type InsertPersonnelFile = z.infer<typeof insertPersonnelFileSchema>;
export type PersonnelFile = typeof personnelFiles.$inferSelect;
