import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFDropdown } from "pdf-lib";

// Authentication updated to use simple local middleware

// Authentication middleware that matches main system
const checkAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is logged in via session
    let sessionUser = (req as any).session?.user;
    
    // If no session user, fall back to demo mode for development
    if (!sessionUser) {
      // For demo, we'll simulate a logged-in user
      const userId = "demo_user";
      
      // Get or create demo user
      let user = await storage.getUser(userId);
      if (!user) {
        user = await storage.upsertUser({
          id: userId,
          role: "payroll", // Keep existing payroll role
          email: "demo@example.com",
          firstName: "Demo",
          lastName: "User"
        });
      }
      
      sessionUser = user;
    }
    
    // Get the current user from the database to ensure fresh data
    const userId = typeof sessionUser === 'string' ? sessionUser : sessionUser.id;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Update the request with the current user data
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ message: "Authentication error" });
  }
};

// Simple role check
const checkRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !allowedRoles.includes(user.role)) {
      console.log(`[PAF] Role check failed. User role: ${user?.role || 'none'}, Required: ${allowedRoles.join(', ')}`);
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }
    console.log(`[PAF] Role check passed. User role: ${user.role}`);
    next();
  };
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
  // Load pre-built PAF template
  app.post("/api/paf/templates/load-prebuilt", checkAuth, checkRole(['admin', 'hr', 'payroll']), async (req: any, res) => {
    try {
      const districtId = 1; // For now, hardcoded to district 1
      const userId = req.user.id;
      const templateName = "Standard Personnel Action Form";
      const templateDescription = "Official Personnel Action Form template with all required sections including position information, advertisement status, employee information, work shift details, budget codes, and authorization signatures.";
      
      // Create a form template using the uploaded PDF
      const formFields = [
        { name: "pafType", type: "select", required: true, options: ["New Position", "Vacant Position", "Change Existing Position"] },
        { name: "positionType", type: "select", required: true, options: ["Certificated", "Classified", "Management/Confidential", "Administrator", "Coach or Extra Duty"] },
        { name: "positionCategory", type: "select", required: true, options: ["Prob/Perm", "Temporary", "Short-Term", "Categorical", "Summer Program"] },
        { name: "positionTitle", type: "text", required: true },
        { name: "workSite", type: "text", required: true },
        { name: "fte", type: "number", required: true },
        { name: "gradeLevel", type: "text", required: false },
        { name: "subjectArea", type: "text", required: false },
        { name: "extraDutyType", type: "text", required: false },
        { name: "advertise", type: "select", required: true, options: ["Yes", "No"] },
        { name: "advertisementType", type: "select", required: true, options: ["In-House Only", "Out-of-House Only", "Both"] },
        { name: "employeeName", type: "text", required: false },
        { name: "effectiveDate", type: "date", required: false },
        { name: "reason", type: "select", required: false, options: ["Resignation", "Retirement", "Leave of Absence", "Transfer"] },
        { name: "totalHoursDay", type: "number", required: true },
        { name: "totalDaysWeek", type: "number", required: true },
        { name: "totalDaysYear", type: "number", required: true },
        { name: "budgetCode", type: "text", required: true },
        { name: "justification", type: "textarea", required: false }
      ];

      const template = await storage.createPafTemplate({
        districtId,
        name: templateName,
        description: templateDescription,
        fileUrl: "/attached_assets/paf-templates/personnel-action-form-template.pdf",
        formFields,
        isActive: true,
        isDefault: true,
        createdBy: userId,
        updatedBy: userId,
      });

      res.json(template);
    } catch (error) {
      console.error("Error loading pre-built PAF template:", error);
      res.status(500).json({ error: "Failed to load pre-built PAF template" });
    }
  });

  // Get all PAF templates for a district
  app.get("/api/paf/templates", checkAuth, checkRole(['admin', 'hr', 'payroll']), async (req: any, res) => {
    try {
      const districtId = 1; // For now, hardcoded to district 1
      const templates = await storage.getPafTemplates(districtId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching PAF templates:", error);
      res.status(500).json({ error: "Failed to fetch PAF templates" });
    }
  });

  // Make PDF fillable by adding form fields
  app.post("/api/paf/templates/:id/make-fillable", checkAuth, checkRole(['admin', 'hr', 'payroll']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getPafTemplate(parseInt(id));
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const filePath = path.join(process.cwd(), template.fileUrl);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "PDF file not found" });
      }

      // Read and load the original PDF
      const existingPdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();
      
      // Check if already has form fields
      const existingFields = form.getFields();
      if (existingFields.length > 0) {
        return res.json({ 
          message: "PDF already has form fields", 
          fieldCount: existingFields.length,
          fieldNames: existingFields.map(f => f.getName())
        });
      }

      // Add form fields to make it fillable
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      // Add fillable form fields at strategic positions
      // Employee Information Section
      const textFieldOptions = { x: 150, width: 200, height: 20 };
      const signatureFieldOptions = { x: 150, width: 250, height: 40 };
      
      // Employee Information Fields
      form.createTextField('Employee_Name').addToPage(firstPage, { ...textFieldOptions, y: height - 150 });
      form.createTextField('Employee_ID').addToPage(firstPage, { ...textFieldOptions, y: height - 180 });
      form.createTextField('Department').addToPage(firstPage, { ...textFieldOptions, y: height - 210 });
      form.createTextField('Current_Position').addToPage(firstPage, { ...textFieldOptions, y: height - 240 });
      form.createTextField('New_Position').addToPage(firstPage, { ...textFieldOptions, y: height - 270 });
      form.createTextField('Effective_Date').addToPage(firstPage, { ...textFieldOptions, y: height - 300 });
      form.createTextField('Action_Type').addToPage(firstPage, { ...textFieldOptions, y: height - 330 });
      form.createTextField('Reason').addToPage(firstPage, { ...textFieldOptions, y: height - 360 });
      form.createTextField('Current_Salary').addToPage(firstPage, { ...textFieldOptions, y: height - 390 });
      form.createTextField('New_Salary').addToPage(firstPage, { ...textFieldOptions, y: height - 420 });
      
      // Justification and Details
      form.createTextField('Justification').addToPage(firstPage, { x: 150, width: 300, height: 60, y: height - 500 });
      
      // Department Approval Signatures Section
      const signatureY = height - 600;
      
      // HR Department Approval
      form.createTextField('HR_Signature').addToPage(firstPage, { ...signatureFieldOptions, y: signatureY });
      form.createTextField('HR_Name').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 30 });
      form.createTextField('HR_Date').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 60 });
      
      // Finance Department Approval
      form.createTextField('Finance_Signature').addToPage(firstPage, { ...signatureFieldOptions, y: signatureY - 100 });
      form.createTextField('Finance_Name').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 130 });
      form.createTextField('Finance_Date').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 160 });
      
      // Supervisor Approval
      form.createTextField('Supervisor_Signature').addToPage(firstPage, { ...signatureFieldOptions, y: signatureY - 200 });
      form.createTextField('Supervisor_Name').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 230 });
      form.createTextField('Supervisor_Date').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 260 });
      
      // Administrator Final Approval
      form.createTextField('Admin_Signature').addToPage(firstPage, { ...signatureFieldOptions, y: signatureY - 300 });
      form.createTextField('Admin_Name').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 330 });
      form.createTextField('Admin_Date').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 360 });

      // Save the fillable PDF
      const fillablePdfBytes = await pdfDoc.save();
      
      // Create a backup of original and save fillable version
      const backupPath = filePath.replace('.pdf', '_original.pdf');
      fs.copyFileSync(filePath, backupPath);
      
      // Overwrite with fillable version
      fs.writeFileSync(filePath, fillablePdfBytes);

      const newFields = form.getFields();
      res.json({ 
        message: "PDF made fillable successfully", 
        fieldCount: newFields.length,
        fieldNames: newFields.map(f => f.getName()),
        backupCreated: backupPath
      });

    } catch (error) {
      console.error("Error making PDF fillable:", error);
      res.status(500).json({ error: "Failed to make PDF fillable" });
    }
  });

  // Check PDF fillability status
  app.get("/api/paf/templates/:id/fillable-status", checkAuth, checkRole(['admin', 'hr', 'payroll', 'employee']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getPafTemplate(parseInt(id));
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const filePath = path.join(process.cwd(), template.fileUrl);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "PDF file not found" });
      }

      const existingPdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      res.json({
        isFillable: fields.length > 0,
        fieldCount: fields.length,
        fieldNames: fields.map(f => f.getName())
      });

    } catch (error) {
      console.error("Error checking PDF fillability:", error);
      res.status(500).json({ error: "Failed to check PDF fillability" });
    }
  });

  // Upload and create new PAF template
  app.post("/api/paf/templates", checkAuth, checkRole(['admin', 'hr']), upload.single("pdfFile"), async (req: any, res) => {
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

      // Automatically make the uploaded PDF fillable
      try {
        const filePath = path.join(process.cwd(), fileUrl);
        const existingPdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const form = pdfDoc.getForm();
        
        // Check if it already has form fields
        const existingFields = form.getFields();
        if (existingFields.length === 0) {
          // Add comprehensive form fields including e-signature fields
          const pages = pdfDoc.getPages();
          const firstPage = pages[0];
          const { width, height } = firstPage.getSize();

          const textFieldOptions = { x: 150, width: 200, height: 20 };
          const signatureFieldOptions = { x: 150, width: 250, height: 40 };
          
          // Employee Information Fields
          form.createTextField('Employee_Name').addToPage(firstPage, { ...textFieldOptions, y: height - 150 });
          form.createTextField('Employee_ID').addToPage(firstPage, { ...textFieldOptions, y: height - 180 });
          form.createTextField('Department').addToPage(firstPage, { ...textFieldOptions, y: height - 210 });
          form.createTextField('Current_Position').addToPage(firstPage, { ...textFieldOptions, y: height - 240 });
          form.createTextField('New_Position').addToPage(firstPage, { ...textFieldOptions, y: height - 270 });
          form.createTextField('Effective_Date').addToPage(firstPage, { ...textFieldOptions, y: height - 300 });
          form.createTextField('Action_Type').addToPage(firstPage, { ...textFieldOptions, y: height - 330 });
          form.createTextField('Reason').addToPage(firstPage, { ...textFieldOptions, y: height - 360 });
          form.createTextField('Current_Salary').addToPage(firstPage, { ...textFieldOptions, y: height - 390 });
          form.createTextField('New_Salary').addToPage(firstPage, { ...textFieldOptions, y: height - 420 });
          
          // Justification and Details
          form.createTextField('Justification').addToPage(firstPage, { x: 150, width: 300, height: 60, y: height - 500 });
          
          // Department Approval Signatures Section
          const signatureY = height - 600;
          
          // HR Department Approval
          form.createTextField('HR_Signature').addToPage(firstPage, { ...signatureFieldOptions, y: signatureY });
          form.createTextField('HR_Name').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 30 });
          form.createTextField('HR_Date').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 60 });
          
          // Finance Department Approval
          form.createTextField('Finance_Signature').addToPage(firstPage, { ...signatureFieldOptions, y: signatureY - 100 });
          form.createTextField('Finance_Name').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 130 });
          form.createTextField('Finance_Date').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 160 });
          
          // Supervisor Approval
          form.createTextField('Supervisor_Signature').addToPage(firstPage, { ...signatureFieldOptions, y: signatureY - 200 });
          form.createTextField('Supervisor_Name').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 230 });
          form.createTextField('Supervisor_Date').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 260 });
          
          // Administrator Final Approval
          form.createTextField('Admin_Signature').addToPage(firstPage, { ...signatureFieldOptions, y: signatureY - 300 });
          form.createTextField('Admin_Name').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 330 });
          form.createTextField('Admin_Date').addToPage(firstPage, { ...textFieldOptions, y: signatureY - 360 });

          // Save the fillable PDF
          const fillablePdfBytes = await pdfDoc.save();
          
          // Create backup and save fillable version
          const backupPath = filePath.replace('.pdf', '_original.pdf');
          fs.copyFileSync(filePath, backupPath);
          fs.writeFileSync(filePath, fillablePdfBytes);
          
          console.log(`[PAF] Auto-converted uploaded PDF to fillable format with ${form.getFields().length} fields`);
        }
      } catch (error) {
        console.error("[PAF] Failed to auto-convert PDF to fillable:", error);
        // Continue anyway - the template is still created
      }

      res.json(template);
    } catch (error) {
      console.error("Error creating PAF template:", error);
      res.status(500).json({ error: "Failed to create PAF template" });
    }
  });

  // Update PAF template
  app.put("/api/paf/templates/:id", checkAuth, checkRole(['admin', 'hr']), async (req: any, res) => {
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
  app.delete("/api/paf/templates/:id", checkAuth, checkRole(['admin', 'hr']), async (req: any, res) => {
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

  // Upload completed PAF
  app.post("/api/paf/submissions/upload", checkAuth, checkRole(['admin', 'hr', 'payroll']), upload.single('pdfFile'), async (req: any, res) => {
    try {
      const { templateId, employeeName, positionTitle, effectiveDate, reason } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "PDF file is required" });
      }

      if (!templateId || !employeeName || !effectiveDate) {
        return res.status(400).json({ error: "Template ID, employee name, and effective date are required" });
      }

      // Save the uploaded file to a permanent location
      const submissionId = Date.now(); // Simple ID for now
      const fileName = `paf_submission_${submissionId}.pdf`;
      const permanentPath = path.join(process.cwd(), 'uploads', 'pafs', fileName);
      
      // Ensure directory exists
      fs.mkdirSync(path.dirname(permanentPath), { recursive: true });
      
      // Move file to permanent location
      fs.copyFileSync(file.path, permanentPath);
      fs.unlinkSync(file.path); // Clean up temp file

      // Create submission record
      const submission = await storage.createPafSubmission({
        templateId: parseInt(templateId),
        employeeName,
        positionTitle: positionTitle || "",
        effectiveDate,
        reason: reason || "",
        status: 'submitted',
        submittedBy: req.user.id,
        formData: {
          uploadedFile: `/uploads/pafs/${fileName}`,
          isUploadedPdf: true
        }
      });

      res.json({ success: true, submissionId: submission.id });

    } catch (error) {
      console.error("Error uploading PAF:", error);
      res.status(500).json({ error: "Failed to upload PAF" });
    }
  });

  // Get all PAF submissions
  app.get("/api/paf/submissions", checkAuth, checkRole(['admin', 'hr', 'payroll', 'employee']), async (req: any, res) => {
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
  app.get("/api/paf/submissions/:id", checkAuth, checkRole(['admin', 'hr', 'payroll', 'employee']), async (req: any, res) => {
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
  app.post("/api/paf/submissions", checkAuth, checkRole(['admin', 'hr', 'payroll', 'employee']), async (req: any, res) => {
    try {
      const districtId = req.user.districtId;
      const userId = req.user.id;
      
      // Clean up the form data - convert empty strings to null for optional integer fields
      const cleanedData = { ...req.body };
      
      // Convert empty string employeeId to null
      if (cleanedData.employeeId === "") {
        cleanedData.employeeId = null;
      }
      
      // Convert date strings to proper format
      if (cleanedData.effectiveDate) {
        cleanedData.effectiveDate = new Date(cleanedData.effectiveDate);
      }
      
      const submissionData = {
        ...cleanedData,
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

  // Get fillable PDF template (opens template directly for filling)
  app.get("/api/paf/templates/:id/fillable-pdf", checkAuth, checkRole(['admin', 'hr', 'payroll', 'employee']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getPafTemplate(parseInt(id));
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Serve the original PDF template (fillable)
      const templatePath = path.join(process.cwd(), template.fileUrl);
      const templateBuffer = fs.readFileSync(templatePath);

      // Set response headers for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="PAF_Template_${template.name}.pdf"`);
      res.send(templateBuffer);

    } catch (error) {
      console.error("Error serving fillable PDF:", error);
      res.status(500).json({ error: "Failed to serve fillable PDF" });
    }
  });

  // Generate filled PDF for PAF submission
  app.get("/api/paf/submissions/:id/pdf", checkAuth, checkRole(['admin', 'hr', 'payroll', 'employee']), async (req: any, res) => {
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

      // Get the template
      const template = await storage.getPafTemplate(submission.templateId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Generate filled PDF
      const filledPdfBuffer = await generateFilledPdf(template, submission);

      // Set response headers for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="PAF_${submission.employeeName || 'Submission'}_${submission.id}.pdf"`);
      res.send(filledPdfBuffer);

    } catch (error) {
      console.error("Error generating filled PDF:", error);
      res.status(500).json({ error: "Failed to generate filled PDF" });
    }
  });

  // Update PAF submission
  app.put("/api/paf/submissions/:id", checkAuth, checkRole(['admin', 'hr', 'payroll', 'employee']), async (req: any, res) => {
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
  app.post("/api/paf/submissions/:id/submit", checkAuth, checkRole(['admin', 'hr', 'payroll', 'employee']), async (req: any, res) => {
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
  app.post("/api/paf/submissions/:id/approve", checkAuth, checkRole(['admin', 'hr']), async (req: any, res) => {
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
  app.get("/api/paf/submissions/:id/approvals", checkAuth, checkRole(['admin', 'hr', 'payroll', 'employee']), async (req: any, res) => {
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
  app.get("/api/system-owner/paf/overview", checkAuth, checkRole(['system_owner']), async (req: any, res) => {
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

// Function to generate a filled PDF from template and submission data
async function generateFilledPdf(template: any, submission: any) {
  try {
    const templatePath = path.join(process.cwd(), template.fileUrl);
    const templateBuffer = fs.readFileSync(templatePath);
    
    // Load the PDF template
    const pdfDoc = await PDFDocument.load(templateBuffer);
    const form = pdfDoc.getForm();
    
    // Get form data from submission
    const formData = submission.formData || {};
    
    // Field mappings from form data to PDF field names
    const fieldMappings = {
      // Employee Information
      'employee_name': submission.employeeName || formData.employeeName || '',
      'employee_id': formData.employeeId || '',
      'department': formData.department || '',
      'current_position': formData.currentPosition || '',
      'new_position': formData.newPosition || '',
      'pay_grade': formData.payGrade || '',
      'work_location': formData.workLocation || '',
      
      // Action Details
      'action_type': formData.actionType || '',
      'effective_date': submission.effectiveDate ? new Date(submission.effectiveDate).toLocaleDateString() : '',
      'reason': submission.reason || '',
      'description': formData.description || '',
      
      // Salary Information
      'current_salary': formData.currentSalary || '',
      'new_salary': formData.newSalary || '',
      'budget_account': formData.budgetAccount || '',
      'funding_source': formData.fundingSource || '',
      
      // Additional Information
      'supervisor_name': formData.supervisorName || '',
      'hr_notes': formData.hrNotes || '',
      'attachments': formData.attachments || '',
      
      // Status and dates
      'status': submission.status || '',
      'submission_date': new Date(submission.createdAt).toLocaleDateString(),
      'submitted_by': submission.submittedBy || ''
    };
    
    // Fill in the form fields
    const fields = form.getFields();
    
    for (const field of fields) {
      const fieldName = field.getName();
      const mappedValue = fieldMappings[fieldName as keyof typeof fieldMappings];
      
      try {
        if (field instanceof PDFTextField) {
          if (mappedValue) {
            field.setText(String(mappedValue));
          }
        } else if (field instanceof PDFCheckBox) {
          // Handle checkbox fields - you can customize this logic
          if (mappedValue && (mappedValue === 'true' || mappedValue === '1' || mappedValue === 'yes')) {
            field.check();
          }
        } else if (field instanceof PDFDropdown) {
          if (mappedValue) {
            const options = field.getOptions();
            if (options.includes(String(mappedValue))) {
              field.select(String(mappedValue));
            }
          }
        }
      } catch (fieldError: any) {
        console.warn(`Could not fill field ${fieldName}:`, fieldError.message);
      }
    }
    
    // Generate the filled PDF buffer
    const filledPdfBytes = await pdfDoc.save();
    return Buffer.from(filledPdfBytes);
    
  } catch (error) {
    console.error("Error generating filled PDF:", error);
    throw error;
  }
}