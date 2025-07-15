import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertEmployeeSchema,
  insertLeaveRequestSchema,
  insertPayrollRecordSchema,
  insertDocumentSchema,
  insertOnboardingWorkflowSchema,
  insertOnboardingFormSchema,
  insertOnboardingFormSubmissionSchema,
  insertTimeCardSchema,
  insertSubstituteTimeCardSchema,
  insertExtraPayContractSchema,
  insertExtraPayRequestSchema,
  insertLetterSchema,
} from "@shared/schema";
import { 
  processDocument, 
  generateOnboardingChecklist, 
  analyzePayrollAnomalies,
  generateSubstituteRecommendations 
} from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats", error: (error as Error).message });
    }
  });

  app.get("/api/dashboard/recent-activity", async (req, res) => {
    try {
      const activity = await storage.getRecentActivityLogs();
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent activity", error: (error as Error).message });
    }
  });

  // Employee routes
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employees", error: (error as Error).message });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployee(parseInt(req.params.id));
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee", error: (error as Error).message });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const employeeData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(employeeData);
      
      // Create activity log
      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "create_employee",
        entityType: "employee",
        entityId: employee.id,
        description: `Created employee ${employee.firstName} ${employee.lastName}`,
      });

      res.status(201).json(employee);
    } catch (error) {
      res.status(400).json({ message: "Failed to create employee", error: (error as Error).message });
    }
  });

  app.put("/api/employees/:id", async (req, res) => {
    try {
      const employeeData = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(parseInt(req.params.id), employeeData);
      
      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "update_employee",
        entityType: "employee",
        entityId: employee.id,
        description: `Updated employee ${employee.firstName} ${employee.lastName}`,
      });

      res.json(employee);
    } catch (error) {
      res.status(400).json({ message: "Failed to update employee", error: (error as Error).message });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      await storage.deleteEmployee(parseInt(req.params.id));
      
      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "delete_employee",
        entityType: "employee",
        entityId: parseInt(req.params.id),
        description: `Deleted employee`,
      });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete employee", error: (error as Error).message });
    }
  });

  // Employee import/export routes
  app.post('/api/employees/import', async (req, res) => {
    try {
      const { employees } = req.body;
      
      if (!Array.isArray(employees)) {
        return res.status(400).json({ message: "Employees must be an array" });
      }

      // Validate each employee record
      const validatedEmployees = [];
      const errors = [];

      for (let i = 0; i < employees.length; i++) {
        const validation = insertEmployeeSchema.safeParse(employees[i]);
        if (!validation.success) {
          errors.push({
            row: i + 1,
            errors: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
          });
        } else {
          validatedEmployees.push(validation.data);
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ 
          message: "Validation errors found", 
          errors: errors.slice(0, 10) // Limit to first 10 errors
        });
      }

      const importedEmployees = await storage.bulkImportEmployees(validatedEmployees);
      
      res.json({
        message: "Employees imported successfully",
        imported: importedEmployees.length,
        employees: importedEmployees
      });
    } catch (error) {
      console.error('Error importing employees:', error);
      res.status(500).json({ message: "Failed to import employees" });
    }
  });

  app.post('/api/employees/bulk-update', async (req, res) => {
    try {
      const { updates } = req.body;
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Updates must be an array" });
      }

      // Validate each update record
      const validatedUpdates = [];
      const errors = [];

      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        if (!update.id || typeof update.id !== 'number') {
          errors.push({
            row: i + 1,
            errors: ['id is required and must be a number']
          });
          continue;
        }

        const validation = insertEmployeeSchema.partial().safeParse(update.data);
        if (!validation.success) {
          errors.push({
            row: i + 1,
            errors: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
          });
        } else {
          validatedUpdates.push({ id: update.id, data: validation.data });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ 
          message: "Validation errors found", 
          errors: errors.slice(0, 10) // Limit to first 10 errors
        });
      }

      const updatedEmployees = await storage.bulkUpdateEmployees(validatedUpdates);
      
      res.json({
        message: "Employees updated successfully",
        updated: updatedEmployees.length,
        employees: updatedEmployees
      });
    } catch (error) {
      console.error('Error updating employees:', error);
      res.status(500).json({ message: "Failed to update employees" });
    }
  });

  app.get('/api/employees/export', async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      
      // Convert to CSV format
      const csvHeaders = [
        'employeeId', 'firstName', 'lastName', 'email', 'phoneNumber', 'address',
        'department', 'position', 'employeeType', 'hireDate', 'salary', 'status'
      ];
      
      const csvRows = employees.map(emp => [
        emp.employeeId,
        emp.firstName,
        emp.lastName,
        emp.email,
        emp.phoneNumber || '',
        emp.address || '',
        emp.department,
        emp.position,
        emp.employeeType,
        emp.hireDate ? new Date(emp.hireDate).toISOString().split('T')[0] : '',
        emp.salary || '',
        emp.status || 'active'
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="employees_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('Error exporting employees:', error);
      res.status(500).json({ message: "Failed to export employees" });
    }
  });

  // Leave management routes
  app.get("/api/leave-types", async (req, res) => {
    try {
      const leaveTypes = await storage.getLeaveTypes();
      res.json(leaveTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leave types", error: (error as Error).message });
    }
  });

  app.get("/api/leave-requests", async (req, res) => {
    try {
      const leaveRequests = await storage.getLeaveRequests();
      res.json(leaveRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leave requests", error: (error as Error).message });
    }
  });

  app.get("/api/leave-requests/pending", async (req, res) => {
    try {
      const pendingRequests = await storage.getPendingLeaveRequests();
      res.json(pendingRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending leave requests", error: (error as Error).message });
    }
  });

  app.post("/api/leave-requests", async (req, res) => {
    try {
      const requestData = insertLeaveRequestSchema.parse(req.body);
      const leaveRequest = await storage.createLeaveRequest(requestData);
      
      // Auto-assign substitute if required
      if (requestData.substituteRequired) {
        const availableSubstitutes = await storage.getAvailableSubstitutes();
        if (availableSubstitutes.length > 0) {
          const recommendations = await generateSubstituteRecommendations(leaveRequest, availableSubstitutes);
          if (recommendations.recommendations.length > 0) {
            const bestMatch = recommendations.recommendations[0];
            await storage.createSubstituteAssignment({
              leaveRequestId: leaveRequest.id,
              substituteEmployeeId: bestMatch.substituteId,
              assignedDate: new Date(),
              status: "assigned",
              notes: `Auto-assigned based on AI recommendation (${bestMatch.matchScore} match score)`,
            });
          }
        }
      }

      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "create_leave_request",
        entityType: "leave_request",
        entityId: leaveRequest.id,
        description: `Created leave request for employee ${requestData.employeeId}`,
      });

      res.status(201).json(leaveRequest);
    } catch (error) {
      res.status(400).json({ message: "Failed to create leave request", error: (error as Error).message });
    }
  });

  app.put("/api/leave-requests/:id", async (req, res) => {
    try {
      const requestData = insertLeaveRequestSchema.partial().parse(req.body);
      const leaveRequest = await storage.updateLeaveRequest(parseInt(req.params.id), requestData);
      
      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "update_leave_request",
        entityType: "leave_request",
        entityId: leaveRequest.id,
        description: `Updated leave request status to ${requestData.status}`,
      });

      res.json(leaveRequest);
    } catch (error) {
      res.status(400).json({ message: "Failed to update leave request", error: (error as Error).message });
    }
  });

  // Payroll routes
  app.get("/api/payroll", async (req, res) => {
    try {
      const payrollRecords = await storage.getPayrollRecords();
      res.json(payrollRecords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payroll records", error: (error as Error).message });
    }
  });

  app.get("/api/payroll/summary", async (req, res) => {
    try {
      const summary = await storage.getCurrentPayrollSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payroll summary", error: (error as Error).message });
    }
  });

  app.post("/api/payroll", async (req, res) => {
    try {
      const payrollData = insertPayrollRecordSchema.parse(req.body);
      const payrollRecord = await storage.createPayrollRecord(payrollData);
      
      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "create_payroll_record",
        entityType: "payroll",
        entityId: payrollRecord.id,
        description: `Created payroll record for employee ${payrollData.employeeId}`,
      });

      res.status(201).json(payrollRecord);
    } catch (error) {
      res.status(400).json({ message: "Failed to create payroll record", error: (error as Error).message });
    }
  });

  app.post("/api/payroll/analyze", async (req, res) => {
    try {
      const payrollRecords = await storage.getPayrollRecords();
      const analysis = await analyzePayrollAnomalies(payrollRecords);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze payroll data", error: (error as Error).message });
    }
  });

  // Document routes
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents", error: (error as Error).message });
    }
  });

  app.get("/api/documents/pending", async (req, res) => {
    try {
      const pendingDocuments = await storage.getPendingDocuments();
      res.json(pendingDocuments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending documents", error: (error as Error).message });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const documentData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(documentData);
      
      // Process document with AI if text content is provided
      if (req.body.documentText) {
        const aiResults = await processDocument(req.body.documentText, documentData.documentType);
        await storage.updateDocument(document.id, {
          aiProcessingResults: aiResults,
          status: aiResults.status,
          expirationDate: aiResults.expirationDate ? new Date(aiResults.expirationDate) : null,
        });
      }

      await storage.createActivityLog({
        userId: documentData.uploadedBy,
        action: "upload_document",
        entityType: "document",
        entityId: document.id,
        description: `Uploaded document ${documentData.fileName}`,
      });

      res.status(201).json(document);
    } catch (error) {
      res.status(400).json({ message: "Failed to create document", error: (error as Error).message });
    }
  });

  app.put("/api/documents/:id", async (req, res) => {
    try {
      const documentData = insertDocumentSchema.partial().parse(req.body);
      const document = await storage.updateDocument(parseInt(req.params.id), documentData);
      
      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "update_document",
        entityType: "document",
        entityId: document.id,
        description: `Updated document ${document.fileName}`,
      });

      res.json(document);
    } catch (error) {
      res.status(400).json({ message: "Failed to update document", error: (error as Error).message });
    }
  });

  // Onboarding routes
  app.get("/api/onboarding", async (req, res) => {
    try {
      const workflows = await storage.getOnboardingWorkflows();
      res.json(workflows);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch onboarding workflows", error: (error as Error).message });
    }
  });

  app.post("/api/onboarding", async (req, res) => {
    try {
      const workflowData = insertOnboardingWorkflowSchema.parse(req.body);
      
      // Generate AI-powered checklist
      const employee = await storage.getEmployee(workflowData.employeeId);
      if (employee) {
        const checklist = await generateOnboardingChecklist(employee.employeeType, employee.department);
        workflowData.requiredDocuments = checklist.requiredDocuments;
        workflowData.currentStep = checklist.steps[0]?.step || "start";
      }

      const workflow = await storage.createOnboardingWorkflow(workflowData);
      
      await storage.createActivityLog({
        userId: workflowData.assignedTo || "system",
        action: "create_onboarding_workflow",
        entityType: "onboarding",
        entityId: workflow.id,
        description: `Started onboarding workflow for employee ${workflowData.employeeId}`,
      });

      res.status(201).json(workflow);
    } catch (error) {
      res.status(400).json({ message: "Failed to create onboarding workflow", error: (error as Error).message });
    }
  });

  app.put("/api/onboarding/:id", async (req, res) => {
    try {
      const workflowData = insertOnboardingWorkflowSchema.partial().parse(req.body);
      const workflow = await storage.updateOnboardingWorkflow(parseInt(req.params.id), workflowData);
      
      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "update_onboarding_workflow",
        entityType: "onboarding",
        entityId: workflow.id,
        description: `Updated onboarding workflow status to ${workflowData.status}`,
      });

      res.json(workflow);
    } catch (error) {
      res.status(400).json({ message: "Failed to update onboarding workflow", error: (error as Error).message });
    }
  });

  // Onboarding forms routes
  app.get("/api/onboarding/forms", async (req, res) => {
    try {
      const forms = await storage.getOnboardingForms();
      res.json(forms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch onboarding forms", error: (error as Error).message });
    }
  });

  app.get("/api/onboarding/forms/active", async (req, res) => {
    try {
      const forms = await storage.getActiveOnboardingForms();
      res.json(forms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active onboarding forms", error: (error as Error).message });
    }
  });

  app.get("/api/onboarding/forms/:id", async (req, res) => {
    try {
      const form = await storage.getOnboardingForm(parseInt(req.params.id));
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      res.json(form);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch onboarding form", error: (error as Error).message });
    }
  });

  app.post("/api/onboarding/forms", async (req, res) => {
    try {
      const formData = insertOnboardingFormSchema.parse(req.body);
      const form = await storage.createOnboardingForm(formData);
      
      await storage.createActivityLog({
        userId: formData.createdBy,
        action: "create_onboarding_form",
        entityType: "onboarding_form",
        entityId: form.id,
        description: `Created onboarding form "${form.title}"`,
      });

      res.status(201).json(form);
    } catch (error) {
      res.status(400).json({ message: "Failed to create onboarding form", error: (error as Error).message });
    }
  });

  app.put("/api/onboarding/forms/:id", async (req, res) => {
    try {
      const formData = insertOnboardingFormSchema.partial().parse(req.body);
      const form = await storage.updateOnboardingForm(parseInt(req.params.id), formData);
      
      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "update_onboarding_form",
        entityType: "onboarding_form",
        entityId: form.id,
        description: `Updated onboarding form "${form.title}"`,
      });

      res.json(form);
    } catch (error) {
      res.status(400).json({ message: "Failed to update onboarding form", error: (error as Error).message });
    }
  });

  app.delete("/api/onboarding/forms/:id", async (req, res) => {
    try {
      const formId = parseInt(req.params.id);
      const form = await storage.getOnboardingForm(formId);
      
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      await storage.deleteOnboardingForm(formId);
      
      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "delete_onboarding_form",
        entityType: "onboarding_form",
        entityId: formId,
        description: `Deleted onboarding form "${form.title}"`,
      });

      res.json({ message: "Form deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete onboarding form", error: (error as Error).message });
    }
  });

  // Onboarding form submissions routes
  app.get("/api/onboarding/submissions", async (req, res) => {
    try {
      const submissions = await storage.getOnboardingFormSubmissions();
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form submissions", error: (error as Error).message });
    }
  });

  app.get("/api/onboarding/submissions/pending", async (req, res) => {
    try {
      const submissions = await storage.getPendingOnboardingFormSubmissions();
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending submissions", error: (error as Error).message });
    }
  });

  app.post("/api/onboarding/submissions", async (req, res) => {
    try {
      const submissionData = insertOnboardingFormSubmissionSchema.parse(req.body);
      const submission = await storage.createOnboardingFormSubmission(submissionData);
      
      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "create_form_submission",
        entityType: "onboarding_submission",
        entityId: submission.id,
        description: `Form submission created for employee ${submissionData.employeeId}`,
      });

      res.status(201).json(submission);
    } catch (error) {
      res.status(400).json({ message: "Failed to create form submission", error: (error as Error).message });
    }
  });

  app.put("/api/onboarding/submissions/:id", async (req, res) => {
    try {
      const submissionData = insertOnboardingFormSubmissionSchema.partial().parse(req.body);
      const submission = await storage.updateOnboardingFormSubmission(parseInt(req.params.id), submissionData);
      
      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "update_form_submission",
        entityType: "onboarding_submission",
        entityId: submission.id,
        description: `Form submission updated with status ${submissionData.status}`,
      });

      res.json(submission);
    } catch (error) {
      res.status(400).json({ message: "Failed to update form submission", error: (error as Error).message });
    }
  });

  // Substitute assignment routes
  app.get("/api/substitutes/assignments", async (req, res) => {
    try {
      const assignments = await storage.getSubstituteAssignments();
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch substitute assignments", error: (error as Error).message });
    }
  });

  app.get("/api/substitutes/available", async (req, res) => {
    try {
      const substitutes = await storage.getAvailableSubstitutes();
      res.json(substitutes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch available substitutes", error: (error as Error).message });
    }
  });

  // Time card routes
  app.get("/api/time-cards", async (req, res) => {
    try {
      const timeCards = await storage.getTimeCards();
      res.json(timeCards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time cards", error: (error as Error).message });
    }
  });

  // Export time cards for accounting
  app.get("/api/time-cards/export", async (req, res) => {
    try {
      const { startDate, endDate, status } = req.query;
      const timeCards = await storage.getTimeCards();
      
      // Filter by date range if provided
      let filteredCards = timeCards;
      if (startDate && endDate) {
        filteredCards = timeCards.filter(card => {
          const cardDate = new Date(card.date);
          return cardDate >= new Date(startDate as string) && cardDate <= new Date(endDate as string);
        });
      }
      
      // Filter by status if provided
      if (status && status !== 'all') {
        filteredCards = filteredCards.filter(card => card.status === status);
      }
      
      // Get employee information
      const employees = await storage.getEmployees();
      const employeeMap = new Map(employees.map(emp => [emp.id, emp]));
      
      // Format data for accounting export
      const exportData = filteredCards.map(card => {
        const employee = employeeMap.get(card.employeeId);
        const hourlyRate = employee?.salary ? (parseFloat(employee.salary) / 2080) : 0;
        const regularPay = card.totalHours ? (Number(card.totalHours) * hourlyRate) : 0;
        const overtimePay = card.overtimeHours ? (Number(card.overtimeHours) * hourlyRate * 1.5) : 0;
        
        return {
          TimeCardID: card.id,
          EmployeeID: employee?.employeeId || '',
          FirstName: employee?.firstName || '',
          LastName: employee?.lastName || '',
          Department: employee?.department || '',
          Position: employee?.position || '',
          Date: card.date,
          ClockIn: card.clockIn,
          ClockOut: card.clockOut,
          BreakStart: card.breakStart,
          BreakEnd: card.breakEnd,
          TotalHours: card.totalHours,
          OvertimeHours: card.overtimeHours,
          HourlyRate: hourlyRate.toFixed(2),
          RegularPay: regularPay.toFixed(2),
          OvertimePay: overtimePay.toFixed(2),
          TotalPay: (regularPay + overtimePay).toFixed(2),
          Status: card.status,
          ApprovalStage: card.currentApprovalStage,
          SubmittedAt: card.submittedAt,
          ApprovedAt: card.adminApprovedAt,
          ProcessedAt: card.payrollProcessedAt,
          Notes: card.notes
        };
      });
      
      res.json({
        exportDate: new Date().toISOString(),
        totalRecords: exportData.length,
        dateRange: { startDate, endDate },
        status: status || 'all',
        data: exportData
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to export time cards", error: (error as Error).message });
    }
  });

  app.get("/api/time-cards/:id", async (req, res) => {
    try {
      const timeCard = await storage.getTimeCard(parseInt(req.params.id));
      if (!timeCard) {
        return res.status(404).json({ message: "Time card not found" });
      }
      res.json(timeCard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time card", error: (error as Error).message });
    }
  });

  app.post("/api/time-cards", async (req, res) => {
    try {
      const data = insertTimeCardSchema.parse(req.body);
      const timeCard = await storage.createTimeCard(data);
      res.status(201).json(timeCard);
    } catch (error) {
      res.status(400).json({ message: "Failed to create time card", error: (error as Error).message });
    }
  });

  app.put("/api/time-cards/:id", async (req, res) => {
    try {
      const data = insertTimeCardSchema.partial().parse(req.body);
      const timeCard = await storage.updateTimeCard(parseInt(req.params.id), data);
      res.json(timeCard);
    } catch (error) {
      res.status(400).json({ message: "Failed to update time card", error: (error as Error).message });
    }
  });

  app.delete("/api/time-cards/:id", async (req, res) => {
    try {
      await storage.deleteTimeCard(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete time card", error: (error as Error).message });
    }
  });

  app.get("/api/time-cards/employee/:id", async (req, res) => {
    try {
      const timeCards = await storage.getTimeCardsByEmployee(parseInt(req.params.id));
      res.json(timeCards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee time cards", error: (error as Error).message });
    }
  });

  app.get("/api/time-cards/pending", async (req, res) => {
    try {
      const timeCards = await storage.getPendingTimeCards();
      res.json(timeCards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending time cards", error: (error as Error).message });
    }
  });

  app.get("/api/time-cards/date-range", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const timeCards = await storage.getTimeCardsByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(timeCards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time cards by date range", error: (error as Error).message });
    }
  });

  app.get("/api/time-cards/approval-stage/:stage", async (req, res) => {
    try {
      const timeCards = await storage.getTimeCardsByApprovalStage(req.params.stage);
      res.json(timeCards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time cards by approval stage", error: (error as Error).message });
    }
  });

  app.post("/api/time-cards/:id/submit", async (req, res) => {
    try {
      const { submittedBy } = req.body;
      const timeCard = await storage.submitTimeCardForApproval(parseInt(req.params.id), submittedBy);
      res.json(timeCard);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit time card for approval", error: (error as Error).message });
    }
  });

  app.post("/api/time-cards/:id/approve-employee", async (req, res) => {
    try {
      const { employeeId, notes } = req.body;
      const timeCard = await storage.approveTimeCardByEmployee(parseInt(req.params.id), employeeId, notes);
      res.json(timeCard);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve time card by employee", error: (error as Error).message });
    }
  });

  app.post("/api/time-cards/:id/approve-admin", async (req, res) => {
    try {
      const { adminId, notes } = req.body;
      const timeCard = await storage.approveTimeCardByAdmin(parseInt(req.params.id), adminId, notes);
      res.json(timeCard);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve time card by admin", error: (error as Error).message });
    }
  });

  app.post("/api/time-cards/:id/process-payroll", async (req, res) => {
    try {
      const { payrollId, notes } = req.body;
      const timeCard = await storage.processTimeCardByPayroll(parseInt(req.params.id), payrollId, notes);
      res.json(timeCard);
    } catch (error) {
      res.status(500).json({ message: "Failed to process time card by payroll", error: (error as Error).message });
    }
  });

  app.post("/api/time-cards/:id/reject", async (req, res) => {
    try {
      const { rejectedBy, notes } = req.body;
      const timeCard = await storage.rejectTimeCard(parseInt(req.params.id), rejectedBy, notes);
      res.json(timeCard);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject time card", error: (error as Error).message });
    }
  });

  // Substitute Time Cards API endpoints
  app.get('/api/substitute-time-cards', async (req, res) => {
    try {
      const substituteTimeCards = await storage.getSubstituteTimeCards();
      res.json(substituteTimeCards);
    } catch (error) {
      console.error('Error fetching substitute time cards:', error);
      res.status(500).json({ message: "Failed to fetch substitute time cards" });
    }
  });

  // Export substitute time cards for accounting
  app.get('/api/substitute-time-cards/export', async (req, res) => {
    try {
      const { startDate, endDate, status } = req.query;
      const substituteTimeCards = await storage.getSubstituteTimeCards();
      
      // Filter by date range if provided
      let filteredCards = substituteTimeCards;
      if (startDate && endDate) {
        filteredCards = substituteTimeCards.filter(card => {
          const cardDate = new Date(card.date);
          return cardDate >= new Date(startDate as string) && cardDate <= new Date(endDate as string);
        });
      }
      
      // Filter by status if provided
      if (status && status !== 'all') {
        filteredCards = filteredCards.filter(card => card.status === status);
      }
      
      // Get employee information
      const employees = await storage.getEmployees();
      const employeeMap = new Map(employees.map(emp => [emp.id, emp]));
      
      // Format data for accounting export
      const exportData = filteredCards.map(card => {
        const employee = employeeMap.get(card.substituteId);
        const dailyRate = card.dailyRate || 150; // Default daily rate
        const totalPay = card.totalPay || (Number(card.totalHours || 0) * Number(dailyRate) / 8); // Calculate based on hours
        
        return {
          TimeCardID: card.id,
          EmployeeID: employee?.employeeId || '',
          FirstName: employee?.firstName || '',
          LastName: employee?.lastName || '',
          EmployeeType: 'Substitute',
          Department: employee?.department || '',
          Position: employee?.position || '',
          Date: card.date,
          ClockIn: card.clockIn,
          ClockOut: card.clockOut,
          BreakStart: card.breakStart,
          BreakEnd: card.breakEnd,
          TotalHours: card.totalHours,
          OvertimeHours: card.overtimeHours || 0,
          DailyRate: dailyRate,
          TotalPay: totalPay,
          Status: card.status,
          ApprovalStage: card.currentApprovalStage,
          SubmittedAt: card.submittedAt,
          ApprovedAt: card.adminApprovedAt,
          ProcessedAt: card.payrollProcessedAt,
          Notes: card.notes
        };
      });
      
      res.json({
        exportDate: new Date().toISOString(),
        totalRecords: exportData.length,
        dateRange: { startDate, endDate },
        status: status || 'all',
        employeeType: 'substitute',
        data: exportData
      });
    } catch (error) {
      console.error('Error exporting substitute time cards:', error);
      res.status(500).json({ message: "Failed to export substitute time cards" });
    }
  });

  app.get('/api/substitute-time-cards/pending', async (req, res) => {
    try {
      const pendingSubstituteTimeCards = await storage.getPendingSubstituteTimeCards();
      res.json(pendingSubstituteTimeCards);
    } catch (error) {
      console.error('Error fetching pending substitute time cards:', error);
      res.status(500).json({ message: "Failed to fetch pending substitute time cards" });
    }
  });

  app.post('/api/substitute-time-cards', async (req, res) => {
    try {
      const validation = insertSubstituteTimeCardSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const substituteTimeCard = await storage.createSubstituteTimeCard(validation.data);
      res.json(substituteTimeCard);
    } catch (error) {
      console.error('Error creating substitute time card:', error);
      res.status(500).json({ message: "Failed to create substitute time card" });
    }
  });

  app.post('/api/substitute-time-cards/:id/submit', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { submittedBy } = req.body;
      const substituteTimeCard = await storage.submitSubstituteTimeCardForApproval(id, submittedBy);
      res.json(substituteTimeCard);
    } catch (error) {
      console.error('Error submitting substitute time card:', error);
      res.status(500).json({ message: "Failed to submit substitute time card" });
    }
  });

  app.post('/api/substitute-time-cards/:id/approve-admin', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { adminId, notes } = req.body;
      const substituteTimeCard = await storage.approveSubstituteTimeCardByAdmin(id, adminId, notes);
      res.json(substituteTimeCard);
    } catch (error) {
      console.error('Error approving substitute time card:', error);
      res.status(500).json({ message: "Failed to approve substitute time card" });
    }
  });

  app.post('/api/substitute-time-cards/:id/process-payroll', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { payrollId, notes } = req.body;
      const substituteTimeCard = await storage.processSubstituteTimeCardByPayroll(id, payrollId, notes);
      res.json(substituteTimeCard);
    } catch (error) {
      console.error('Error processing substitute time card:', error);
      res.status(500).json({ message: "Failed to process substitute time card" });
    }
  });

  app.post('/api/substitute-time-cards/:id/reject', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { rejectedBy, notes } = req.body;
      const substituteTimeCard = await storage.rejectSubstituteTimeCard(id, rejectedBy, notes);
      res.json(substituteTimeCard);
    } catch (error) {
      console.error('Error rejecting substitute time card:', error);
      res.status(500).json({ message: "Failed to reject substitute time card" });
    }
  });

  // Extra Pay Contracts Routes
  app.get('/api/extra-pay-contracts', async (req, res) => {
    try {
      const contracts = await storage.getExtraPayContracts();
      res.json(contracts);
    } catch (error) {
      console.error('Error fetching extra pay contracts:', error);
      res.status(500).json({ message: "Failed to fetch extra pay contracts" });
    }
  });

  app.get('/api/extra-pay-contracts/active', async (req, res) => {
    try {
      const contracts = await storage.getActiveExtraPayContracts();
      res.json(contracts);
    } catch (error) {
      console.error('Error fetching active extra pay contracts:', error);
      res.status(500).json({ message: "Failed to fetch active extra pay contracts" });
    }
  });

  app.get('/api/extra-pay-contracts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contract = await storage.getExtraPayContract(id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      console.error('Error fetching extra pay contract:', error);
      res.status(500).json({ message: "Failed to fetch extra pay contract" });
    }
  });

  app.post('/api/extra-pay-contracts', async (req, res) => {
    try {
      const validation = insertExtraPayContractSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const contract = await storage.createExtraPayContract(validation.data);
      res.json(contract);
    } catch (error) {
      console.error('Error creating extra pay contract:', error);
      res.status(500).json({ message: "Failed to create extra pay contract" });
    }
  });

  app.put('/api/extra-pay-contracts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertExtraPayContractSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const contract = await storage.updateExtraPayContract(id, validation.data);
      res.json(contract);
    } catch (error) {
      console.error('Error updating extra pay contract:', error);
      res.status(500).json({ message: "Failed to update extra pay contract" });
    }
  });

  app.delete('/api/extra-pay-contracts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteExtraPayContract(id);
      res.json({ message: "Contract deleted successfully" });
    } catch (error) {
      console.error('Error deleting extra pay contract:', error);
      res.status(500).json({ message: "Failed to delete extra pay contract" });
    }
  });

  // Extra Pay Requests Routes
  app.get('/api/extra-pay-requests', async (req, res) => {
    try {
      const requests = await storage.getExtraPayRequests();
      res.json(requests);
    } catch (error) {
      console.error('Error fetching extra pay requests:', error);
      res.status(500).json({ message: "Failed to fetch extra pay requests" });
    }
  });

  app.get('/api/extra-pay-requests/pending', async (req, res) => {
    try {
      const requests = await storage.getPendingExtraPayRequests();
      res.json(requests);
    } catch (error) {
      console.error('Error fetching pending extra pay requests:', error);
      res.status(500).json({ message: "Failed to fetch pending extra pay requests" });
    }
  });

  app.get('/api/extra-pay-requests/employee/:employeeId', async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const requests = await storage.getExtraPayRequestsByEmployee(employeeId);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching employee extra pay requests:', error);
      res.status(500).json({ message: "Failed to fetch employee extra pay requests" });
    }
  });

  app.get('/api/extra-pay-requests/contract/:contractId', async (req, res) => {
    try {
      const contractId = parseInt(req.params.contractId);
      const requests = await storage.getExtraPayRequestsByContract(contractId);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching contract extra pay requests:', error);
      res.status(500).json({ message: "Failed to fetch contract extra pay requests" });
    }
  });

  app.get('/api/extra-pay-requests/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getExtraPayRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error('Error fetching extra pay request:', error);
      res.status(500).json({ message: "Failed to fetch extra pay request" });
    }
  });

  app.post('/api/extra-pay-requests', async (req, res) => {
    try {
      const validation = insertExtraPayRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const request = await storage.createExtraPayRequest(validation.data);
      res.json(request);
    } catch (error) {
      console.error('Error creating extra pay request:', error);
      res.status(500).json({ message: "Failed to create extra pay request" });
    }
  });

  app.put('/api/extra-pay-requests/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertExtraPayRequestSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const request = await storage.updateExtraPayRequest(id, validation.data);
      res.json(request);
    } catch (error) {
      console.error('Error updating extra pay request:', error);
      res.status(500).json({ message: "Failed to update extra pay request" });
    }
  });

  app.delete('/api/extra-pay-requests/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteExtraPayRequest(id);
      res.json({ message: "Request deleted successfully" });
    } catch (error) {
      console.error('Error deleting extra pay request:', error);
      res.status(500).json({ message: "Failed to delete extra pay request" });
    }
  });

  app.post('/api/extra-pay-requests/:id/approve', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { approvedBy } = req.body;
      const request = await storage.approveExtraPayRequest(id, approvedBy);
      res.json(request);
    } catch (error) {
      console.error('Error approving extra pay request:', error);
      res.status(500).json({ message: "Failed to approve extra pay request" });
    }
  });

  app.post('/api/extra-pay-requests/:id/reject', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { rejectedBy, reason } = req.body;
      const request = await storage.rejectExtraPayRequest(id, rejectedBy, reason);
      res.json(request);
    } catch (error) {
      console.error('Error rejecting extra pay request:', error);
      res.status(500).json({ message: "Failed to reject extra pay request" });
    }
  });

  app.post('/api/extra-pay-requests/:id/mark-paid', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.markExtraPayRequestPaid(id);
      res.json(request);
    } catch (error) {
      console.error('Error marking extra pay request as paid:', error);
      res.status(500).json({ message: "Failed to mark extra pay request as paid" });
    }
  });

  // Letters Routes
  app.get('/api/letters', async (req, res) => {
    try {
      const letters = await storage.getLetters();
      res.json(letters);
    } catch (error) {
      console.error('Error fetching letters:', error);
      res.status(500).json({ message: "Failed to fetch letters" });
    }
  });

  app.get('/api/letters/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const letter = await storage.getLetter(id);
      if (!letter) {
        return res.status(404).json({ message: "Letter not found" });
      }
      res.json(letter);
    } catch (error) {
      console.error('Error fetching letter:', error);
      res.status(500).json({ message: "Failed to fetch letter" });
    }
  });

  app.post('/api/letters', async (req, res) => {
    try {
      const validation = insertLetterSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const letter = await storage.createLetter(validation.data);
      res.json(letter);
    } catch (error) {
      console.error('Error creating letter:', error);
      res.status(500).json({ message: "Failed to create letter" });
    }
  });

  app.put('/api/letters/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertLetterSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const letter = await storage.updateLetter(id, validation.data);
      res.json(letter);
    } catch (error) {
      console.error('Error updating letter:', error);
      res.status(500).json({ message: "Failed to update letter" });
    }
  });

  app.delete('/api/letters/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLetter(id);
      res.json({ message: "Letter deleted successfully" });
    } catch (error) {
      console.error('Error deleting letter:', error);
      res.status(500).json({ message: "Failed to delete letter" });
    }
  });

  app.get('/api/letters/employee/:employeeId', async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const letters = await storage.getLettersByEmployee(employeeId);
      res.json(letters);
    } catch (error) {
      console.error('Error fetching letters by employee:', error);
      res.status(500).json({ message: "Failed to fetch letters by employee" });
    }
  });

  app.post('/api/letters/:id/process', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { employeeId } = req.body;
      
      // Get employee data
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const letter = await storage.processLetterTemplate(id, employee);
      res.json(letter);
    } catch (error) {
      console.error('Error processing letter:', error);
      res.status(500).json({ message: "Failed to process letter" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
