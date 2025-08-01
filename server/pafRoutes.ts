import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { requireDistrictAuth } from "./districtAuth";
import multer from "multer";
import path from "path";
import fs from "fs";

// Role-based middleware for PAF routes
const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userRole = user.role;
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }

      (req as any).currentUser = { id: user.id, role: userRole };
      next();
    } catch (error) {
      console.error("Role authorization error:", error);
      res.status(500).json({ message: "Authorization error" });
    }
  };
};

// Authentication middleware
const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let sessionUser = (req as any).session?.user;
    
    if (!sessionUser) {
      const userId = "demo_user";
      let user = await storage.getUser(userId);
      if (!user) {
        user = await storage.upsertUser({
          id: userId,
          role: "hr",
          email: "demo@example.com",
          firstName: "Demo",
          lastName: "User"
        });
      }
      sessionUser = user;
    }
    
    const userId = typeof sessionUser === 'string' ? sessionUser : sessionUser.id;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ message: "Authentication error" });
  }
};

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads", "paf-templates");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export function registerPafRoutes(app: Express) {
  // Get all PAF templates for a district
  app.get("/api/paf/templates", isAuthenticated, requireRole(['admin', 'hr', 'payroll']), async (req: any, res) => {
    try {
      const districtId = 1; // For now, hardcoded to district 1
      const templates = await storage.getPafTemplates(districtId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching PAF templates:", error);
      res.status(500).json({ error: "Failed to fetch PAF templates" });
    }
  });

  // Upload and create new PAF template
  app.post("/api/paf/templates", isAuthenticated, requireRole(['admin', 'hr']), upload.single("pdfFile"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "PDF file is required" });
      }

      const { name, description, formFields } = req.body;
      const districtId = 1; // For now, hardcoded to district 1
      const userId = "demo_user";

      // Create file URL (in production, this would be a cloud storage URL)
      const fileUrl = `/uploads/paf-templates/${req.file.filename}`;

      const template = await storage.createPafTemplate({
        districtId,
        name,
        description,
        fileUrl,
        formFields: JSON.parse(formFields || "[]"),
        createdBy: userId,
        isActive: true,
        isDefault: false,
      });

      res.json(template);
    } catch (error) {
      console.error("Error creating PAF template:", error);
      res.status(500).json({ error: "Failed to create PAF template" });
    }
  });

  // Update PAF template
  app.put("/api/paf/templates/:id", isAuthenticated, requireRole(['admin', 'hr']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, description, formFields, isActive, isDefault } = req.body;
      const userId = req.user.id;

      const template = await storage.updatePafTemplate(parseInt(id), {
        name,
        description,
        formFields,
        isActive,
        isDefault,
        updatedBy: userId,
      });

      res.json(template);
    } catch (error) {
      console.error("Error updating PAF template:", error);
      res.status(500).json({ error: "Failed to update PAF template" });
    }
  });

  // Delete PAF template
  app.delete("/api/paf/templates/:id", isAuthenticated, requireRole(['admin', 'hr']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePafTemplate(parseInt(id));
      
      if (success) {
        res.json({ message: "Template deleted successfully" });
      } else {
        res.status(404).json({ error: "Template not found" });
      }
    } catch (error) {
      console.error("Error deleting PAF template:", error);
      res.status(500).json({ error: "Failed to delete PAF template" });
    }
  });

  // Get all PAF submissions
  app.get("/api/paf/submissions", isAuthenticated, requireRole(['admin', 'hr', 'payroll', 'employee']), async (req: any, res) => {
    try {
      const districtId = req.user.districtId;
      const { userId } = req.query;
      
      // If user has employee role, only show their own submissions
      const filterUserId = req.user.role === "employee" ? req.user.id : userId;
      
      const submissions = await storage.getPafSubmissions(districtId, filterUserId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching PAF submissions:", error);
      res.status(500).json({ error: "Failed to fetch PAF submissions" });
    }
  });

  // Get specific PAF submission
  app.get("/api/paf/submissions/:id", isAuthenticated, requireRole(['admin', 'hr', 'payroll', 'employee']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const submission = await storage.getPafSubmission(parseInt(id));
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Check access permissions
      if (req.user.role === "employee" && submission.submittedBy !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(submission);
    } catch (error) {
      console.error("Error fetching PAF submission:", error);
      res.status(500).json({ error: "Failed to fetch PAF submission" });
    }
  });

  // Create new PAF submission
  app.post("/api/paf/submissions", isAuthenticated, requireRole(['admin', 'hr', 'payroll', 'employee']), async (req: any, res) => {
    try {
      const districtId = req.user.districtId;
      const userId = req.user.id;
      const submissionData = {
        ...req.body,
        districtId,
        submittedBy: userId,
        status: "draft",
      };

      const submission = await storage.createPafSubmission(submissionData);

      // Create initial approval workflow steps
      const approvalSteps = [
        {
          submissionId: submission.id,
          step: 1,
          approverRole: "requesting_admin",
          status: "pending",
        },
        {
          submissionId: submission.id,
          step: 2,
          approverRole: "business_official",
          status: "pending",
        },
        {
          submissionId: submission.id,
          step: 3,
          approverRole: "superintendent",
          status: "pending",
        },
      ];

      for (const step of approvalSteps) {
        await storage.createPafApprovalStep(step);
      }

      res.json(submission);
    } catch (error) {
      console.error("Error creating PAF submission:", error);
      res.status(500).json({ error: "Failed to create PAF submission" });
    }
  });

  // Update PAF submission
  app.put("/api/paf/submissions/:id", isAuthenticated, requireRole(['admin', 'hr', 'payroll', 'employee']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const submissionId = parseInt(id);
      
      // Get existing submission to check permissions
      const existingSubmission = await storage.getPafSubmission(submissionId);
      if (!existingSubmission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Check permissions
      if (req.user.role === "employee" && existingSubmission.submittedBy !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const submission = await storage.updatePafSubmission(submissionId, req.body);
      res.json(submission);
    } catch (error) {
      console.error("Error updating PAF submission:", error);
      res.status(500).json({ error: "Failed to update PAF submission" });
    }
  });

  // Submit PAF for approval (change status from draft to submitted)
  app.post("/api/paf/submissions/:id/submit", requireRole(['admin', 'hr', 'payroll', 'employee']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const submissionId = parseInt(id);
      
      const submission = await storage.getPafSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      if (submission.submittedBy !== req.user.id && req.user.role === "employee") {
        return res.status(403).json({ error: "Access denied" });
      }

      const updatedSubmission = await storage.updatePafSubmission(submissionId, {
        status: "submitted",
      });

      res.json(updatedSubmission);
    } catch (error) {
      console.error("Error submitting PAF:", error);
      res.status(500).json({ error: "Failed to submit PAF" });
    }
  });

  // Approve/reject PAF step
  app.post("/api/paf/submissions/:id/approve", requireRole(['admin', 'hr']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { step, action, signature, comments } = req.body; // action: 'approve' or 'reject'
      const submissionId = parseInt(id);
      const userId = req.user.id;

      // Get approval steps for this submission
      const approvalSteps = await storage.getPafApprovalSteps(submissionId);
      const currentStep = approvalSteps.find(s => s.step === step);

      if (!currentStep) {
        return res.status(404).json({ error: "Approval step not found" });
      }

      // Update the approval step
      await storage.updatePafApprovalStep(currentStep.id, {
        approverUserId: userId,
        status: action === "approve" ? "approved" : "rejected",
        signedAt: new Date(),
        signature,
        comments,
      });

      // Update submission status based on approval progress
      let submissionStatus = "under_review";
      if (action === "reject") {
        submissionStatus = "denied";
      } else if (step === 3) { // Final approval
        submissionStatus = "approved";
      }

      await storage.updatePafSubmission(submissionId, {
        status: submissionStatus,
        [`${currentStep.approverRole}Signature`]: {
          signedBy: userId,
          signedAt: new Date(),
          signature,
        },
      });

      res.json({ message: `PAF ${action}d successfully` });
    } catch (error) {
      console.error("Error processing PAF approval:", error);
      res.status(500).json({ error: "Failed to process PAF approval" });
    }
  });

  // Get approval steps for a submission
  app.get("/api/paf/submissions/:id/approvals", requireRole(['admin', 'hr', 'payroll', 'employee']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const submissionId = parseInt(id);
      
      const approvalSteps = await storage.getPafApprovalSteps(submissionId);
      res.json(approvalSteps);
    } catch (error) {
      console.error("Error fetching approval steps:", error);
      res.status(500).json({ error: "Failed to fetch approval steps" });
    }
  });

  // Serve uploaded PDF files
  app.get("/uploads/paf-templates/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  // System owner routes for PAF management across all districts
  app.get("/api/system-owner/paf/overview", requireRole(['system_owner']), async (req: any, res) => {
    try {
      // Get PAF statistics across all districts
      const allDistricts = await storage.getAllDistricts();
      const overview = [];

      for (const district of allDistricts) {
        const templates = await storage.getPafTemplates(district.id);
        const submissions = await storage.getPafSubmissions(district.id);
        
        overview.push({
          districtId: district.id,
          districtName: district.name,
          templatesCount: templates.length,
          submissionsCount: submissions.length,
          pendingSubmissions: submissions.filter(s => s.status === "submitted" || s.status === "under_review").length,
          approvedSubmissions: submissions.filter(s => s.status === "approved").length,
        });
      }

      res.json(overview);
    } catch (error) {
      console.error("Error fetching PAF overview:", error);
      res.status(500).json({ error: "Failed to fetch PAF overview" });
    }
  });
}