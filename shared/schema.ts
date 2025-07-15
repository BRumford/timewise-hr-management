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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Payroll records table
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
  payrollDetails: jsonb("payroll_details"), // store detailed breakdown
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
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
  date: timestamp("date").notNull(),
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
  breakStart: timestamp("break_start"),
  breakEnd: timestamp("break_end"),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0"),
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

export const onboardingWorkflowsRelations = relations(onboardingWorkflows, ({ one }) => ({
  employee: one(employees, { fields: [onboardingWorkflows.employeeId], references: [employees.id] }),
}));

export const timeCardsRelations = relations(timeCards, ({ one }) => ({
  employee: one(employees, { fields: [timeCards.employeeId], references: [employees.id] }),
  submitter: one(employees, { fields: [timeCards.submittedBy], references: [employees.id] }),
  employeeApprover: one(employees, { fields: [timeCards.approvedByEmployee], references: [employees.id] }),
  adminApprover: one(employees, { fields: [timeCards.approvedByAdmin], references: [employees.id] }),
  payrollProcessor: one(employees, { fields: [timeCards.processedByPayroll], references: [employees.id] }),
}));

export const substituteTimeCardsRelations = relations(substituteTimeCards, ({ one }) => ({
  substitute: one(employees, { fields: [substituteTimeCards.substituteId], references: [employees.id] }),
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

// Zod schemas
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPayrollRecordSchema = createInsertSchema(payrollRecords).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOnboardingWorkflowSchema = createInsertSchema(onboardingWorkflows).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTimeCardSchema = createInsertSchema(timeCards).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubstituteTimeCardSchema = createInsertSchema(substituteTimeCards).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export const insertExtraPayContractSchema = createInsertSchema(extraPayContracts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExtraPayRequestSchema = createInsertSchema(extraPayRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLetterSchema = createInsertSchema(letters).omit({ id: true, createdAt: true, updatedAt: true });

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
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertOnboardingWorkflow = z.infer<typeof insertOnboardingWorkflowSchema>;
export type OnboardingWorkflow = typeof onboardingWorkflows.$inferSelect;
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
