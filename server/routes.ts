import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertEmployeeSchema,
  insertLeaveRequestSchema,
  insertPayrollRecordSchema,
  insertDocumentSchema,
  insertOnboardingWorkflowSchema,
  insertTimeCardSchema,
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
      res.status(500).json({ message: "Failed to fetch dashboard stats", error: error.message });
    }
  });

  app.get("/api/dashboard/recent-activity", async (req, res) => {
    try {
      const activity = await storage.getRecentActivityLogs();
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent activity", error: error.message });
    }
  });

  // Employee routes
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employees", error: error.message });
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
      res.status(500).json({ message: "Failed to fetch employee", error: error.message });
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
      res.status(400).json({ message: "Failed to create employee", error: error.message });
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
      res.status(400).json({ message: "Failed to update employee", error: error.message });
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
      res.status(500).json({ message: "Failed to delete employee", error: error.message });
    }
  });

  // Leave management routes
  app.get("/api/leave-types", async (req, res) => {
    try {
      const leaveTypes = await storage.getLeaveTypes();
      res.json(leaveTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leave types", error: error.message });
    }
  });

  app.get("/api/leave-requests", async (req, res) => {
    try {
      const leaveRequests = await storage.getLeaveRequests();
      res.json(leaveRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leave requests", error: error.message });
    }
  });

  app.get("/api/leave-requests/pending", async (req, res) => {
    try {
      const pendingRequests = await storage.getPendingLeaveRequests();
      res.json(pendingRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending leave requests", error: error.message });
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
      res.status(400).json({ message: "Failed to create leave request", error: error.message });
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
      res.status(400).json({ message: "Failed to update leave request", error: error.message });
    }
  });

  // Payroll routes
  app.get("/api/payroll", async (req, res) => {
    try {
      const payrollRecords = await storage.getPayrollRecords();
      res.json(payrollRecords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payroll records", error: error.message });
    }
  });

  app.get("/api/payroll/summary", async (req, res) => {
    try {
      const summary = await storage.getCurrentPayrollSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payroll summary", error: error.message });
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
      res.status(400).json({ message: "Failed to create payroll record", error: error.message });
    }
  });

  app.post("/api/payroll/analyze", async (req, res) => {
    try {
      const payrollRecords = await storage.getPayrollRecords();
      const analysis = await analyzePayrollAnomalies(payrollRecords);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze payroll data", error: error.message });
    }
  });

  // Document routes
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents", error: error.message });
    }
  });

  app.get("/api/documents/pending", async (req, res) => {
    try {
      const pendingDocuments = await storage.getPendingDocuments();
      res.json(pendingDocuments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending documents", error: error.message });
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
      res.status(400).json({ message: "Failed to create document", error: error.message });
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
      res.status(400).json({ message: "Failed to update document", error: error.message });
    }
  });

  // Onboarding routes
  app.get("/api/onboarding", async (req, res) => {
    try {
      const workflows = await storage.getOnboardingWorkflows();
      res.json(workflows);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch onboarding workflows", error: error.message });
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
      res.status(400).json({ message: "Failed to create onboarding workflow", error: error.message });
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
      res.status(400).json({ message: "Failed to update onboarding workflow", error: error.message });
    }
  });

  // Substitute assignment routes
  app.get("/api/substitutes/assignments", async (req, res) => {
    try {
      const assignments = await storage.getSubstituteAssignments();
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch substitute assignments", error: error.message });
    }
  });

  app.get("/api/substitutes/available", async (req, res) => {
    try {
      const substitutes = await storage.getAvailableSubstitutes();
      res.json(substitutes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch available substitutes", error: error.message });
    }
  });

  // Time card routes
  app.get("/api/time-cards", async (req, res) => {
    try {
      const timeCards = await storage.getTimeCards();
      res.json(timeCards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time cards", error: error.message });
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
      res.status(500).json({ message: "Failed to fetch time card", error: error.message });
    }
  });

  app.post("/api/time-cards", async (req, res) => {
    try {
      const data = insertTimeCardSchema.parse(req.body);
      const timeCard = await storage.createTimeCard(data);
      res.status(201).json(timeCard);
    } catch (error) {
      res.status(400).json({ message: "Failed to create time card", error: error.message });
    }
  });

  app.put("/api/time-cards/:id", async (req, res) => {
    try {
      const data = insertTimeCardSchema.partial().parse(req.body);
      const timeCard = await storage.updateTimeCard(parseInt(req.params.id), data);
      res.json(timeCard);
    } catch (error) {
      res.status(400).json({ message: "Failed to update time card", error: error.message });
    }
  });

  app.delete("/api/time-cards/:id", async (req, res) => {
    try {
      await storage.deleteTimeCard(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete time card", error: error.message });
    }
  });

  app.get("/api/time-cards/employee/:id", async (req, res) => {
    try {
      const timeCards = await storage.getTimeCardsByEmployee(parseInt(req.params.id));
      res.json(timeCards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee time cards", error: error.message });
    }
  });

  app.get("/api/time-cards/pending", async (req, res) => {
    try {
      const timeCards = await storage.getPendingTimeCards();
      res.json(timeCards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending time cards", error: error.message });
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
      res.status(500).json({ message: "Failed to fetch time cards by date range", error: error.message });
    }
  });

  app.get("/api/time-cards/approval-stage/:stage", async (req, res) => {
    try {
      const timeCards = await storage.getTimeCardsByApprovalStage(req.params.stage);
      res.json(timeCards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time cards by approval stage", error: error.message });
    }
  });

  app.post("/api/time-cards/:id/submit", async (req, res) => {
    try {
      const { submittedBy } = req.body;
      const timeCard = await storage.submitTimeCardForApproval(parseInt(req.params.id), submittedBy);
      res.json(timeCard);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit time card for approval", error: error.message });
    }
  });

  app.post("/api/time-cards/:id/approve-employee", async (req, res) => {
    try {
      const { employeeId, notes } = req.body;
      const timeCard = await storage.approveTimeCardByEmployee(parseInt(req.params.id), employeeId, notes);
      res.json(timeCard);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve time card by employee", error: error.message });
    }
  });

  app.post("/api/time-cards/:id/approve-admin", async (req, res) => {
    try {
      const { adminId, notes } = req.body;
      const timeCard = await storage.approveTimeCardByAdmin(parseInt(req.params.id), adminId, notes);
      res.json(timeCard);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve time card by admin", error: error.message });
    }
  });

  app.post("/api/time-cards/:id/process-payroll", async (req, res) => {
    try {
      const { payrollId, notes } = req.body;
      const timeCard = await storage.processTimeCardByPayroll(parseInt(req.params.id), payrollId, notes);
      res.json(timeCard);
    } catch (error) {
      res.status(500).json({ message: "Failed to process time card by payroll", error: error.message });
    }
  });

  app.post("/api/time-cards/:id/reject", async (req, res) => {
    try {
      const { rejectedBy, notes } = req.body;
      const timeCard = await storage.rejectTimeCard(parseInt(req.params.id), rejectedBy, notes);
      res.json(timeCard);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject time card", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
