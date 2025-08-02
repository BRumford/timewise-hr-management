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
  date,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// District management table for multi-tenant support
export const districts = pgTable("districts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // URL-friendly identifier
  domain: varchar("domain", { length: 100 }), // Custom domain like district.timewise.com
  contactEmail: varchar("contact_email").notNull(),
  contactPhone: varchar("contact_phone"),
  address: text("address"),
  subscriptionTier: varchar("subscription_tier").notNull().default("basic"), // basic, professional, enterprise
  subscriptionStatus: varchar("subscription_status").notNull().default("trial"), // trial, active, suspended, cancelled
  billingEmail: varchar("billing_email"),
  maxEmployees: integer("max_employees").default(100),
  maxAdmins: integer("max_admins").default(5),
  customBranding: boolean("custom_branding").default(false),
  apiAccess: boolean("api_access").default(false),
  supportLevel: varchar("support_level").default("standard"), // basic, standard, premium
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionStartedAt: timestamp("subscription_started_at"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  settings: jsonb("settings"), // District-specific configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// District billing and usage tracking
export const districtBilling = pgTable("district_billing", {
  id: serial("id").primaryKey(),
  districtId: integer("district_id").notNull().references(() => districts.id),
  billingMonth: date("billing_month").notNull(), // YYYY-MM-01 format
  employeeCount: integer("employee_count").notNull(),
  adminCount: integer("admin_count").notNull(),
  storageUsedGB: decimal("storage_used_gb", { precision: 10, scale: 2 }).default("0"),
  apiCallsCount: integer("api_calls_count").default(0),
  emailsSent: integer("emails_sent").default(0),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  overageCharges: decimal("overage_charges", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: varchar("payment_status").default("pending"), // pending, paid, failed, refunded
  paymentDate: timestamp("payment_date"),
  invoiceUrl: varchar("invoice_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  districtId: integer("district_id").references(() => districts.id), // Multi-tenant support (null for system_owner)
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("employee"), // admin, hr, payroll, employee, secretary, system_owner
  passwordHash: varchar("password_hash"), // For password authentication
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: varchar("mfa_secret"),
  lastLoginAt: timestamp("last_login_at"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  accountLocked: boolean("account_locked").default(false),
  lockedUntil: timestamp("locked_until"),
  lastFailedLogin: timestamp("last_failed_login"),
  mfaBackupCodes: text("mfa_backup_codes"), // JSON string of backup codes
  passwordChangedAt: timestamp("password_changed_at"),
  passwordHistory: text("password_history"), // JSON string of previous password hashes
  isSystemOwner: boolean("is_system_owner").default(false), // System owner access
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Role permissions table for configurable access control
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 50 }).notNull(), // admin, hr, payroll, employee, secretary
  pagePath: varchar("page_path", { length: 100 }).notNull(), // /employees, /leave-management, etc.
  canAccess: boolean("can_access").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual employee account management
export const employeeAccounts = pgTable("employee_accounts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  hasAccess: boolean("has_access").default(false),
  accessGrantedBy: varchar("access_granted_by").references(() => users.id),
  accessGrantedAt: timestamp("access_granted_at"),
  accessRevokedBy: varchar("access_revoked_by").references(() => users.id),
  accessRevokedAt: timestamp("access_revoked_at"),
  temporaryAccessUntil: timestamp("temporary_access_until"),
  loginEnabled: boolean("login_enabled").default(false),
  notes: text("notes"),
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
  districtId: integer("district_id").notNull().references(() => districts.id), // Multi-tenant support
  userId: varchar("user_id").notNull(),
  employeeId: varchar("employee_id").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").unique(),
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
}, (table) => [
  uniqueIndex("unique_employee_id_per_district").on(table.districtId, table.employeeId)
]);

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
  // Payroll Processing Fields
  payrollAddon: varchar("payroll_addon"),
  payrollUnits: decimal("payroll_units", { precision: 8, scale: 2 }),
  payrollRate: decimal("payroll_rate", { precision: 8, scale: 2 }),
  payrollTotal: decimal("payroll_total", { precision: 10, scale: 2 }),
  payrollProcessingNotes: text("payroll_processing_notes"),
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
  substituteId: integer("substitute_id").references(() => employees.id).notNull(),
  templateId: integer("template_id").references(() => timecardTemplates.id).notNull(),
  workDate: date("work_date").notNull(),
  status: varchar("status").notNull().default("draft"), // draft, submitted, approved, rejected, processed
  customFieldsData: jsonb("custom_fields_data"), // Template field data
  notes: text("notes"),
  submittedBy: varchar("submitted_by"),
  submittedAt: timestamp("submitted_at"),
  isLocked: boolean("is_locked").default(false),
  lockedBy: varchar("locked_by"),
  lockedAt: timestamp("locked_at"),
  lockReason: text("lock_reason"),
  // Payroll processing fields
  payrollAddon: varchar("payroll_addon"),
  payrollUnits: decimal("payroll_units", { precision: 8, scale: 2 }),
  payrollRate: decimal("payroll_rate", { precision: 8, scale: 2 }),
  payrollTotal: decimal("payroll_total", { precision: 8, scale: 2 }),
  payrollProcessingNotes: text("payroll_processing_notes"),
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

// User sessions table for session management
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  deviceId: varchar("device_id"),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at").notNull(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Benefits documents table for uploading cost sheets and plan documentation
export const benefitsDocuments = pgTable("benefits_documents", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  documentType: varchar("document_type", { length: 100 }).notNull(), // cost_sheet, plan_documentation, enrollment_form, etc.
  classification: varchar("classification", { length: 50 }).notNull(), // certificated, management, classified
  planYear: varchar("plan_year", { length: 10 }).notNull(), // 2024-2025, 2025-2026, etc.
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileSize: integer("file_size"), // File size in bytes
  mimeType: varchar("mime_type", { length: 100 }),
  uploadedBy: varchar("uploaded_by").notNull(),
  isActive: boolean("is_active").default(true),
  effectiveDate: date("effective_date"),
  expirationDate: date("expiration_date"),
  category: varchar("category", { length: 100 }), // health, dental, vision, retirement, life_insurance, etc.
  tags: text("tags").array().default([]), // Searchable tags
  downloadCount: integer("downloadcount").default(0),
  lastDownloaded: timestamp("lastdownloaded"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Benefits plans table for detailed plan information
export const benefitsPlans = pgTable("benefits_plans", {
  id: serial("id").primaryKey(),
  planName: varchar("plan_name", { length: 255 }).notNull(),
  planType: varchar("plan_type", { length: 100 }).notNull(), // health, dental, vision, retirement, life_insurance
  classification: varchar("classification", { length: 50 }).notNull(), // certificated, management, classified
  planYear: varchar("plan_year", { length: 10 }).notNull(),
  provider: varchar("provider", { length: 255 }),
  monthlyCost: decimal("monthly_cost", { precision: 10, scale: 2 }),
  employeeContribution: decimal("employee_contribution", { precision: 10, scale: 2 }),
  employerContribution: decimal("employer_contribution", { precision: 10, scale: 2 }),
  deductible: decimal("deductible", { precision: 10, scale: 2 }),
  outOfPocketMax: decimal("out_of_pocket_max", { precision: 10, scale: 2 }),
  planDetails: text("plan_details"),
  coverageLevel: varchar("coverage_level", { length: 50 }), // individual, family, employee_spouse, etc.
  isActive: boolean("is_active").default(true),
  enrollmentPeriod: varchar("enrollment_period", { length: 100 }),
  eligibilityRequirements: text("eligibility_requirements"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Security events table for monitoring
export const securityEvents = pgTable("security_events", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type").notNull(),
  severity: varchar("severity").notNull(), // low, medium, high, critical
  description: text("description").notNull(),
  userId: varchar("user_id").references(() => users.id),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Security alerts table
export const securityAlerts = pgTable("security_alerts", {
  id: serial("id").primaryKey(),
  securityEventId: integer("security_event_id").references(() => securityEvents.id),
  alertType: varchar("alert_type").notNull(),
  severity: varchar("severity").notNull(),
  message: text("message").notNull(),
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Data encryption keys table
export const dataEncryptionKeys = pgTable("data_encryption_keys", {
  id: serial("id").primaryKey(),
  keyName: varchar("key_name").notNull().unique(),
  keyValue: text("key_value").notNull(),
  algorithm: varchar("algorithm").notNull(),
  keyLength: integer("key_length").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  rotatedAt: timestamp("rotated_at"),
});

// Secure files table for encrypted document storage
export const secureFiles = pgTable("secure_files", {
  id: serial("id").primaryKey(),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  encryptionKeyId: integer("encryption_key_id").references(() => dataEncryptionKeys.id),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  accessedBy: text("accessed_by").array().default([]), // Array of user IDs who accessed
  lastAccessedAt: timestamp("last_accessed_at"),
  isEncrypted: boolean("is_encrypted").default(true),
  complianceLevel: varchar("compliance_level").default("standard"), // standard, ferpa, hipaa, sox
  createdAt: timestamp("created_at").defaultNow(),
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
  customFieldsData: jsonb("custom_fields_data").default({}), // Store custom field values
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Extra Pay Custom Fields Configuration
export const extraPayCustomFields = pgTable("extra_pay_custom_fields", {
  id: serial("id").primaryKey(),
  fieldName: varchar("field_name").notNull(), // e.g., "specialEquipment", "overtimeRate"
  displayLabel: varchar("display_label").notNull(), // e.g., "Special Equipment Needed", "Overtime Rate"
  fieldType: varchar("field_type").notNull(), // text, number, date, select, checkbox, textarea
  fieldOptions: jsonb("field_options").default({}), // For select options, validation rules, etc.
  section: varchar("section").notNull(), // contract, request, approval
  category: varchar("category").notNull(), // contracts, requests
  isRequired: boolean("is_required").default(false),
  isVisible: boolean("is_visible").default(true),
  displayOrder: integer("display_order").default(0),
  validationRules: jsonb("validation_rules").default({}), // min/max values, patterns, etc.
  helpText: text("help_text"), // Help text for the field
  defaultValue: text("default_value"), // Default value for the field
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueFieldSection: uniqueIndex("unique_field_section").on(table.fieldName, table.section)
}));

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
  fieldName: varchar("field_name").notNull(), // e.g., "firstName", "lastName", "department"
  displayLabel: varchar("display_label").notNull(), // e.g., "First Name", "Given Name", "Department"
  description: text("description"), // Optional description for the field
  isRequired: boolean("is_required").default(false), // Whether field is required
  isVisible: boolean("is_visible").default(true), // Whether field is visible in forms
  category: varchar("category").notNull().default("general"), // general, contact, employment, certification
  displayOrder: integer("display_order").default(0), // Order for displaying fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Create a unique constraint on fieldName + category combination instead of just fieldName
  uniqueFieldCategory: uniqueIndex("unique_field_category").on(table.fieldName, table.category)
}));

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
// Monthly timecards table
export const monthlyTimecards = pgTable("monthly_timecards", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  templateId: integer("template_id").references(() => timecardTemplates.id).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  payPeriodStart: date("pay_period_start").notNull(),
  payPeriodEnd: date("pay_period_end").notNull(),
  status: varchar("status").notNull().default("draft"), // draft, submitted_to_employee, employee_approved, submitted_to_admin, admin_approved, submitted_to_payroll, payroll_processed, rejected
  entries: jsonb("entries").default([]), // Array of daily entries
  customFieldsData: jsonb("custom_fields_data").default({}), // Store custom field values
  notes: text("notes"),
  submittedBy: varchar("submitted_by"),
  submittedAt: timestamp("submitted_at"),
  employeeApprovedBy: varchar("employee_approved_by"),
  employeeApprovedAt: timestamp("employee_approved_at"),
  employeeApprovalNotes: text("employee_approval_notes"),
  adminApprovedBy: varchar("admin_approved_by"),
  adminApprovedAt: timestamp("admin_approved_at"),
  adminApprovalNotes: text("admin_approval_notes"),
  payrollProcessedBy: varchar("payroll_processed_by"),
  payrollProcessedAt: timestamp("payroll_processed_at"),
  payrollNotes: text("payroll_notes"),
  rejectedBy: varchar("rejected_by"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  isLocked: boolean("is_locked").default(false),
  lockedBy: varchar("locked_by"),
  lockedAt: timestamp("locked_at"),
  lockReason: text("lock_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

// Pay Date Configurations - for districts to set up specific pay dates and schedules
export const payDateConfigurations = pgTable("pay_date_configurations", {
  id: serial("id").primaryKey(),
  districtId: integer("district_id").references(() => districts.id).notNull(),
  configurationName: varchar("configuration_name", { length: 150 }).notNull(),
  payScheduleType: varchar("pay_schedule_type", { length: 30 }).notNull(), // monthly, bi-weekly, weekly, semi-monthly
  employeeTypes: jsonb("employee_types").default([]), // ['certificated', 'classified', 'substitute']
  payDates: jsonb("pay_dates").notNull(), // Array of specific pay dates for the year
  fiscalYearStart: date("fiscal_year_start").notNull(),
  fiscalYearEnd: date("fiscal_year_end").notNull(),
  timecardGenerationSettings: jsonb("timecard_generation_settings").default({}), // Auto-generation rules and timing
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  createdBy: varchar("created_by").notNull(),
  lastModifiedBy: varchar("last_modified_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Automated Timecard Generation Jobs - tracks automated generation of timecards
export const timecardGenerationJobs = pgTable("timecard_generation_jobs", {
  id: serial("id").primaryKey(),
  districtId: integer("district_id").references(() => districts.id).notNull(),
  payDateConfigurationId: integer("pay_date_configuration_id").references(() => payDateConfigurations.id).notNull(),
  jobType: varchar("job_type", { length: 30 }).notNull(), // monthly_timecards, substitute_timecards, pay_period_setup
  targetMonth: integer("target_month").notNull(),
  targetYear: integer("target_year").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending"), // pending, running, completed, failed, cancelled
  employeeCount: integer("employee_count").default(0),
  timecardsGenerated: integer("timecards_generated").default(0),
  errorCount: integer("error_count").default(0),
  processingLog: jsonb("processing_log").default([]), // Detailed processing information
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorDetails: text("error_details"),
  scheduledFor: timestamp("scheduled_for"), // When the job should run
  triggeredBy: varchar("triggered_by").notNull(), // User who triggered the generation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Timecard Generation Templates - defines how timecards should be auto-generated
export const timecardGenerationTemplates = pgTable("timecard_generation_templates", {
  id: serial("id").primaryKey(),
  districtId: integer("district_id").references(() => districts.id).notNull(),
  templateName: varchar("template_name", { length: 150 }).notNull(),
  employeeType: varchar("employee_type", { length: 50 }).notNull(), // certificated, classified, substitute
  timecardTemplateId: integer("timecard_template_id").references(() => timecardTemplates.id).notNull(),
  autoGenerationEnabled: boolean("auto_generation_enabled").default(true),
  generationRules: jsonb("generation_rules").default({}), // Rules for when and how to generate
  defaultFieldValues: jsonb("default_field_values").default({}), // Pre-fill values for generated timecards
  generateDaysInAdvance: integer("generate_days_in_advance").default(30), // How many days before pay period to generate
  notificationSettings: jsonb("notification_settings").default({}), // Email/alert settings
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").notNull(),
  lastModifiedBy: varchar("last_modified_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Custom workflows for districts - managed by system owner
export const districtWorkflows = pgTable("district_workflows", {
  id: serial("id").primaryKey(),
  districtId: integer("district_id").notNull().references(() => districts.id),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(), // onboarding, payroll, leave, timecard, compliance, etc.
  isActive: boolean("is_active").default(true),
  isTemplate: boolean("is_template").default(false), // Can be copied to other districts
  workflowSteps: jsonb("workflow_steps").notNull().default([]), // Array of workflow steps
  triggers: jsonb("triggers").default({}), // Automation triggers
  conditions: jsonb("conditions").default({}), // Conditional logic
  settings: jsonb("settings").default({}), // Workflow-specific settings
  assignedRoles: jsonb("assigned_roles").default([]), // Which roles can execute this workflow
  approvalRequired: boolean("approval_required").default(false),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  lastModifiedBy: varchar("last_modified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workflow execution history
export const workflowExecutions = pgTable("workflow_executions", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").notNull().references(() => districtWorkflows.id),
  districtId: integer("district_id").notNull().references(() => districts.id),
  executedBy: varchar("executed_by").notNull().references(() => users.id),
  triggerType: varchar("trigger_type").notNull(), // manual, automatic, scheduled
  status: varchar("status").notNull().default("running"), // running, completed, failed, cancelled
  inputData: jsonb("input_data").default({}),
  outputData: jsonb("output_data").default({}),
  errorDetails: text("error_details"),
  stepResults: jsonb("step_results").default([]), // Results from each step
  duration: integer("duration"), // Execution time in milliseconds
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// System owner access log
export const systemOwnerAccessLog = pgTable("system_owner_access_log", {
  id: serial("id").primaryKey(),
  systemOwnerId: varchar("system_owner_id").notNull().references(() => users.id),
  districtId: integer("district_id").references(() => districts.id),
  action: varchar("action").notNull(), // login, workflow_create, workflow_modify, etc.
  details: jsonb("details").default({}),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
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
  submitter: one(employees, { fields: [timeCards.submittedBy], references: [employees.id] }),
  employeeApprover: one(employees, { fields: [timeCards.approvedByEmployee], references: [employees.id] }),
  adminApprover: one(employees, { fields: [timeCards.approvedByAdmin], references: [employees.id] }),
  payrollProcessor: one(employees, { fields: [timeCards.processedByPayroll], references: [employees.id] }),
}));

export const substituteTimeCardsRelations = relations(substituteTimeCards, ({ one }) => ({
  substitute: one(employees, { fields: [substituteTimeCards.substituteId], references: [employees.id] }),
  template: one(timecardTemplates, { fields: [substituteTimeCards.templateId], references: [timecardTemplates.id] }),
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

// Export types for workflow management
export type DistrictWorkflow = typeof districtWorkflows.$inferSelect;
export type InsertDistrictWorkflow = typeof districtWorkflows.$inferInsert;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = typeof workflowExecutions.$inferInsert;
export type SystemOwnerAccessLog = typeof systemOwnerAccessLog.$inferSelect;
export type InsertSystemOwnerAccessLog = typeof systemOwnerAccessLog.$inferInsert;

// Zod schemas
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  hireDate: z.coerce.date().optional(),
  certifications: z.array(z.string()).optional(),
});

export const insertDistrictWorkflowSchema = createInsertSchema(districtWorkflows).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions).omit({ id: true, startedAt: true, completedAt: true });
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
export const insertTimeCardSchema = createInsertSchema(timeCards).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  date: z.coerce.date(),
  clockIn: z.coerce.date().optional(),
  clockOut: z.coerce.date().optional(),
  breakStart: z.coerce.date().optional(),
  breakEnd: z.coerce.date().optional(),
});
export const insertSubstituteTimeCardSchema = createInsertSchema(substituteTimeCards).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export const insertExtraPayContractSchema = createInsertSchema(extraPayContracts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExtraPayRequestSchema = createInsertSchema(extraPayRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExtraPayCustomFieldSchema = createInsertSchema(extraPayCustomFields).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLetterSchema = createInsertSchema(letters).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTimecardTemplateSchema = createInsertSchema(timecardTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTimecardTemplateFieldSchema = createInsertSchema(timecardTemplateFields).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDistrictSettingsSchema = createInsertSchema(districtSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPayPeriodSchema = createInsertSchema(payPeriods).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomFieldLabelSchema = createInsertSchema(customFieldLabels).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBenefitsDocumentSchema = createInsertSchema(benefitsDocuments).omit({ id: true, createdAt: true, updatedAt: true, downloadCount: true, lastDownloaded: true });
export const insertBenefitsPlanSchema = createInsertSchema(benefitsPlans).omit({ id: true, createdAt: true, updatedAt: true });

// Open Enrollment Campaigns
export const openEnrollmentCampaigns = pgTable("open_enrollment_campaigns", {
  id: serial("id").primaryKey(),
  campaignName: varchar("campaign_name", { length: 255 }).notNull(),
  planYear: varchar("plan_year", { length: 20 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: varchar("status", { length: 50 }).default("draft"), // draft, active, completed
  emailSubject: varchar("email_subject", { length: 500 }),
  emailTemplate: text("email_template"),
  senderEmail: varchar("sender_email", { length: 255 }),
  senderName: varchar("sender_name", { length: 255 }),
  totalEmployees: integer("total_employees"),
  emailsSent: integer("emails_sent").default(0),
  emailsFailed: integer("emails_failed").default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Open Enrollment Email Log
export const openEnrollmentEmails = pgTable("open_enrollment_emails", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => openEnrollmentCampaigns.id),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  classification: varchar("classification", { length: 50 }).notNull(),
  emailAddress: varchar("email_address", { length: 255 }).notNull(),
  documentIds: text("document_ids"), // JSON array of document IDs sent
  status: varchar("status", { length: 50 }).default("pending"), // pending, sent, failed, bounced
  sentAt: timestamp("sent_at"),
  failureReason: text("failure_reason"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOpenEnrollmentCampaignSchema = createInsertSchema(openEnrollmentCampaigns).omit({ id: true, createdAt: true, updatedAt: true, emailsSent: true, emailsFailed: true });
export const insertOpenEnrollmentEmailSchema = createInsertSchema(openEnrollmentEmails).omit({ id: true, createdAt: true });

export type OpenEnrollmentCampaign = typeof openEnrollmentCampaigns.$inferSelect;
export type InsertOpenEnrollmentCampaign = z.infer<typeof insertOpenEnrollmentCampaignSchema>;
export type OpenEnrollmentEmail = typeof openEnrollmentEmails.$inferSelect;
export type InsertOpenEnrollmentEmail = z.infer<typeof insertOpenEnrollmentEmailSchema>;

// District types
export const insertDistrictSchema = createInsertSchema(districts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDistrictBillingSchema = createInsertSchema(districtBilling).omit({ id: true, createdAt: true, updatedAt: true });

export type District = typeof districts.$inferSelect;
export type InsertDistrict = z.infer<typeof insertDistrictSchema>;
export type DistrictBilling = typeof districtBilling.$inferSelect;
export type InsertDistrictBilling = z.infer<typeof insertDistrictBillingSchema>;

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;
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
export type InsertExtraPayCustomField = z.infer<typeof insertExtraPayCustomFieldSchema>;
export type ExtraPayCustomField = typeof extraPayCustomFields.$inferSelect;
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
export type InsertBenefitsDocument = z.infer<typeof insertBenefitsDocumentSchema>;
export type BenefitsDocument = typeof benefitsDocuments.$inferSelect;
export type InsertBenefitsPlan = z.infer<typeof insertBenefitsPlanSchema>;
export type BenefitsPlan = typeof benefitsPlans.$inferSelect;

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

// Signature requests table for e-signature functionality
export const signatureRequests = pgTable("signature_requests", {
  id: serial("id").primaryKey(),
  documentType: varchar("document_type", { length: 50 }).notNull(), // 'onboarding_form', 'extra_pay_contract', 'letter', 'document'
  documentId: integer("document_id").notNull(), // references the specific document/form/contract
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  requesterId: varchar("requester_id", { length: 255 }).notNull(), // user who requested the signature
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'signed', 'declined', 'expired'
  signatureData: text("signature_data"), // base64 encoded signature image
  signedAt: timestamp("signed_at"),
  signedBy: varchar("signed_by", { length: 255 }), // employee who signed
  expiresAt: timestamp("expires_at"),
  emailSentAt: timestamp("email_sent_at"),
  reminderCount: integer("reminder_count").default(0),
  notes: text("notes"),
  ipAddress: varchar("ip_address", { length: 45 }), // for audit trail
  userAgent: text("user_agent"), // for audit trail
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Signature templates table for reusable signature requirements
export const signatureTemplates = pgTable("signature_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  description: text("description"),
  signatureFields: jsonb("signature_fields"), // positions and requirements for signatures
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
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

export type PayDateConfiguration = typeof payDateConfigurations.$inferSelect;
export type InsertPayDateConfiguration = typeof payDateConfigurations.$inferInsert;
export type TimecardGenerationJob = typeof timecardGenerationJobs.$inferSelect;
export type InsertTimecardGenerationJob = typeof timecardGenerationJobs.$inferInsert;
export type TimecardGenerationTemplate = typeof timecardGenerationTemplates.$inferSelect;
export type InsertTimecardGenerationTemplate = typeof timecardGenerationTemplates.$inferInsert;

// Update the existing audit logs table to match the new security requirements
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id"),
  description: text("description"),
  ipAddress: varchar("ip_address").notNull(),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
  severity: varchar("severity").notNull().default("medium"), // low, medium, high, critical
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas and types for updated audit logs
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Support Documentation Library
export const supportDocuments = pgTable("support_documents", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }).notNull(), // user_manual, admin_guide, troubleshooting, video_tutorial
  subcategory: varchar("subcategory", { length: 100 }),
  tags: text("tags").array(),
  isPublished: boolean("is_published").default(false),
  authorId: varchar("author_id").notNull(),
  viewCount: integer("view_count").default(0),
  lastViewedAt: timestamp("last_viewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  fileUrl: varchar("file_url", { length: 500 }), // For PDF files or video URLs
  videoUrl: varchar("video_url", { length: 500 }), // For video tutorials
  duration: integer("duration"), // For video tutorials in seconds
  difficulty: varchar("difficulty", { length: 20 }).default("beginner"), // beginner, intermediate, advanced
  searchKeywords: text("search_keywords").array(),
});

export const supportCategories = pgTable("support_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 20 }),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supportFeedback = pgTable("support_feedback", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => supportDocuments.id),
  userId: varchar("user_id").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  isHelpful: boolean("is_helpful"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supportBookmarks = pgTable("support_bookmarks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  documentId: integer("document_id").notNull().references(() => supportDocuments.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const supportDocumentsRelations = relations(supportDocuments, ({ many }) => ({
  feedback: many(supportFeedback),
  bookmarks: many(supportBookmarks),
}));

export const supportCategoriesRelations = relations(supportCategories, ({ many }) => ({
  documents: many(supportDocuments),
}));

export const supportFeedbackRelations = relations(supportFeedback, ({ one }) => ({
  document: one(supportDocuments, {
    fields: [supportFeedback.documentId],
    references: [supportDocuments.id],
  }),
}));

export const supportBookmarksRelations = relations(supportBookmarks, ({ one }) => ({
  document: one(supportDocuments, {
    fields: [supportBookmarks.documentId],
    references: [supportDocuments.id],
  }),
}));

// Insert schemas
export const insertSupportDocumentSchema = createInsertSchema(supportDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupportCategorySchema = createInsertSchema(supportCategories).omit({ id: true, createdAt: true });
export const insertSupportFeedbackSchema = createInsertSchema(supportFeedback).omit({ id: true, createdAt: true });
export const insertSupportBookmarkSchema = createInsertSchema(supportBookmarks).omit({ id: true, createdAt: true });

// Select types
export type SupportDocument = typeof supportDocuments.$inferSelect;
export type SupportCategory = typeof supportCategories.$inferSelect;
export type SupportFeedback = typeof supportFeedback.$inferSelect;
export type SupportBookmark = typeof supportBookmarks.$inferSelect;

export type InsertSupportDocument = z.infer<typeof insertSupportDocumentSchema>;
export type InsertSupportCategory = z.infer<typeof insertSupportCategorySchema>;
export type InsertSupportFeedback = z.infer<typeof insertSupportFeedbackSchema>;
export type InsertSupportBookmark = z.infer<typeof insertSupportBookmarkSchema>;

// Support Ticket Management System
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: varchar("ticket_number", { length: 50 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(), // technical, account, billing, feature_request, bug_report
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, urgent
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, in_progress, waiting_response, resolved, closed
  assignedTo: varchar("assigned_to"), // Support agent ID
  createdBy: varchar("created_by").notNull(),
  tags: text("tags").array(),
  affectedModule: varchar("affected_module", { length: 100 }), // employees, payroll, timecards, etc.
  browserInfo: text("browser_info"),
  errorMessage: text("error_message"),
  stepsToReproduce: text("steps_to_reproduce"),
  expectedBehavior: text("expected_behavior"),
  actualBehavior: text("actual_behavior"),
  workaround: text("workaround"),
  resolution: text("resolution"),
  resolutionTime: integer("resolution_time"), // in minutes
  satisfactionRating: integer("satisfaction_rating"), // 1-5 stars
  satisfactionComment: text("satisfaction_comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  lastResponseAt: timestamp("last_response_at"),
  responseDeadline: timestamp("response_deadline"),
});

export const supportTicketComments = pgTable("support_ticket_comments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(false), // Internal notes vs customer-facing
  attachments: text("attachments").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const supportTicketAttachments = pgTable("support_ticket_attachments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  fileType: varchar("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: varchar("file_path").notNull(),
  uploadedBy: varchar("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supportTicketHistory = pgTable("support_ticket_history", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id),
  userId: varchar("user_id").notNull(),
  action: varchar("action").notNull(), // created, updated, assigned, resolved, closed, reopened
  fieldChanged: varchar("field_changed"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supportAgents = pgTable("support_agents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  department: varchar("department").notNull(),
  specialties: text("specialties").array(), // Areas of expertise
  maxActiveTickets: integer("max_active_tickets").default(10),
  currentActiveTickets: integer("current_active_tickets").default(0),
  isActive: boolean("is_active").default(true),
  averageResponseTime: integer("average_response_time"), // in minutes
  satisfactionScore: decimal("satisfaction_score", { precision: 3, scale: 2 }),
  ticketsResolved: integer("tickets_resolved").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const supportKnowledgeBase = pgTable("support_knowledge_base", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  tags: text("tags").array(),
  isPublished: boolean("is_published").default(false),
  authorId: varchar("author_id").notNull(),
  viewCount: integer("view_count").default(0),
  helpfulCount: integer("helpful_count").default(0),
  notHelpfulCount: integer("not_helpful_count").default(0),
  relatedTickets: integer("related_tickets").array(), // Related ticket IDs
  searchKeywords: text("search_keywords").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for ticket system
export const supportTicketsRelations = relations(supportTickets, ({ many, one }) => ({
  comments: many(supportTicketComments),
  attachments: many(supportTicketAttachments),
  history: many(supportTicketHistory),
  assignee: one(supportAgents, {
    fields: [supportTickets.assignedTo],
    references: [supportAgents.userId],
  }),
}));

export const supportTicketCommentsRelations = relations(supportTicketComments, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportTicketComments.ticketId],
    references: [supportTickets.id],
  }),
}));

export const supportTicketAttachmentsRelations = relations(supportTicketAttachments, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportTicketAttachments.ticketId],
    references: [supportTickets.id],
  }),
}));

export const supportTicketHistoryRelations = relations(supportTicketHistory, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportTicketHistory.ticketId],
    references: [supportTickets.id],
  }),
}));

export const supportAgentsRelations = relations(supportAgents, ({ many }) => ({
  assignedTickets: many(supportTickets),
}));

// Insert schemas for ticket system
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupportTicketCommentSchema = createInsertSchema(supportTicketComments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupportTicketAttachmentSchema = createInsertSchema(supportTicketAttachments).omit({ id: true, createdAt: true });
export const insertSupportTicketHistorySchema = createInsertSchema(supportTicketHistory).omit({ id: true, createdAt: true });
export const insertSupportAgentSchema = createInsertSchema(supportAgents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupportKnowledgeBaseSchema = createInsertSchema(supportKnowledgeBase).omit({ id: true, createdAt: true, updatedAt: true });

// Select types for ticket system
export type SupportTicket = typeof supportTickets.$inferSelect;
export type SupportTicketComment = typeof supportTicketComments.$inferSelect;
export type SupportTicketAttachment = typeof supportTicketAttachments.$inferSelect;
export type SupportTicketHistory = typeof supportTicketHistory.$inferSelect;
export type SupportAgent = typeof supportAgents.$inferSelect;
export type SupportKnowledgeBase = typeof supportKnowledgeBase.$inferSelect;

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type InsertSupportTicketComment = z.infer<typeof insertSupportTicketCommentSchema>;
export type InsertSupportTicketAttachment = z.infer<typeof insertSupportTicketAttachmentSchema>;
export type InsertSupportTicketHistory = z.infer<typeof insertSupportTicketHistorySchema>;
export type InsertSupportAgent = z.infer<typeof insertSupportAgentSchema>;
export type InsertSupportKnowledgeBase = z.infer<typeof insertSupportKnowledgeBaseSchema>;

// ===========================================
// PRIVACY COMPLIANCE TABLES
// ===========================================

// Privacy Policy and Terms of Service
export const privacyPolicies = pgTable("privacy_policies", {
  id: serial("id").primaryKey(),
  version: varchar("version", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const termsOfService = pgTable("terms_of_service", {
  id: serial("id").primaryKey(),
  version: varchar("version", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data Processing Agreements
export const dataProcessingAgreements = pgTable("data_processing_agreements", {
  id: serial("id").primaryKey(),
  agreementType: varchar("agreement_type", { length: 100 }).notNull(), // vendor, employee, student, etc.
  entityName: varchar("entity_name", { length: 200 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(), // individual, organization
  agreementContent: text("agreement_content").notNull(),
  signedDate: timestamp("signed_date"),
  expirationDate: timestamp("expiration_date"),
  status: varchar("status", { length: 50 }).default("pending"), // pending, signed, expired, revoked
  legalBasis: varchar("legal_basis", { length: 100 }).notNull(), // consent, contract, legal_obligation, etc.
  dataCategories: text("data_categories").array(), // ["personal", "sensitive", "financial"]
  processingPurposes: text("processing_purposes").array(),
  retentionPeriod: integer("retention_period_days"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Consent Management
export const userConsents = pgTable("user_consents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  consentType: varchar("consent_type", { length: 100 }).notNull(), // privacy_policy, terms_of_service, data_processing
  consentVersion: varchar("consent_version", { length: 50 }).notNull(),
  consentGiven: boolean("consent_given").notNull(),
  consentDate: timestamp("consent_date").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  withdrawnDate: timestamp("withdrawn_date"),
  expirationDate: timestamp("expiration_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Data Retention Policies
export const dataRetentionPolicies = pgTable("data_retention_policies", {
  id: serial("id").primaryKey(),
  policyName: varchar("policy_name", { length: 200 }).notNull(),
  dataCategory: varchar("data_category", { length: 100 }).notNull(), // employee, payroll, medical, etc.
  retentionPeriodYears: integer("retention_period_years").notNull(),
  legalRequirement: text("legal_requirement"),
  businessJustification: text("business_justification"),
  disposalMethod: varchar("disposal_method", { length: 100 }).notNull(), // secure_delete, anonymize, archive
  isActive: boolean("is_active").default(true),
  reviewDate: timestamp("review_date"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data Deletion Requests (Right to be Forgotten)
export const dataDeletionRequests = pgTable("data_deletion_requests", {
  id: serial("id").primaryKey(),
  requesterId: varchar("requester_id").references(() => users.id),
  employeeId: integer("employee_id").references(() => employees.id),
  requestType: varchar("request_type", { length: 50 }).notNull(), // full_deletion, partial_deletion, anonymization
  requestReason: text("request_reason"),
  dataCategories: text("data_categories").array(), // ["personal", "payroll", "medical", "performance"]
  requestDate: timestamp("request_date").defaultNow(),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewDate: timestamp("review_date"),
  status: varchar("status", { length: 50 }).default("pending"), // pending, approved, rejected, completed
  completionDate: timestamp("completion_date"),
  rejectionReason: text("rejection_reason"),
  deletionDetails: jsonb("deletion_details"), // What was deleted, what was retained and why
  legalBasis: varchar("legal_basis", { length: 100 }), // gdpr_art_17, ccpa, employment_termination
  retentionOverride: boolean("retention_override").default(false), // Legal requirement to retain
  overrideReason: text("override_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Privacy Impact Assessments
export const privacyImpactAssessments = pgTable("privacy_impact_assessments", {
  id: serial("id").primaryKey(),
  assessmentName: varchar("assessment_name", { length: 200 }).notNull(),
  systemOrProcess: varchar("system_or_process", { length: 200 }).notNull(),
  dataTypes: text("data_types").array(),
  riskLevel: varchar("risk_level", { length: 50 }).notNull(), // low, medium, high, critical
  riskDescription: text("risk_description"),
  mitigationMeasures: text("mitigation_measures"),
  assessmentDate: timestamp("assessment_date").defaultNow(),
  reviewDate: timestamp("review_date"),
  assessorId: varchar("assessor_id").references(() => users.id),
  status: varchar("status", { length: 50 }).default("draft"), // draft, completed, approved
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data Breach Incidents
export const dataBreachIncidents = pgTable("data_breach_incidents", {
  id: serial("id").primaryKey(),
  incidentTitle: varchar("incident_title", { length: 200 }).notNull(),
  incidentType: varchar("incident_type", { length: 100 }).notNull(), // unauthorized_access, data_loss, system_breach
  discoveryDate: timestamp("discovery_date").notNull(),
  incidentDate: timestamp("incident_date"),
  affectedDataTypes: text("affected_data_types").array(),
  affectedRecordCount: integer("affected_record_count"),
  riskLevel: varchar("risk_level", { length: 50 }).notNull(),
  containmentMeasures: text("containment_measures"),
  notificationRequired: boolean("notification_required").default(false),
  notificationDate: timestamp("notification_date"),
  regulatoryReported: boolean("regulatory_reported").default(false),
  regulatoryReportDate: timestamp("regulatory_report_date"),
  status: varchar("status", { length: 50 }).default("investigating"), // investigating, contained, resolved
  incidentDetails: text("incident_details"),
  reportedBy: varchar("reported_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Privacy Compliance Relations
export const privacyPoliciesRelations = relations(privacyPolicies, ({ one }) => ({
  createdBy: one(users, {
    fields: [privacyPolicies.createdBy],
    references: [users.id],
  }),
}));

export const termsOfServiceRelations = relations(termsOfService, ({ one }) => ({
  createdBy: one(users, {
    fields: [termsOfService.createdBy],
    references: [users.id],
  }),
}));

export const dataProcessingAgreementsRelations = relations(dataProcessingAgreements, ({ one }) => ({
  createdBy: one(users, {
    fields: [dataProcessingAgreements.createdBy],
    references: [users.id],
  }),
}));

export const userConsentsRelations = relations(userConsents, ({ one }) => ({
  user: one(users, {
    fields: [userConsents.userId],
    references: [users.id],
  }),
}));

export const dataRetentionPoliciesRelations = relations(dataRetentionPolicies, ({ one }) => ({
  createdBy: one(users, {
    fields: [dataRetentionPolicies.createdBy],
    references: [users.id],
  }),
}));

export const dataDeletionRequestsRelations = relations(dataDeletionRequests, ({ one }) => ({
  requester: one(users, {
    fields: [dataDeletionRequests.requesterId],
    references: [users.id],
  }),
  employee: one(employees, {
    fields: [dataDeletionRequests.employeeId],
    references: [employees.id],
  }),
  reviewedBy: one(users, {
    fields: [dataDeletionRequests.reviewedBy],
    references: [users.id],
  }),
}));

export const privacyImpactAssessmentsRelations = relations(privacyImpactAssessments, ({ one }) => ({
  assessor: one(users, {
    fields: [privacyImpactAssessments.assessorId],
    references: [users.id],
  }),
}));

export const dataBreachIncidentsRelations = relations(dataBreachIncidents, ({ one }) => ({
  reportedBy: one(users, {
    fields: [dataBreachIncidents.reportedBy],
    references: [users.id],
  }),
}));

// Privacy Compliance Insert Schemas
export const insertPrivacyPolicySchema = createInsertSchema(privacyPolicies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTermsOfServiceSchema = createInsertSchema(termsOfService).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDataProcessingAgreementSchema = createInsertSchema(dataProcessingAgreements).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserConsentSchema = createInsertSchema(userConsents).omit({ id: true, createdAt: true });
export const insertDataRetentionPolicySchema = createInsertSchema(dataRetentionPolicies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDataDeletionRequestSchema = createInsertSchema(dataDeletionRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPrivacyImpactAssessmentSchema = createInsertSchema(privacyImpactAssessments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDataBreachIncidentSchema = createInsertSchema(dataBreachIncidents).omit({ id: true, createdAt: true, updatedAt: true });

// Privacy Compliance Export Types
export type PrivacyPolicy = typeof privacyPolicies.$inferSelect;
export type InsertPrivacyPolicy = z.infer<typeof insertPrivacyPolicySchema>;
export type TermsOfService = typeof termsOfService.$inferSelect;
export type InsertTermsOfService = z.infer<typeof insertTermsOfServiceSchema>;
export type DataProcessingAgreement = typeof dataProcessingAgreements.$inferSelect;
export type InsertDataProcessingAgreement = z.infer<typeof insertDataProcessingAgreementSchema>;
export type UserConsent = typeof userConsents.$inferSelect;
export type InsertUserConsent = z.infer<typeof insertUserConsentSchema>;
export type DataRetentionPolicy = typeof dataRetentionPolicies.$inferSelect;
export type InsertDataRetentionPolicy = z.infer<typeof insertDataRetentionPolicySchema>;
export type DataDeletionRequest = typeof dataDeletionRequests.$inferSelect;
export type InsertDataDeletionRequest = z.infer<typeof insertDataDeletionRequestSchema>;
export type PrivacyImpactAssessment = typeof privacyImpactAssessments.$inferSelect;
export type InsertPrivacyImpactAssessment = z.infer<typeof insertPrivacyImpactAssessmentSchema>;
export type DataBreachIncident = typeof dataBreachIncidents.$inferSelect;
export type InsertDataBreachIncident = z.infer<typeof insertDataBreachIncidentSchema>;

// Security Updates System
export const securityUpdates = pgTable("security_updates", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical
  category: varchar("category", { length: 100 }).notNull(), // security_patch, vulnerability, policy_update, compliance
  version: varchar("version", { length: 50 }),
  affectedSystems: text("affected_systems").array(),
  patchDetails: text("patch_details"),
  vulnerabilityDetails: text("vulnerability_details"),
  riskAssessment: text("risk_assessment"),
  mitigationSteps: text("mitigation_steps"),
  installationInstructions: text("installation_instructions"),
  rollbackInstructions: text("rollback_instructions"),
  testingProcedures: text("testing_procedures"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, testing, approved, deployed, failed
  isAutomatic: boolean("is_automatic").default(false),
  requiresApproval: boolean("requires_approval").default(true),
  requiresDowntime: boolean("requires_downtime").default(false),
  estimatedDowntime: integer("estimated_downtime"), // in minutes
  releasedBy: varchar("released_by").notNull(),
  approvedBy: varchar("approved_by"),
  deployedBy: varchar("deployed_by"),
  scheduledFor: timestamp("scheduled_for"),
  releasedAt: timestamp("released_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  deployedAt: timestamp("deployed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const securityUpdateLogs = pgTable("security_update_logs", {
  id: serial("id").primaryKey(),
  updateId: integer("update_id").notNull().references(() => securityUpdates.id),
  userId: varchar("user_id").notNull(),
  action: varchar("action").notNull(), // approved, rejected, deployed, rolled_back, tested
  status: varchar("status").notNull(), // success, failed, in_progress
  details: text("details"),
  errorMessage: text("error_message"),
  logOutput: text("log_output"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const securityNotifications = pgTable("security_notifications", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // alert, warning, info, update
  severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical
  targetAudience: varchar("target_audience", { length: 100 }).notNull(), // all, admins, hr, employees
  isActive: boolean("is_active").default(true),
  isDismissible: boolean("is_dismissible").default(true),
  expiresAt: timestamp("expires_at"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const securityUpdateApprovals = pgTable("security_update_approvals", {
  id: serial("id").primaryKey(),
  updateId: integer("update_id").notNull().references(() => securityUpdates.id),
  approverId: varchar("approver_id").notNull(),
  status: varchar("status").notNull(), // pending, approved, rejected
  comments: text("comments"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const securityPolicies = pgTable("security_policies", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  policyType: varchar("policy_type", { length: 100 }).notNull(), // password, access, data_retention, compliance
  content: text("content").notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  isActive: boolean("is_active").default(true),
  effectiveDate: timestamp("effective_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  approvedBy: varchar("approved_by").notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vulnerabilityAssessments = pgTable("vulnerability_assessments", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical
  cvssScore: decimal("cvss_score", { precision: 3, scale: 1 }),
  affectedSystems: text("affected_systems").array(),
  discoveredBy: varchar("discovered_by"),
  discoveredAt: timestamp("discovered_at").defaultNow(),
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, investigating, patched, closed
  riskLevel: varchar("risk_level", { length: 20 }).notNull(),
  impactDescription: text("impact_description"),
  exploitability: varchar("exploitability", { length: 20 }),
  remediation: text("remediation"),
  workaround: text("workaround"),
  references: text("references").array(),
  assignedTo: varchar("assigned_to"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for security updates
export const securityUpdatesRelations = relations(securityUpdates, ({ many }) => ({
  logs: many(securityUpdateLogs),
  approvals: many(securityUpdateApprovals),
}));

export const securityUpdateLogsRelations = relations(securityUpdateLogs, ({ one }) => ({
  update: one(securityUpdates, {
    fields: [securityUpdateLogs.updateId],
    references: [securityUpdates.id],
  }),
}));

export const securityUpdateApprovalsRelations = relations(securityUpdateApprovals, ({ one }) => ({
  update: one(securityUpdates, {
    fields: [securityUpdateApprovals.updateId],
    references: [securityUpdates.id],
  }),
}));

// Insert schemas for security updates
export const insertSecurityUpdateSchema = createInsertSchema(securityUpdates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSecurityUpdateLogSchema = createInsertSchema(securityUpdateLogs).omit({ id: true, createdAt: true });
export const insertSecurityNotificationSchema = createInsertSchema(securityNotifications).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSecurityUpdateApprovalSchema = createInsertSchema(securityUpdateApprovals).omit({ id: true, createdAt: true });
export const insertSecurityPolicySchema = createInsertSchema(securityPolicies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVulnerabilityAssessmentSchema = createInsertSchema(vulnerabilityAssessments).omit({ id: true, createdAt: true, updatedAt: true });

// Select types for security updates
export type SecurityUpdate = typeof securityUpdates.$inferSelect;
export type SecurityUpdateLog = typeof securityUpdateLogs.$inferSelect;
export type SecurityNotification = typeof securityNotifications.$inferSelect;
export type SecurityUpdateApproval = typeof securityUpdateApprovals.$inferSelect;
export type SecurityPolicy = typeof securityPolicies.$inferSelect;
export type VulnerabilityAssessment = typeof vulnerabilityAssessments.$inferSelect;

export type InsertSecurityUpdate = z.infer<typeof insertSecurityUpdateSchema>;
export type InsertSecurityUpdateLog = z.infer<typeof insertSecurityUpdateLogSchema>;
export type InsertSecurityNotification = z.infer<typeof insertSecurityNotificationSchema>;
export type InsertSecurityUpdateApproval = z.infer<typeof insertSecurityUpdateApprovalSchema>;
export type InsertSecurityPolicy = z.infer<typeof insertSecurityPolicySchema>;
export type InsertVulnerabilityAssessment = z.infer<typeof insertVulnerabilityAssessmentSchema>;

// Monthly timecard schemas
export const insertMonthlyTimecardSchema = createInsertSchema(monthlyTimecards).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMonthlyTimecard = z.infer<typeof insertMonthlyTimecardSchema>;
export type MonthlyTimecard = typeof monthlyTimecards.$inferSelect;

// Dropdown options for timecard fields
export const dropdownOptions = pgTable("dropdown_options", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 50 }).notNull(), // 'code', 'funding', 'site', 'addon'
  value: varchar("value", { length: 100 }).notNull(),
  label: varchar("label", { length: 200 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDropdownOptionSchema = createInsertSchema(dropdownOptions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDropdownOption = z.infer<typeof insertDropdownOptionSchema>;
export type DropdownOption = typeof dropdownOptions.$inferSelect;

// Signature relations
export const signatureRequestsRelations = relations(signatureRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [signatureRequests.employeeId],
    references: [employees.id],
  }),
  requester: one(users, {
    fields: [signatureRequests.requesterId],
    references: [users.id],
  }),
}));

export const signatureTemplatesRelations = relations(signatureTemplates, ({ one }) => ({
  creator: one(users, {
    fields: [signatureTemplates.createdBy],
    references: [users.id],
  }),
}));

// Employee Accounts Relations
export const employeeAccountsRelations = relations(employeeAccounts, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeAccounts.employeeId],
    references: [employees.id],
  }),
  user: one(users, {
    fields: [employeeAccounts.userId],
    references: [users.id],
  }),
  accessGranter: one(users, {
    fields: [employeeAccounts.accessGrantedBy],
    references: [users.id],
  }),
  accessRevoker: one(users, {
    fields: [employeeAccounts.accessRevokedBy],
    references: [users.id],
  }),
}));

// Employee Accounts Insert schema
export const insertEmployeeAccountSchema = createInsertSchema(employeeAccounts).omit({ id: true, createdAt: true, updatedAt: true });

// Employee Accounts Select type
export type EmployeeAccount = typeof employeeAccounts.$inferSelect;
export type InsertEmployeeAccount = z.infer<typeof insertEmployeeAccountSchema>;

// Signature Insert schemas
export const insertSignatureRequestSchema = createInsertSchema(signatureRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSignatureTemplateSchema = createInsertSchema(signatureTemplates).omit({ id: true, createdAt: true, updatedAt: true });

// Signature Select types
export type SignatureRequest = typeof signatureRequests.$inferSelect;
export type SignatureTemplate = typeof signatureTemplates.$inferSelect;
export type InsertSignatureRequest = z.infer<typeof insertSignatureRequestSchema>;
export type InsertSignatureTemplate = z.infer<typeof insertSignatureTemplateSchema>;

// Personnel Action Form (PAF) management
export const pafTemplates = pgTable("paf_templates", {
  id: serial("id").primaryKey(),
  districtId: integer("district_id").notNull().references(() => districts.id),
  name: varchar("name").notNull(),
  description: text("description"),
  fileUrl: varchar("file_url").notNull(), // Uploaded PDF template
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  formFields: jsonb("form_fields").notNull(), // Field definitions for fillable form
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pafSubmissions = pgTable("paf_submissions", {
  id: serial("id").primaryKey(),
  districtId: integer("district_id").notNull().references(() => districts.id),
  templateId: integer("template_id").notNull().references(() => pafTemplates.id),
  workflowTemplateId: integer("workflow_template_id").references(() => pafWorkflowTemplates.id),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  employeeId: integer("employee_id").references(() => employees.id), // If related to specific employee
  status: varchar("status").notNull().default("draft"), // draft, submitted, under_review, approved, denied
  currentStep: integer("current_step").default(0), // Current workflow step (0-based)
  formData: jsonb("form_data").notNull(), // All form field values
  
  // PAF Type and Position Information
  pafType: varchar("paf_type"), // new_position, vacant_position, change_existing
  positionType: varchar("position_type"), // certificated, classified, management, administrator, coach
  positionCategory: varchar("position_category"), // prob_perm, temporary, short_term, categorical, summer
  positionTitle: varchar("position_title"),
  workSite: varchar("work_site"),
  fte: varchar("fte"),
  gradeLevel: varchar("grade_level"),
  subjectArea: varchar("subject_area"),
  extraDutyType: varchar("extra_duty_type"),
  
  // Employee Information
  employeeName: varchar("employee_name"),
  effectiveDate: date("effective_date"),
  reason: varchar("reason"), // resignation, retirement, leave, transfer, etc.
  
  // Budget Information
  budgetCode: varchar("budget_code"),
  budgetPercentage: varchar("budget_percentage"),
  
  // Approval workflow
  requestingAdminSignature: jsonb("requesting_admin_signature"), // {signedBy, signedAt, signature}
  businessOfficialSignature: jsonb("business_official_signature"),
  superintendentSignature: jsonb("superintendent_signature"),
  
  // HR Processing
  boardActionItem: varchar("board_action_item"),
  boardActionDate: date("board_action_date"),
  boardActionStatus: varchar("board_action_status"), // approved, denied
  novNumber: varchar("nov_number"),
  newEmployeeName: varchar("new_employee_name"),
  empNumber: varchar("emp_number"),
  pcNumber: varchar("pc_number"),
  effectiveStartDate: date("effective_start_date"),
  assignmentEndDate: date("assignment_end_date"),
  associatedSalarySchedule: varchar("associated_salary_schedule"),
  classStep: varchar("class_step"),
  rate: varchar("rate"),
  coachingStipend: varchar("coaching_stipend"),
  associatedCalendar: varchar("associated_calendar"),
  
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  comments: text("comments"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Configurable workflow templates
export const pafWorkflowTemplates = pgTable("paf_workflow_templates", {
  id: serial("id").primaryKey(),
  districtId: integer("district_id").notNull().references(() => districts.id),
  name: varchar("name").notNull(),
  description: text("description"),
  steps: jsonb("steps").notNull(), // Array of {role, title, required, order}
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pafApprovalWorkflow = pgTable("paf_approval_workflow", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => pafSubmissions.id),
  step: integer("step").notNull(), // 1, 2, 3 for each approval level
  approverRole: varchar("approver_role").notNull(), // hr, finance, supervisor, admin, etc.
  approverUserId: varchar("approver_user_id").references(() => users.id),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected, needs_correction
  signedAt: timestamp("signed_at"),
  signature: text("signature"), // Base64 signature data
  comments: text("comments"),
  
  // Correction and denial controls
  correctionRequested: boolean("correction_requested").default(false),
  correctionReason: text("correction_reason"),
  correctionRequestedBy: varchar("correction_requested_by").references(() => users.id),
  correctionRequestedAt: timestamp("correction_requested_at"),
  sendBackToStep: integer("send_back_to_step"), // Which step to send back to
  sendBackToUserId: varchar("send_back_to_user_id").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PAF Relations
export const pafTemplatesRelations = relations(pafTemplates, ({ one, many }) => ({
  district: one(districts, {
    fields: [pafTemplates.districtId],
    references: [districts.id],
  }),
  creator: one(users, {
    fields: [pafTemplates.createdBy],
    references: [users.id],
  }),
  submissions: many(pafSubmissions),
}));

export const pafSubmissionsRelations = relations(pafSubmissions, ({ one, many }) => ({
  district: one(districts, {
    fields: [pafSubmissions.districtId],
    references: [districts.id],
  }),
  template: one(pafTemplates, {
    fields: [pafSubmissions.templateId],
    references: [pafTemplates.id],
  }),
  submitter: one(users, {
    fields: [pafSubmissions.submittedBy],
    references: [users.id],
  }),
  employee: one(employees, {
    fields: [pafSubmissions.employeeId],
    references: [employees.id],
  }),
  approvalSteps: many(pafApprovalWorkflow),
}));

export const pafApprovalWorkflowRelations = relations(pafApprovalWorkflow, ({ one }) => ({
  submission: one(pafSubmissions, {
    fields: [pafApprovalWorkflow.submissionId],
    references: [pafSubmissions.id],
  }),
  approver: one(users, {
    fields: [pafApprovalWorkflow.approverUserId],
    references: [users.id],
  }),
}));

// PAF Insert schemas
export const insertPafTemplateSchema = createInsertSchema(pafTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPafWorkflowTemplateSchema = createInsertSchema(pafWorkflowTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPafSubmissionSchema = createInsertSchema(pafSubmissions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPafApprovalWorkflowSchema = createInsertSchema(pafApprovalWorkflow).omit({ id: true, createdAt: true, updatedAt: true });

// PAF Select types
export type PafTemplate = typeof pafTemplates.$inferSelect;
export type PafSubmission = typeof pafSubmissions.$inferSelect;
export type PafApprovalWorkflow = typeof pafApprovalWorkflow.$inferSelect;
export type InsertPafTemplate = z.infer<typeof insertPafTemplateSchema>;
export type InsertPafSubmission = z.infer<typeof insertPafSubmissionSchema>;
export type InsertPafApprovalWorkflow = z.infer<typeof insertPafApprovalWorkflowSchema>;


