import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { 
  asyncErrorHandler, 
  handleDatabaseError, 
  handlePayrollError,
  handleAPIError,
  handleCriticalError 
} from "./errorHandler";
import { systemHealthMonitor } from "./monitoring/systemHealth";
import { emailAlerts } from "./emailAlerts";
import { dataRetentionMonitor } from "./monitoring/dataRetention";
import { storageMonitor } from "./monitoring/storageMonitor";
import { dataArchiver } from "./monitoring/dataArchiver";
import { registerSecurityRoutes } from "./security/securityRoutes";
import { initSupportTables } from "./initSupportTables";
import { SecurityMonitor, SecurityAudit, SecurityEventType, SecuritySeverity, IntrusionDetection } from "./security/monitoring";
import { corsOptions } from "./security/middleware";
import privacyRoutes from "./privacyRoutes";

import cors from "cors";
import multer from 'multer';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { sql } from 'drizzle-orm';
import { db } from './db';
import * as schema from '@shared/schema';
import { 
  insertDropdownOptionSchema,
  insertSignatureRequestSchema,
  insertSignatureTemplateSchema 
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateOnboardingChecklist } from './openai';
import districtRoutes from './districtRoutes';
import { tenantMiddleware, requireDistrict, withDistrictFilter } from './tenantMiddleware';
import { getDistrictStorage } from './multiTenantStorage';
import { getDistrictAuth } from './districtAuth';
import { registerMultiTenantRoutes } from './multiTenantRoutes';
import { registerSystemOwnerRoutes } from './systemOwnerRoutes';
import { registerPafRoutes } from './pafRoutes';

// Welcome letter generation function
function generateWelcomeLetter(employee: any): string {
  const currentDate = new Date().toLocaleDateString();
  const employeeType = employee.employeeType || 'team member';
  
  let specificContent = '';
  if (employee.employeeType === 'certificated') {
    specificContent = `As a certificated staff member, you will be joining our dedicated team of educators. Your teaching expertise and commitment to student success are valued assets to our district. You will receive additional information about curriculum resources, professional development opportunities, and classroom assignment details in the coming days.`;
  } else if (employee.employeeType === 'classified') {
    specificContent = `As a classified staff member, you play an essential role in supporting our educational mission. Your skills and dedication help create an environment where students can thrive. You will receive specific information about your department's procedures, safety protocols, and professional development opportunities.`;
  } else {
    specificContent = `We appreciate your willingness to join our school district team. Your contributions will help us maintain our commitment to educational excellence and student success.`;
  }

  return `Dear ${employee.firstName} ${employee.lastName},

Welcome to our school district family! We are delighted to have you join our team as a ${employee.position || employeeType} in the ${employee.department || 'district'}.

${specificContent}

Your first day is scheduled for ${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'your designated start date'}. Please report to the main office at 8:00 AM where you will meet with HR staff to complete your onboarding process.

During your first week, you will:
• Complete all required paperwork and documentation
• Attend orientation sessions specific to your role
• Meet your supervisor and team members
• Receive necessary equipment and access credentials
• Review district policies and procedures

Please bring the following items on your first day:
• Government-issued photo ID
• Social Security card
• Completed I-9 form documentation
• Direct deposit information (bank routing and account numbers)
• Emergency contact information

If you have any questions before your start date, please don't hesitate to contact the HR department at [phone number] or [email address].

We look forward to working with you and supporting your success in our district.

Sincerely,

Human Resources Department
${employee.department || 'School District'}

Date: ${currentDate}

---
This welcome letter was automatically generated as part of your onboarding workflow.`;
}

// Configure multer for file uploads
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/personnel-files';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const personnelUpload = multer({ 
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png', 
      'image/tiff',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Authentication middleware - supports both session-based and demo mode
const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
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
          role: "hr", // Demo user has HR role
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

// Role-based access control middleware
const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // For demo purposes, use the simulated user role
      const userRole = user.role;
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }

      // Add user info to request for easy access
      (req as any).currentUser = { id: user.id, role: userRole };
      next();
    } catch (error) {
      console.error("Role authorization error:", error);
      res.status(500).json({ message: "Authorization error" });
    }
  };
};

// Middleware to check if user can only access their own employee record
const requireSelfOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Admin and HR can access all records
    if (user.role === 'admin' || user.role === 'hr') {
      (req as any).currentUser = user;
      return next();
    }

    // Employee can only access their own records
    if (user.role === 'employee') {
      const employee = await storage.getEmployeeByUserId(user.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee record not found" });
      }
      
      // Check if they're trying to access their own record
      const requestedId = parseInt(req.params.id);
      if (requestedId !== employee.id) {
        return res.status(403).json({ message: "Forbidden: Can only access your own records" });
      }
      
      (req as any).currentUser = user;
      (req as any).currentEmployee = employee;
      return next();
    }

    res.status(403).json({ message: "Forbidden: Insufficient permissions" });
  } catch (error) {
    res.status(500).json({ message: "Authorization error", error: (error as Error).message });
  }
};
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
  insertExtraPayCustomFieldSchema,
  insertLetterSchema,
  insertTimecardTemplateSchema,
  insertTimecardTemplateFieldSchema,
  insertDistrictSettingsSchema,
  insertPayPeriodSchema,
} from "@shared/schema";
import { z } from "zod";

// Custom schema for importing employees that handles string dates
const employeeImportSchema = insertEmployeeSchema.extend({
  hireDate: z.union([
    z.string().transform((str) => new Date(str)),
    z.date()
  ])
});
import { 
  processDocument, 
  generateOnboardingChecklist, 
  analyzePayrollAnomalies,
  generateSubstituteRecommendations 
} from "./openai";
import multer from "multer";
import fs from "fs";
import path from "path";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize support and security tables
  await initSupportTables();

  // Add session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'development-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  }));

  // Apply security middleware (temporarily disabled for development)
  app.use(cors(corsOptions));
  // app.use(rateLimiter);
  // app.use(auditLogger);
  // app.use(inputValidation);
  
  // Apply performance middleware (temporarily disabled for development)
  // app.use(monitoring.requestMonitoring());
  // app.use(monitoring.errorMonitoring());
  // app.use(loadBalancer.middleware());
  // app.use(loadBalancer.circuitBreakerMiddleware());
  // app.use(loadBalancer.rateLimitMiddleware());
  // app.use(cdn.middleware());
  // app.use(cdn.preloadCriticalResources());
  // app.use(cdn.securityHeaders());
  
  // Serve uploaded files (before authentication middleware)
  app.use('/uploads', express.static(uploadDir, {
    setHeaders: (res, filePath) => {
      if (path.extname(filePath) === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
      }
    }
  }));

  // Public login endpoint - should be before authentication middleware
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set user in session
      (req as any).session.user = user;
      
      res.json({ 
        message: "Login successful", 
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed", error: (error as Error).message });
    }
  });

  // Employee registration endpoint (for staff self-registration)
  app.post('/api/auth/register-employee', async (req, res) => {
    try {
      const { firstName, lastName, email, password, organizationName, role } = req.body;
      
      if (!firstName || !lastName || !email || !password || !organizationName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Ensure role is employee
      if (role !== 'employee') {
        return res.status(400).json({ message: "Only employee accounts can be created through self-registration" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Generate unique employee ID
      const employeeId = `EMP${Date.now()}`;

      // Create user account with employee role
      const user = await storage.upsertUser({
        id: `emp_${employeeId}`,
        email: email.toLowerCase(),
        firstName,
        lastName,
        role: 'employee',
        passwordHash
      });

      // Create basic employee record
      const employee = await storage.createEmployee({
        userId: user.id,
        employeeId,
        firstName,
        lastName,
        email: email.toLowerCase(),
        department: 'Unassigned',
        position: 'Staff',
        employeeType: 'classified', // Default for self-registered employees
        hireDate: new Date(),
        status: 'pending_verification' // Requires admin approval
      });

      res.json({ 
        message: "Employee account created successfully. Contact your administrator for verification.", 
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      console.error('Employee registration error:', error);
      res.status(500).json({ message: "Registration failed", error: (error as Error).message });
    }
  });

  // HR registration endpoint (for HR staff self-registration)
  app.post('/api/auth/register-hr', async (req, res) => {
    try {
      const { firstName, lastName, email, password, organizationName, role } = req.body;
      
      if (!firstName || !lastName || !email || !password || !organizationName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Ensure role is hr
      if (role !== 'hr') {
        return res.status(400).json({ message: "Only HR accounts can be created through this endpoint" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user account with HR role
      const user = await storage.upsertUser({
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        firstName,
        lastName,
        role: 'hr',
        passwordHash
      });

      res.json({ 
        message: "HR account created successfully. You now have access to employee management and HR functions.", 
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      console.error('HR registration error:', error);
      res.status(500).json({ message: "Registration failed", error: (error as Error).message });
    }
  });

  // Payroll registration endpoint (for payroll staff self-registration)
  app.post('/api/auth/register-payroll', async (req, res) => {
    try {
      const { firstName, lastName, email, password, organizationName, role } = req.body;
      
      if (!firstName || !lastName || !email || !password || !organizationName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Ensure role is payroll
      if (role !== 'payroll') {
        return res.status(400).json({ message: "Only Payroll accounts can be created through this endpoint" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user account with payroll role
      const user = await storage.upsertUser({
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        firstName,
        lastName,
        role: 'payroll',
        passwordHash
      });

      res.json({ 
        message: "Payroll account created successfully. You now have access to payroll and timecard management functions.", 
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      console.error('Payroll registration error:', error);
      res.status(500).json({ message: "Registration failed", error: (error as Error).message });
    }
  });

  // District registration endpoint (for creating new districts with admin accounts)
  app.post('/api/auth/register-district', async (req, res) => {
    try {
      const { firstName, lastName, email, password, districtName } = req.body;
      
      if (!firstName || !lastName || !email || !password || !districtName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user account with admin role
      const user = await storage.upsertUser({
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        firstName,
        lastName,
        role: 'admin',
        passwordHash
      });

      // For now, we'll use the existing storage but in a real multi-tenant setup,
      // you'd create a separate district and associate the user with it
      const districtId = crypto.randomUUID();

      // Set user in session
      (req as any).session.user = user;

      res.json({ 
        message: "District and admin account created successfully", 
        userId: user.id,
        districtId: districtId,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      console.error('District registration error:', error);
      res.status(500).json({ message: "Registration failed", error: (error as Error).message });
    }
  });

  // Logout endpoint
  app.get('/api/auth/logout', (req, res) => {
    try {
      (req as any).session.destroy((err: any) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.redirect('/login'); // Redirect to login page
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Bulk create user accounts for existing employees
  app.post('/api/admin/create-employee-accounts', async (req, res) => {
    try {
      const { defaultPassword = 'TempPassword123!' } = req.body;
      
      // Get all employees that don't have user accounts
      const employees = await storage.getEmployeesWithoutUserAccounts();
      
      if (employees.length === 0) {
        return res.json({ message: "All employees already have user accounts", created: 0 });
      }

      const passwordHash = await bcrypt.hash(defaultPassword, 12);
      
      let createdCount = 0;
      const results = [];
      
      for (const employee of employees) {
        try {
          // Create user account
          const user = await storage.upsertUser({
            id: `emp_${employee.employeeId}`,
            email: employee.email,
            firstName: employee.firstName,
            lastName: employee.lastName,
            role: 'employee',
            passwordHash
          });
          
          // Update employee record with user ID
          await storage.updateEmployeeUserId(employee.id, user.id);
          
          createdCount++;
          results.push({
            employeeId: employee.employeeId,
            email: employee.email,
            name: `${employee.firstName} ${employee.lastName}`,
            status: 'created'
          });
        } catch (error) {
          results.push({
            employeeId: employee.employeeId,
            email: employee.email,
            name: `${employee.firstName} ${employee.lastName}`,
            status: 'failed',
            error: (error as Error).message
          });
        }
      }
      
      res.json({
        message: `Created ${createdCount} user accounts`,
        created: createdCount,
        total: employees.length,
        defaultPassword: defaultPassword,
        results
      });
    } catch (error) {
      console.error('Bulk account creation error:', error);
      res.status(500).json({ message: "Failed to create employee accounts", error: (error as Error).message });
    }
  });

  // Apply authentication middleware to all other API routes
  app.use('/api', isAuthenticated);

  // User profile route
  app.get('/api/auth/user', async (req, res) => {
    try {
      const user = (req as any).user;
      const employee = await storage.getEmployeeByUserId(user.id);
      
      res.json({
        id: user.id,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        employee: employee || null
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user information", error: (error as Error).message });
    }
  });

  // Check if user can switch roles
  app.get('/api/auth/can-switch-roles', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Define authorized users who can switch roles (developers/super admins)
      const authorizedUsers = [
        'demo_user',        // Demo user for testing
        'admin_user',       // Main admin account
        'developer_user',   // Developer account
        // Add more user IDs as needed
      ];
      
      // For development purposes, allow any user to switch roles
      // In production, you'd only allow specific users
      const canSwitch = authorizedUsers.includes(user.id) || process.env.NODE_ENV === 'development';
      
      res.json({ canSwitch, userId: user.id });
    } catch (error) {
      res.status(500).json({ message: "Failed to check role switch permission", error: (error as Error).message });
    }
  });

  // Role switch route for authorized users only
  app.post('/api/auth/switch-role', isAuthenticated, async (req, res) => {
    try {
      const { role } = req.body;
      if (!['employee', 'admin', 'hr', 'payroll'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'employee', 'admin', 'hr', or 'payroll'" });
      }
      
      const user = (req as any).user;
      
      // Define authorized users who can switch roles (developers/super admins)
      const authorizedUsers = [
        'demo_user',        // Demo user for testing
        'admin_user',       // Main admin account
        'developer_user',   // Developer account
        // Add more user IDs as needed
      ];
      
      // For development purposes, allow any user to switch roles
      // In production, you'd only allow specific users
      const canSwitch = authorizedUsers.includes(user.id) || process.env.NODE_ENV === 'development';
      
      if (!canSwitch) {
        return res.status(403).json({ message: "You are not authorized to switch roles" });
      }
      
      const updatedUser = await storage.upsertUser({
        id: user.id,
        role: role
      });
      
      // Update the session user
      (req as any).user = updatedUser;
      
      res.json({ message: `Role switched to ${role}`, user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: "Failed to switch role", error: (error as Error).message });
    }
  });

  // Dashboard routes - admin/hr only
  app.get("/api/dashboard/stats", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats", error: (error as Error).message });
    }
  });

  app.get("/api/dashboard/recent-activity", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const activity = await storage.getRecentActivityLogs();
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent activity", error: (error as Error).message });
    }
  });

  // Employee routes - admin/hr only for full access
  app.get("/api/employees", requireRole(['admin', 'hr']), async (req, res) => {
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

  app.post("/api/employees", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      console.log('Create employee request body:', req.body);
      
      // Transform date fields to proper format
      const employeeData = { ...req.body };
      if (employeeData.hireDate) {
        employeeData.hireDate = new Date(employeeData.hireDate);
      }
      
      console.log('Transformed employee data:', employeeData);
      const validatedData = insertEmployeeSchema.parse(employeeData);
      console.log('Validated employee data:', validatedData);
      
      const employee = await storage.createEmployee(validatedData);
      
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
      console.error('Employee creation error:', error);
      
      // Check for specific database constraint violations
      if (error.code === '23505') {
        if (error.constraint === 'employees_email_unique') {
          return res.status(400).json({ 
            message: "An employee with this email address already exists. Please use a different email address.", 
            error: "Email address already exists" 
          });
        }
        if (error.constraint === 'employees_employee_id_unique') {
          return res.status(400).json({ 
            message: "An employee with this Employee ID already exists. Please use a different Employee ID.", 
            error: "Employee ID already exists" 
          });
        }
      }
      
      res.status(400).json({ message: "Failed to create employee", error: (error as Error).message });
    }
  });

  app.put("/api/employees/:id", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      console.log('Update employee request body:', req.body);
      
      // Transform date fields to proper format
      const employeeData = { ...req.body };
      if (employeeData.hireDate) {
        employeeData.hireDate = new Date(employeeData.hireDate);
      }
      
      // Parse with schema validation
      const validatedData = insertEmployeeSchema.partial().parse(employeeData);
      console.log('Validated employee data:', validatedData);
      
      const employee = await storage.updateEmployee(parseInt(req.params.id), validatedData);
      
      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "update_employee",
        entityType: "employee",
        entityId: employee.id,
        description: `Updated employee ${employee.firstName} ${employee.lastName}`,
      });

      res.json(employee);
    } catch (error) {
      console.error('Employee update error:', error);
      res.status(400).json({ message: "Failed to update employee", error: (error as Error).message });
    }
  });

  app.delete("/api/employees/:id", requireRole(['admin', 'hr']), async (req, res) => {
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
  app.post('/api/employees/import', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { employees } = req.body;
      
      if (!Array.isArray(employees)) {
        return res.status(400).json({ message: "Employees must be an array" });
      }

      // Validate each employee record
      const validatedEmployees = [];
      const errors = [];

      for (let i = 0; i < employees.length; i++) {
        const employeeData = employees[i];
        
        // Validate the data using the import schema that handles string dates
        const validation = employeeImportSchema.safeParse(employeeData);
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

  app.post('/api/employees/bulk-update', requireRole(['admin', 'hr']), async (req, res) => {
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

  app.get('/api/employees/export', requireRole(['admin', 'hr']), async (req, res) => {
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

  // Leave management routes (all authenticated users can view leave types)
  app.get("/api/leave-types", async (req, res) => {
    try {
      const leaveTypes = await storage.getLeaveTypes();
      res.json(leaveTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leave types", error: (error as Error).message });
    }
  });

  // Leave requests import/export routes
  app.get("/api/leave-requests/export", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const leaveRequests = await storage.getLeaveRequests();
      const employees = await storage.getEmployees();
      const leaveTypes = await storage.getLeaveTypes();
      
      // Transform data for CSV export
      const csvData = leaveRequests.map(request => {
        const employee = employees.find(emp => emp.id === request.employeeId);
        const leaveType = leaveTypes.find(type => type.id === request.leaveTypeId);
        const approver = request.approvedBy ? employees.find(emp => emp.id === request.approvedBy) : null;
        
        return {
          id: request.id,
          employeeId: request.employeeId,
          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
          leaveType: leaveType ? leaveType.name : 'Unknown',
          startDate: request.startDate ? new Date(request.startDate).toISOString().split('T')[0] : '',
          endDate: request.endDate ? new Date(request.endDate).toISOString().split('T')[0] : '',
          reason: request.reason || '',
          status: request.status,
          substituteRequired: request.substituteRequired,
          approvedBy: approver ? `${approver.firstName} ${approver.lastName}` : '',
          approvedAt: request.approvedAt ? new Date(request.approvedAt).toISOString().split('T')[0] : '',
          createdAt: request.createdAt ? new Date(request.createdAt).toISOString().split('T')[0] : '',
        };
      });
      
      res.json(csvData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export leave requests", error: (error as Error).message });
    }
  });

  app.post("/api/leave-requests/import", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { data } = req.body;
      const results = {
        success: [] as string[],
        errors: [] as { row: number; error: string }[],
        updated: 0,
        created: 0
      };

      const employees = await storage.getEmployees();
      const leaveTypes = await storage.getLeaveTypes();

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // Find employee by name or ID
          let employee = employees.find(emp => emp.id === parseInt(row.employeeId));
          if (!employee && row.employeeName) {
            const [firstName, lastName] = row.employeeName.split(' ');
            employee = employees.find(emp => emp.firstName === firstName && emp.lastName === lastName);
          }

          if (!employee) {
            results.errors.push({
              row: i + 1,
              error: `Employee not found: ${row.employeeName || row.employeeId}`
            });
            continue;
          }

          // Find leave type
          let leaveType = leaveTypes.find(type => type.id === parseInt(row.leaveTypeId));
          if (!leaveType && row.leaveType) {
            leaveType = leaveTypes.find(type => type.name === row.leaveType);
          }

          if (!leaveType) {
            results.errors.push({
              row: i + 1,
              error: `Leave type not found: ${row.leaveType || row.leaveTypeId}`
            });
            continue;
          }

          // Validate dates
          const startDate = new Date(row.startDate);
          const endDate = new Date(row.endDate);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            results.errors.push({
              row: i + 1,
              error: `Invalid date format. Use YYYY-MM-DD format.`
            });
            continue;
          }

          const leaveRequestData = {
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            startDate: startDate,
            endDate: endDate,
            reason: row.reason || '',
            status: row.status || 'pending',
            substituteRequired: row.substituteRequired === 'true' || row.substituteRequired === true,
          };

          // Check if updating existing request
          if (row.id && row.id !== '') {
            const existingRequest = await storage.getLeaveRequest(parseInt(row.id));
            if (existingRequest) {
              await storage.updateLeaveRequest(parseInt(row.id), leaveRequestData);
              results.updated++;
              results.success.push(`Updated leave request for ${employee.firstName} ${employee.lastName}`);
            } else {
              const newRequest = await storage.createLeaveRequest(leaveRequestData);
              results.created++;
              results.success.push(`Created leave request for ${employee.firstName} ${employee.lastName}`);
            }
          } else {
            const newRequest = await storage.createLeaveRequest(leaveRequestData);
            results.created++;
            results.success.push(`Created leave request for ${employee.firstName} ${employee.lastName}`);
          }

        } catch (error) {
          results.errors.push({
            row: i + 1,
            error: (error as Error).message
          });
        }
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to import leave requests", error: (error as Error).message });
    }
  });

  app.get("/api/leave-requests", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      let leaveRequests: any[] = [];
      
      if (user.role === 'admin' || user.role === 'hr') {
        // Admin and HR can see all leave requests
        leaveRequests = await storage.getLeaveRequests();
      } else {
        // Employees can only see their own leave requests
        const employee = await storage.getEmployeeByUserId(user.id);
        if (employee) {
          leaveRequests = await storage.getLeaveRequestsByEmployee(employee.id);
        }
      }
      
      res.json(leaveRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leave requests", error: (error as Error).message });
    }
  });

  app.get("/api/leave-requests-admin", requireRole(['admin', 'hr']), async (req, res) => {
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

  app.post("/api/leave-requests", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      console.log("Leave request body:", JSON.stringify(req.body, null, 2));
      console.log("User:", user);
      const requestData = insertLeaveRequestSchema.parse(req.body);
      
      // If user is an employee, ensure they can only create requests for themselves
      if (user.role === 'employee') {
        const employee = await storage.getEmployeeByUserId(user.id);
        if (!employee) {
          return res.status(404).json({ message: "Employee record not found" });
        }
        
        // Force the employee ID to match the current user's employee record
        requestData.employeeId = employee.id;
      }
      
      const leaveRequest = await storage.createLeaveRequest(requestData);
      
      // Get leave type information for timecard creation
      const leaveTypes = await storage.getLeaveTypes();
      const leaveType = leaveTypes.find(lt => lt.id === requestData.leaveTypeId);
      
      // Generate preliminary timecard entries for the leave request
      const startDate = new Date(requestData.startDate);
      const endDate = new Date(requestData.endDate);
      const preliminaryTimecards = [];
      
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        // Skip weekends for most leave types
        if (date.getDay() === 0 || date.getDay() === 6) {
          continue;
        }
        
        const timecard = await storage.createTimeCard({
          employeeId: requestData.employeeId,
          date: new Date(date),
          leaveRequestId: leaveRequest.id,
          leaveType: leaveType?.name || 'Leave',
          isPaidLeave: leaveType?.isPaid || false,
          totalHours: "8", // Standard work day as string
          status: 'draft', // Mark as draft until leave is approved
          currentApprovalStage: 'secretary',
          notes: `Preliminary entry for leave request - ${requestData.reason} (Pending approval)`,
          customFieldsData: {
            leave_reason: requestData.reason,
            leave_type: leaveType?.name || 'Leave',
            preliminary_entry: true,
            requires_approval: true,
          },
        });
        
        preliminaryTimecards.push(timecard);
      }
      
      // Auto-assign substitute if required
      if (requestData.substituteRequired) {
        try {
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
        } catch (aiError) {
          // If AI recommendation fails, create a note about it but don't fail the entire request
          console.warn("AI substitute recommendation failed:", aiError);
          // Leave request will still be created without auto-assignment
        }
      }

      await storage.createActivityLog({
        userId: user.id,
        action: "create_leave_request",
        entityType: "leave_request",
        entityId: leaveRequest.id,
        description: `Created leave request for employee ${requestData.employeeId} with ${preliminaryTimecards.length} preliminary timecard entries`,
      });

      res.status(201).json(leaveRequest);
    } catch (error) {
      console.error("Leave request creation error:", error);
      res.status(400).json({ message: "Failed to create leave request", error: (error as Error).message });
    }
  });

  app.post("/api/leave-requests-submit", async (req, res) => {
    try {
      const requestData = insertLeaveRequestSchema.parse(req.body);
      const leaveRequest = await storage.createLeaveRequest(requestData);
      
      // Auto-assign substitute if required
      if (requestData.substituteRequired) {
        try {
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
        } catch (aiError) {
          // If AI recommendation fails, create a note about it but don't fail the entire request
          console.warn("AI substitute recommendation failed:", aiError);
          // Leave request will still be created without auto-assignment
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

  app.post("/api/leave-requests/:id/approve", requireRole(['admin', 'hr', 'secretary']), async (req, res) => {
    try {
      const leaveRequestId = parseInt(req.params.id);
      const leaveRequests = await storage.getLeaveRequests();
      const leaveRequest = leaveRequests.find(lr => lr.id === leaveRequestId);
      
      if (!leaveRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      
      if (leaveRequest.status !== 'pending') {
        return res.status(400).json({ message: "Leave request is not in pending status" });
      }

      // Update leave request status to approved
      const approvedRequest = await storage.updateLeaveRequest(leaveRequestId, {
        status: 'approved',
        approvedBy: req.body.approvedBy || 1, // Default to admin user
        approvedAt: new Date(),
      });

      // Get leave type information
      const leaveTypes = await storage.getLeaveTypes();
      const leaveType = leaveTypes.find(lt => lt.id === leaveRequest.leaveTypeId);
      
      // Find existing preliminary timecards for this leave request
      const existingTimecards = await storage.getTimeCardsByLeaveRequest(leaveRequestId);
      
      if (existingTimecards.length > 0) {
        // Update existing preliminary timecards to approved status
        const updatedTimecards = [];
        for (const timecard of existingTimecards) {
          const updated = await storage.updateTimeCard(timecard.id, {
            status: 'secretary_submitted',
            currentApprovalStage: 'employee',
            notes: `Approved leave request - ${leaveRequest.reason}`,
            customFieldsData: {
              ...timecard.customFieldsData,
              leave_reason: leaveRequest.reason,
              leave_type: leaveType?.name || 'Leave',
              preliminary_entry: false,
              approved: true,
            },
          });
          updatedTimecards.push(updated);
        }
        var timecards = updatedTimecards;
      } else {
        // Generate new timecard entries if none exist (fallback)
        const startDate = new Date(leaveRequest.startDate);
        const endDate = new Date(leaveRequest.endDate);
        const newTimecards = [];
        
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
          // Skip weekends for most leave types
          if (date.getDay() === 0 || date.getDay() === 6) {
            continue;
          }
          
          const timecard = await storage.createTimeCard({
            employeeId: leaveRequest.employeeId,
            date: new Date(date),
            leaveRequestId: leaveRequestId,
            leaveType: leaveType?.name || 'Leave',
            isPaidLeave: leaveType?.isPaid || false,
            totalHours: "8", // Standard work day as string
            status: 'secretary_submitted',
            currentApprovalStage: 'employee',
            notes: `Auto-generated for approved leave request - ${leaveRequest.reason}`,
            customFieldsData: {
              leave_reason: leaveRequest.reason,
              leave_type: leaveType?.name || 'Leave',
              auto_generated: true,
            },
          });
          
          newTimecards.push(timecard);
        }
        var timecards = newTimecards;
      }

      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "approve_leave_request",
        entityType: "leave_request",
        entityId: leaveRequestId,
        description: `Approved leave request and generated ${timecards.length} timecard entries`,
      });

      res.json({
        message: "Leave request approved and timecards generated",
        leaveRequest: approvedRequest,
        timecardsGenerated: timecards.length,
        timecards: timecards,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to approve leave request", error: (error as Error).message });
    }
  });

  app.post("/api/leave-requests/:id/reject", requireRole(['admin', 'hr', 'secretary']), async (req, res) => {
    try {
      const leaveRequestId = parseInt(req.params.id);
      const leaveRequests = await storage.getLeaveRequests();
      const leaveRequest = leaveRequests.find(lr => lr.id === leaveRequestId);
      
      if (!leaveRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      
      if (leaveRequest.status !== 'pending') {
        return res.status(400).json({ message: "Leave request is not in pending status" });
      }

      // Update leave request status to rejected
      const rejectedRequest = await storage.updateLeaveRequest(leaveRequestId, {
        status: 'rejected',
        approvedBy: req.body.approvedBy || 1, // Default to admin user
        approvedAt: new Date(),
      });

      // Remove preliminary timecards for rejected leave request
      const preliminaryTimecards = await storage.getTimeCardsByLeaveRequest(leaveRequestId);
      let removedTimecardsCount = 0;
      
      for (const timecard of preliminaryTimecards) {
        // Only remove draft/preliminary timecards, not already approved ones
        if (timecard.status === 'draft' || timecard.customFieldsData?.preliminary_entry) {
          await storage.deleteTimeCard(timecard.id);
          removedTimecardsCount++;
        }
      }

      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "reject_leave_request",
        entityType: "leave_request",
        entityId: leaveRequestId,
        description: `Rejected leave request and removed ${removedTimecardsCount} preliminary timecard entries`,
      });

      res.json({
        message: "Leave request rejected",
        leaveRequest: rejectedRequest,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to reject leave request", error: (error as Error).message });
    }
  });

  // Payroll routes
  app.get("/api/payroll", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const payrollRecords = await storage.getPayrollRecords();
      res.json(payrollRecords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payroll records", error: (error as Error).message });
    }
  });

  app.get("/api/payroll/summary", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const summary = await storage.getCurrentPayrollSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payroll summary", error: (error as Error).message });
    }
  });



  app.post("/api/payroll", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const payrollData = insertPayrollRecordSchema.parse(req.body);
      const payrollRecord = await storage.createPayrollRecord(payrollData);
      
      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "create_payroll_record",
        entityType: "payroll",
        entityId: payrollRecord.id,
        description: `Created payroll record for employee ${payrollRecord.employeeId}`,
      });

      res.status(201).json(payrollRecord);
    } catch (error) {
      res.status(400).json({ message: "Failed to create payroll record", error: (error as Error).message });
    }
  });

  app.post("/api/payroll/analyze", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const payrollRecords = await storage.getPayrollRecords();
      const analysis = await analyzePayrollAnomalies(payrollRecords);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze payroll data", error: (error as Error).message });
    }
  });

  // Payroll Reporting Routes
  app.get("/api/payroll/reports/summary", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const report = await storage.getPayrollSummaryReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate payroll summary report", error: (error as Error).message });
    }
  });

  app.get("/api/payroll/reports/tax-liability", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const report = await storage.getTaxLiabilityReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate tax liability report", error: (error as Error).message });
    }
  });

  app.get("/api/payroll/reports/benefits", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const report = await storage.getBenefitsReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate benefits report", error: (error as Error).message });
    }
  });

  // Export endpoints for payroll reports
  app.get("/api/payroll/reports/summary/export", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const report = await storage.getPayrollSummaryReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      const csvContent = `Payroll Summary Report\n` +
        `Period: ${startDate} to ${endDate}\n\n` +
        `Total Employees,${report.summary.totalEmployees}\n` +
        `Total Records,${report.summary.totalRecords}\n` +
        `Total Gross Pay,$${report.summary.totalGrossPay.toFixed(2)}\n` +
        `Total Net Pay,$${report.summary.totalNetPay.toFixed(2)}\n` +
        `Total Taxes,$${report.summary.totalTaxes.toFixed(2)}\n` +
        `Total Deductions,$${report.summary.totalDeductions.toFixed(2)}\n`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="payroll-summary.csv"');
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ message: "Failed to export payroll summary", error: (error as Error).message });
    }
  });

  app.get("/api/payroll/reports/tax-liability/export", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const report = await storage.getTaxLiabilityReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      const csvContent = `Tax Liability Report\n` +
        `Period: ${startDate} to ${endDate}\n\n` +
        `Federal Tax,$${report.federalTax.toFixed(2)}\n` +
        `State Tax,$${report.stateTax.toFixed(2)}\n` +
        `Social Security Tax,$${report.socialSecurityTax.toFixed(2)}\n` +
        `Medicare Tax,$${report.medicareTax.toFixed(2)}\n` +
        `Unemployment Tax,$${report.unemploymentTax.toFixed(2)}\n` +
        `Disability Tax,$${report.disabilityTax.toFixed(2)}\n` +
        `Total Tax Liability,$${report.totalTaxLiability.toFixed(2)}\n`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="tax-liability.csv"');
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ message: "Failed to export tax liability report", error: (error as Error).message });
    }
  });

  app.get("/api/payroll/reports/benefits/export", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const report = await storage.getBenefitsReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      const csvContent = `Benefits Report\n` +
        `Period: ${startDate} to ${endDate}\n\n` +
        `Total Employees,${report.totalEmployees}\n` +
        `Total Benefit Deductions,$${report.totalBenefitDeductions.toFixed(2)}\n`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="benefits-report.csv"');
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ message: "Failed to export benefits report", error: (error as Error).message });
    }
  });

  app.get("/api/payroll/reports/employee/:employeeId", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const report = await storage.getEmployeePayrollReport(
        parseInt(employeeId),
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate employee payroll report", error: (error as Error).message });
    }
  });

  app.get("/api/payroll/reports/compliance", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const report = await storage.getPayrollComplianceReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate compliance report", error: (error as Error).message });
    }
  });

  app.get("/api/payroll/reports/cost-analysis", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const report = await storage.getPayrollCostAnalysis(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate cost analysis report", error: (error as Error).message });
    }
  });

  // Tax configuration routes
  app.get("/api/tax-configs", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const configs = await storage.getTaxConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tax configurations", error: (error as Error).message });
    }
  });

  app.post("/api/tax-configs", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const configData = req.body;
      const config = await storage.createTaxConfig(configData);
      res.status(201).json(config);
    } catch (error) {
      res.status(400).json({ message: "Failed to create tax configuration", error: (error as Error).message });
    }
  });

  // Employee benefit elections routes
  app.get("/api/benefit-elections", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const elections = await storage.getBenefitElections();
      res.json(elections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch benefit elections", error: (error as Error).message });
    }
  });

  app.post("/api/benefit-elections", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const electionData = req.body;
      const election = await storage.createBenefitElection(electionData);
      res.status(201).json(election);
    } catch (error) {
      res.status(400).json({ message: "Failed to create benefit election", error: (error as Error).message });
    }
  });

  // Document routes
  app.get("/api/documents", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents", error: (error as Error).message });
    }
  });

  app.get("/api/documents/pending", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const pendingDocuments = await storage.getPendingDocuments();
      res.json(pendingDocuments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending documents", error: (error as Error).message });
    }
  });

  app.post("/api/documents", requireRole(['admin', 'hr']), async (req, res) => {
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

  app.put("/api/documents/:id", requireRole(['admin', 'hr']), async (req, res) => {
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

  // Automated onboarding trigger
  app.post("/api/onboarding/trigger/:employeeId", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Check if onboarding workflow already exists
      const existingWorkflows = await storage.getOnboardingWorkflows();
      const hasExistingWorkflow = existingWorkflows.some((w: any) => w.employeeId === employeeId);
      
      if (hasExistingWorkflow) {
        return res.status(400).json({ message: "Onboarding workflow already exists for this employee" });
      }

      // Generate AI-powered checklist based on employee type
      let requiredDocuments = [];
      let currentStep = "welcome";
      
      try {
        const checklist = await generateOnboardingChecklist(employee.employeeType, employee.department || "General");
        requiredDocuments = checklist.requiredDocuments;
        currentStep = checklist.steps[0]?.step || "welcome";
      } catch (aiError) {
        console.warn("AI checklist generation failed, using defaults:", (aiError as Error).message);
        // Default documents based on employee type
        if (employee.employeeType === 'certificated') {
          requiredDocuments = [
            "Teaching Certificate", "Background Check", "TB Test", 
            "Employee Handbook", "W-4 Form", "I-9 Form", "Benefits Enrollment",
            "Emergency Contact Form", "Direct Deposit Form", "Technology Agreement"
          ];
        } else if (employee.employeeType === 'classified') {
          requiredDocuments = [
            "Background Check", "TB Test", "Employee Handbook", 
            "W-4 Form", "I-9 Form", "Benefits Enrollment",
            "Emergency Contact Form", "Direct Deposit Form", "Safety Training"
          ];
        } else {
          requiredDocuments = [
            "Employee Handbook", "W-4 Form", "I-9 Form", 
            "Emergency Contact Form", "Background Check"
          ];
        }
      }

      // Create onboarding workflow
      const workflowData = {
        employeeId: employeeId,
        workflowType: employee.employeeType || 'general',
        status: 'in_progress',
        currentStep: currentStep,
        startDate: new Date(),
        targetCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        assignedTo: req.user?.id || 'system',
        requiredDocuments: requiredDocuments,
        completedSteps: [],
        notes: `Automated onboarding workflow created for ${employee.employeeType} employee`
      };

      const workflow = await storage.createOnboardingWorkflow(workflowData);

      // Generate and send welcome letter
      const welcomeLetterData = {
        title: `Welcome Letter - ${employee.firstName} ${employee.lastName}`,
        employeeId: employeeId,
        letterType: 'welcome',
        templateContent: generateWelcomeLetter(employee),
        processedContent: generateWelcomeLetter(employee),
        status: 'generated',
        createdBy: req.user?.id || 'system',
        processedAt: new Date()
      };

      const welcomeLetter = await storage.createLetter(welcomeLetterData);

      // Log the automated process
      await storage.createActivityLog({
        userId: req.user?.id || 'system',
        action: "automated_onboarding",
        entityType: "onboarding",
        entityId: workflow.id,
        description: `Automated onboarding triggered for ${employee.firstName} ${employee.lastName} (${employee.employeeType})`
      });

      res.status(201).json({
        workflow,
        welcomeLetter,
        message: `Automated onboarding started for ${employee.firstName} ${employee.lastName}`
      });

    } catch (error) {
      console.error("Automated onboarding error:", error);
      res.status(500).json({ message: "Failed to trigger automated onboarding", error: (error as Error).message });
    }
  });

  // Onboarding routes
  app.get("/api/onboarding", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const workflows = await storage.getOnboardingWorkflows();
      res.json(workflows);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch onboarding workflows", error: (error as Error).message });
    }
  });

  // Get onboarding workflows by employee ID
  app.get("/api/onboarding/workflows", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { employeeId } = req.query;
      if (employeeId) {
        const workflows = await storage.getOnboardingWorkflowsByEmployee(parseInt(employeeId as string));
        res.json(workflows);
      } else {
        const workflows = await storage.getOnboardingWorkflows();
        res.json(workflows);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch onboarding workflows", error: (error as Error).message });
    }
  });

  // Get form submissions by employee ID  
  app.get("/api/onboarding/form-submissions", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { employeeId } = req.query;
      if (employeeId) {
        const submissions = await storage.getOnboardingFormSubmissionsByEmployee(parseInt(employeeId as string));
        res.json(submissions);
      } else {
        const submissions = await storage.getOnboardingFormSubmissions();
        res.json(submissions);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form submissions", error: (error as Error).message });
    }
  });

  app.post("/api/onboarding", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      // Convert string dates to Date objects for validation
      const requestData = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        targetCompletionDate: req.body.targetCompletionDate ? new Date(req.body.targetCompletionDate) : undefined,
      };
      
      const workflowData = insertOnboardingWorkflowSchema.parse(requestData);
      
      // Generate AI-powered checklist or fallback to default
      const employee = await storage.getEmployee(workflowData.employeeId);
      if (employee) {
        try {
          const checklist = await generateOnboardingChecklist(employee.employeeType, employee.department);
          workflowData.requiredDocuments = checklist.requiredDocuments;
          workflowData.currentStep = checklist.steps[0]?.step || "welcome";
        } catch (aiError) {
          console.warn("AI checklist generation failed, using default:", (aiError as Error).message);
          // Fallback to default checklist
          workflowData.requiredDocuments = ["Employee Handbook", "Tax Forms", "Benefits Enrollment", "Emergency Contact"];
          workflowData.currentStep = "welcome";
        }
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
      console.error("Onboarding workflow creation error:", error);
      res.status(400).json({ message: "Failed to create onboarding workflow", error: (error as Error).message });
    }
  });

  app.put("/api/onboarding/:id", requireRole(['admin', 'hr']), async (req, res) => {
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
  app.get("/api/onboarding/forms", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const forms = await storage.getOnboardingForms();
      res.json(forms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch onboarding forms", error: (error as Error).message });
    }
  });

  app.get("/api/onboarding/forms/active", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const forms = await storage.getActiveOnboardingForms();
      res.json(forms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active onboarding forms", error: (error as Error).message });
    }
  });

  app.get("/api/onboarding/forms/:id", requireRole(['admin', 'hr']), async (req, res) => {
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

  app.post("/api/onboarding/forms", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const formData = insertOnboardingFormSchema.parse(req.body);
      const form = await storage.createOnboardingForm({
        ...formData,
        version: "1.0",
        isTemplate: true,
      });
      
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

  // File upload endpoint for onboarding forms
  app.post("/api/onboarding/forms/upload", requireRole(['admin', 'hr']), upload.single('file'), async (req, res) => {
    try {
      if (!req.body.formData) {
        return res.status(400).json({ message: "Form data is required" });
      }
      
      const formData = JSON.parse(req.body.formData);
      const validatedData = insertOnboardingFormSchema.parse(formData);

      let fileUrl = null;
      let fileName = null;
      let fileSize = null;
      let mimeType = null;

      if (req.file) {
        fileUrl = `/uploads/${req.file.filename}`;
        fileName = req.file.originalname;
        fileSize = req.file.size;
        mimeType = req.file.mimetype;
      }

      const form = await storage.createOnboardingForm({
        ...validatedData,
        fileUrl,
        fileName,
        fileSize,
        mimeType,
        version: "1.0",
        isTemplate: true,
      });

      await storage.createActivityLog({
        userId: validatedData.createdBy,
        action: "create_onboarding_form",
        entityType: "onboarding_form",
        entityId: form.id,
        description: `Created onboarding form "${form.title}"${req.file ? ' with file upload' : ''}`,
      });

      res.status(201).json(form);
    } catch (error) {
      console.error('Error uploading form:', error);
      res.status(400).json({ message: "Failed to create onboarding form with file", error: (error as Error).message });
    }
  });

  app.put("/api/onboarding/forms/:id", requireRole(['admin', 'hr']), async (req, res) => {
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

  app.delete("/api/onboarding/forms/:id", requireRole(['admin', 'hr']), async (req, res) => {
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

  // Time cards routes (role-based access)
  app.get("/api/time-cards", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      let timeCards: any[] = [];
      
      if (user.role === 'admin' || user.role === 'hr') {
        // Admin and HR can see all time cards
        timeCards = await storage.getTimeCards();
      } else {
        // Employees can only see their own time cards
        const employee = await storage.getEmployeeByUserId(user.id);
        if (employee) {
          timeCards = await storage.getTimeCardsByEmployee(employee.id);
        }
      }
      
      res.json(timeCards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time cards", error: (error as Error).message });
    }
  });

  app.get("/api/time-cards-admin", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const timeCards = await storage.getTimeCards();
      res.json(timeCards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time cards", error: (error as Error).message });
    }
  });

  // Export time cards for accounting
  app.get("/api/time-cards/export", requireRole(['admin', 'hr']), async (req, res) => {
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

  app.post("/api/time-cards", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Skip validation and create directly since frontend handles date conversion correctly
      const timeCardData = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : new Date(),
        clockIn: req.body.clockIn ? new Date(req.body.clockIn) : undefined,
        clockOut: req.body.clockOut ? new Date(req.body.clockOut) : undefined,
        breakStart: req.body.breakStart ? new Date(req.body.breakStart) : undefined,
        breakEnd: req.body.breakEnd ? new Date(req.body.breakEnd) : undefined,
        status: req.body.status || 'draft',
        currentApprovalStage: req.body.currentApprovalStage || 'secretary'
      };
      
      // If user is an employee, ensure they can only create time cards for themselves
      if (user.role === 'employee') {
        const employee = await storage.getEmployeeByUserId(user.id);
        if (!employee) {
          return res.status(404).json({ message: "Employee record not found" });
        }
        
        // Force the employee ID to match the current user's employee record
        timeCardData.employeeId = employee.id;
      }
      
      const timeCard = await storage.createTimeCard(timeCardData);
      
      await storage.createActivityLog({
        userId: user.id,
        action: "create_time_card",
        entityType: "time_card",
        entityId: timeCard.id,
        description: `Created time card for employee ${timeCardData.employeeId}`,
      });

      res.status(201).json(timeCard);
    } catch (error) {
      res.status(400).json({ message: "Failed to create time card", error: (error as Error).message });
    }
  });

  app.post("/api/time-cards-create", async (req, res) => {
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

  // Update payroll processing fields for time cards
  app.put("/api/time-cards/:id/payroll-processing", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { payrollAddon, payrollUnits, payrollRate, payrollTotal, payrollProcessingNotes } = req.body;
      
      const timeCard = await storage.updateTimeCard(parseInt(req.params.id), {
        payrollAddon,
        payrollUnits,
        payrollRate,
        payrollTotal,
        payrollProcessingNotes
      });
      
      await storage.createActivityLog({
        userId: req.body.userId || "system",
        action: "update_timecard_payroll",
        entityType: "time_card",
        entityId: parseInt(req.params.id),
        description: `Updated payroll processing fields for time card`,
      });
      
      res.json(timeCard);
    } catch (error) {
      res.status(400).json({ message: "Failed to update payroll processing", error: (error as Error).message });
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

  // Employee-specific timecard endpoint by user ID
  app.get("/api/time-cards/employee-user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = (req as any).user;
      
      // Ensure employees can only access their own timecards
      if (user.role === 'employee' && user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const employee = await storage.getEmployeeByUserId(userId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const timecards = await storage.getTimeCardsByEmployee(employee.id);
      res.json(timecards);
    } catch (error) {
      console.error('Error fetching employee timecards:', error);
      res.status(500).json({ message: "Failed to fetch employee timecards" });
    }
  });

  app.get("/api/time-cards/pending", isAuthenticated, async (req, res) => {
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
      const user = (req as any).user;
      
      // For employees, ensure they can only approve their own timecards
      if (user.role === 'employee') {
        const employee = await storage.getEmployeeByUserId(user.id);
        if (!employee || employee.id !== employeeId) {
          return res.status(403).json({ message: "Access denied - you can only approve your own timecards" });
        }
      }
      
      const timeCard = await storage.approveTimeCardByEmployee(parseInt(req.params.id), employeeId, notes);
      res.json(timeCard);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve time card by employee", error: (error as Error).message });
    }
  });

  // Alternative approve endpoint for general employee approval
  app.post("/api/time-cards/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const { approvedBy, approverRole } = req.body;
      const user = (req as any).user;
      
      // For employees, ensure they can only approve their own timecards
      if (user.role === 'employee' && user.id !== approvedBy) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const employee = await storage.getEmployeeByUserId(approvedBy);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const timeCard = await storage.approveTimeCardByEmployee(parseInt(id), employee.id, "Approved by employee");
      res.json(timeCard);
    } catch (error) {
      console.error('Error approving timecard:', error);
      res.status(500).json({ message: "Failed to approve timecard" });
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

  // Get individual substitute timecard by substitute, template, and date
  app.get('/api/substitute-time-cards/:substituteId/:templateId/:date', async (req, res) => {
    try {
      const { substituteId, templateId, date } = req.params;
      const timecard = await storage.getSubstituteTimecardByParams(
        parseInt(substituteId),
        parseInt(templateId),
        date
      );
      
      if (timecard) {
        res.json(timecard);
      } else {
        res.status(404).json({ message: "Timecard not found" });
      }
    } catch (error) {
      console.error('Error fetching substitute timecard:', error);
      res.status(500).json({ message: "Failed to fetch substitute timecard" });
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

  // Update substitute time card
  app.put('/api/substitute-time-cards/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const substituteTimeCard = await storage.updateSubstituteTimeCard(id, updateData);
      res.json(substituteTimeCard);
    } catch (error) {
      console.error('Error updating substitute time card:', error);
      res.status(500).json({ message: "Failed to update substitute time card", error: (error as Error).message });
    }
  });

  // Lock substitute time card
  app.post('/api/substitute-time-cards/:id/lock', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { lockReason } = req.body;
      const userId = (req as any).user?.id || (req as any).currentUser?.id;
      
      const substituteTimeCard = await storage.lockSubstituteTimeCard(id, userId, lockReason);
      res.json(substituteTimeCard);
    } catch (error) {
      console.error('Error locking substitute time card:', error);
      res.status(500).json({ message: "Failed to lock substitute time card", error: (error as Error).message });
    }
  });

  // Unlock substitute time card
  app.post('/api/substitute-time-cards/:id/unlock', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const substituteTimeCard = await storage.unlockSubstituteTimeCard(id);
      res.json(substituteTimeCard);
    } catch (error) {
      console.error('Error unlocking substitute time card:', error);
      res.status(500).json({ message: "Failed to unlock substitute time card", error: (error as Error).message });
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

  // Extra Pay Custom Fields API routes
  app.get('/api/extra-pay-custom-fields', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const fields = await storage.getExtraPayCustomFields();
      res.json(fields);
    } catch (error) {
      console.error('Error fetching extra pay custom fields:', error);
      res.status(500).json({ message: "Failed to fetch custom fields" });
    }
  });

  app.get('/api/extra-pay-custom-fields/section/:section', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { section } = req.params;
      const fields = await storage.getExtraPayCustomFieldsBySection(section);
      res.json(fields);
    } catch (error) {
      console.error('Error fetching extra pay custom fields by section:', error);
      res.status(500).json({ message: "Failed to fetch custom fields" });
    }
  });

  app.post('/api/extra-pay-custom-fields', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const validation = insertExtraPayCustomFieldSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const field = await storage.createExtraPayCustomField(validation.data);
      res.json(field);
    } catch (error) {
      console.error('Error creating extra pay custom field:', error);
      res.status(500).json({ message: "Failed to create custom field" });
    }
  });

  app.put('/api/extra-pay-custom-fields/:id', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertExtraPayCustomFieldSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const field = await storage.updateExtraPayCustomField(id, validation.data);
      res.json(field);
    } catch (error) {
      console.error('Error updating extra pay custom field:', error);
      res.status(500).json({ message: "Failed to update custom field" });
    }
  });

  app.delete('/api/extra-pay-custom-fields/:id', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteExtraPayCustomField(id);
      res.json({ message: "Custom field deleted successfully" });
    } catch (error) {
      console.error('Error deleting extra pay custom field:', error);
      res.status(500).json({ message: "Failed to delete custom field" });
    }
  });

  app.post('/api/extra-pay-custom-fields/initialize', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      await storage.initializeDefaultExtraPayCustomFields();
      res.json({ message: "Default custom fields initialized successfully" });
    } catch (error) {
      console.error('Error initializing extra pay custom fields:', error);
      res.status(500).json({ message: "Failed to initialize custom fields" });
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

  // Timecard Template Routes
  app.get('/api/timecard-templates', async (req, res) => {
    try {
      const templates = await storage.getTimecardTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching timecard templates:', error);
      res.status(500).json({ message: "Failed to fetch timecard templates" });
    }
  });

  app.get('/api/timecard-templates/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getTimecardTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Timecard template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error('Error fetching timecard template:', error);
      res.status(500).json({ message: "Failed to fetch timecard template" });
    }
  });

  app.post('/api/timecard-templates', async (req, res) => {
    try {
      const validation = insertTimecardTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const template = await storage.createTimecardTemplate(validation.data);
      res.json(template);
    } catch (error) {
      console.error('Error creating timecard template:', error);
      res.status(500).json({ message: "Failed to create timecard template" });
    }
  });

  app.put('/api/timecard-templates/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log('Updating timecard template:', id, req.body);
      
      const validation = insertTimecardTemplateSchema.partial().safeParse(req.body);
      if (!validation.success) {
        console.log('Validation errors:', validation.error.errors);
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const template = await storage.updateTimecardTemplate(id, validation.data);
      res.json(template);
    } catch (error) {
      console.error('Error updating timecard template:', error);
      res.status(500).json({ message: "Failed to update timecard template", error: (error as Error).message });
    }
  });

  app.delete('/api/timecard-templates/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTimecardTemplate(id);
      res.json({ message: "Timecard template deleted successfully" });
    } catch (error) {
      console.error('Error deleting timecard template:', error);
      res.status(500).json({ message: "Failed to delete timecard template" });
    }
  });

  app.get('/api/timecard-templates/employee-type/:employeeType', async (req, res) => {
    try {
      const employeeType = req.params.employeeType;
      const templates = await storage.getTimecardTemplatesByEmployeeType(employeeType);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching timecard templates by employee type:', error);
      res.status(500).json({ message: "Failed to fetch timecard templates by employee type" });
    }
  });

  app.get('/api/timecard-templates/active', async (req, res) => {
    try {
      const templates = await storage.getActiveTimecardTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching active timecard templates:', error);
      res.status(500).json({ message: "Failed to fetch active timecard templates" });
    }
  });

  app.get('/api/timecard-templates/default/:employeeType', async (req, res) => {
    try {
      const employeeType = req.params.employeeType;
      const template = await storage.getDefaultTimecardTemplate(employeeType);
      if (!template) {
        return res.status(404).json({ message: "Default timecard template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error('Error fetching default timecard template:', error);
      res.status(500).json({ message: "Failed to fetch default timecard template" });
    }
  });

  // Timecard Template Fields Routes
  app.get('/api/timecard-template-fields/:templateId', async (req, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const fields = await storage.getTimecardTemplateFields(templateId);
      res.json(fields);
    } catch (error) {
      console.error('Error fetching timecard template fields:', error);
      res.status(500).json({ message: "Failed to fetch timecard template fields" });
    }
  });

  app.get('/api/timecard-template-fields/field/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const field = await storage.getTimecardTemplateField(id);
      if (!field) {
        return res.status(404).json({ message: "Timecard template field not found" });
      }
      res.json(field);
    } catch (error) {
      console.error('Error fetching timecard template field:', error);
      res.status(500).json({ message: "Failed to fetch timecard template field" });
    }
  });

  app.post('/api/timecard-template-fields', async (req, res) => {
    try {
      const validation = insertTimecardTemplateFieldSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const field = await storage.createTimecardTemplateField(validation.data);
      res.json(field);
    } catch (error) {
      console.error('Error creating timecard template field:', error);
      res.status(500).json({ message: "Failed to create timecard template field" });
    }
  });

  app.put('/api/timecard-template-fields/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertTimecardTemplateFieldSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const field = await storage.updateTimecardTemplateField(id, validation.data);
      res.json(field);
    } catch (error) {
      console.error('Error updating timecard template field:', error);
      res.status(500).json({ message: "Failed to update timecard template field" });
    }
  });

  app.delete('/api/timecard-template-fields/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTimecardTemplateField(id);
      res.json({ message: "Timecard template field deleted successfully" });
    } catch (error) {
      console.error('Error deleting timecard template field:', error);
      res.status(500).json({ message: "Failed to delete timecard template field" });
    }
  });

  app.get('/api/timecard-template-fields/:templateId/section/:section', async (req, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const section = req.params.section;
      const fields = await storage.getTimecardTemplateFieldsBySection(templateId, section);
      res.json(fields);
    } catch (error) {
      console.error('Error fetching timecard template fields by section:', error);
      res.status(500).json({ message: "Failed to fetch timecard template fields by section" });
    }
  });

  // District Settings routes
  app.get("/api/district-settings", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const settings = await storage.getDistrictSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch district settings", error: (error as Error).message });
    }
  });

  app.post("/api/district-settings", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const settingsData = insertDistrictSettingsSchema.parse(req.body);
      const settings = await storage.upsertDistrictSettings(settingsData);
      
      await storage.createActivityLog({
        userId: (req as any).currentUser.id,
        action: "update_district_settings",
        entityType: "district_settings",
        entityId: settings.id,
        description: `Updated district settings for ${settings.districtName}`,
      });

      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: "Failed to update district settings", error: (error as Error).message });
    }
  });

  app.put("/api/district-settings/:id", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const settingsData = insertDistrictSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateDistrictSettings(parseInt(req.params.id), settingsData);
      
      await storage.createActivityLog({
        userId: (req as any).currentUser.id,
        action: "update_district_settings",
        entityType: "district_settings",
        entityId: settings.id,
        description: `Updated district settings`,
      });

      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: "Failed to update district settings", error: (error as Error).message });
    }
  });

  // Pay Periods routes
  app.get("/api/pay-periods", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const periods = await storage.getPayPeriods();
      res.json(periods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pay periods", error: (error as Error).message });
    }
  });

  app.get("/api/pay-periods/current", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const currentPeriod = await storage.getCurrentPayPeriod();
      res.json(currentPeriod);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch current pay period", error: (error as Error).message });
    }
  });

  app.get("/api/pay-periods/active", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const activePeriods = await storage.getActivePayPeriods();
      res.json(activePeriods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active pay periods", error: (error as Error).message });
    }
  });

  app.post("/api/pay-periods", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const periodData = insertPayPeriodSchema.parse(req.body);
      const period = await storage.createPayPeriod(periodData);
      
      await storage.createActivityLog({
        userId: (req as any).currentUser.id,
        action: "create_pay_period",
        entityType: "pay_period",
        entityId: period.id,
        description: `Created pay period: ${period.periodName}`,
      });

      res.status(201).json(period);
    } catch (error) {
      res.status(400).json({ message: "Failed to create pay period", error: (error as Error).message });
    }
  });

  app.put("/api/pay-periods/:id", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const periodData = insertPayPeriodSchema.partial().parse(req.body);
      const period = await storage.updatePayPeriod(parseInt(req.params.id), periodData);
      
      await storage.createActivityLog({
        userId: (req as any).currentUser.id,
        action: "update_pay_period",
        entityType: "pay_period",
        entityId: period.id,
        description: `Updated pay period: ${period.periodName}`,
      });

      res.json(period);
    } catch (error) {
      res.status(400).json({ message: "Failed to update pay period", error: (error as Error).message });
    }
  });

  app.delete("/api/pay-periods/:id", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      await storage.deletePayPeriod(parseInt(req.params.id));
      
      await storage.createActivityLog({
        userId: (req as any).currentUser.id,
        action: "delete_pay_period",
        entityType: "pay_period",
        entityId: parseInt(req.params.id),
        description: `Deleted pay period`,
      });

      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Failed to delete pay period", error: (error as Error).message });
    }
  });

  app.post("/api/pay-periods/generate", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { startDate, endDate, frequency } = req.body;
      
      if (!startDate || !endDate || !frequency) {
        return res.status(400).json({ message: "Missing required fields: startDate, endDate, frequency" });
      }

      const periods = await storage.generatePayPeriods(
        new Date(startDate),
        new Date(endDate),
        frequency
      );
      
      await storage.createActivityLog({
        userId: (req as any).currentUser.id,
        action: "generate_pay_periods",
        entityType: "pay_period",
        entityId: 0,
        description: `Generated ${periods.length} pay periods for ${frequency} frequency`,
      });

      res.json(periods);
    } catch (error) {
      res.status(400).json({ message: "Failed to generate pay periods", error: (error as Error).message });
    }
  });

  // Custom field labels routes
  app.get("/api/custom-field-labels", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const labels = await storage.getCustomFieldLabels();
      res.json(labels);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom field labels", error: (error as Error).message });
    }
  });

  app.post("/api/custom-field-labels", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const label = await storage.createCustomFieldLabel(req.body);
      res.json(label);
    } catch (error) {
      res.status(500).json({ message: "Failed to create custom field label", error: (error as Error).message });
    }
  });

  app.put("/api/custom-field-labels/:id", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const label = await storage.updateCustomFieldLabel(id, req.body);
      res.json(label);
    } catch (error) {
      res.status(500).json({ message: "Failed to update custom field label", error: (error as Error).message });
    }
  });

  app.delete("/api/custom-field-labels/:id", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCustomFieldLabel(id);
      res.json({ message: "Custom field label deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete custom field label", error: (error as Error).message });
    }
  });

  app.post("/api/custom-field-labels/initialize", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      await storage.initializeDefaultFieldLabels();
      res.json({ message: "Default field labels initialized successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to initialize default field labels", error: (error as Error).message });
    }
  });

  // System health monitoring routes
  app.get("/api/system/health", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const healthStatus = await systemHealthMonitor.getSystemHealth();
      res.json(healthStatus);
    } catch (error) {
      handleCriticalError(error as Error, 'System health check failed');
      res.status(500).json({ message: "Failed to get system health", error: (error as Error).message });
    }
  }));

  // Test error alert endpoint (admin only)
  app.post("/api/system/test-alert", requireRole(['admin']), asyncErrorHandler(async (req, res) => {
    try {
      const { alertType, message } = req.body;
      
      const testError = new Error(message || 'Test error alert');
      
      switch (alertType) {
        case 'database':
          await emailAlerts.sendDatabaseError(testError, 'Test database error');
          break;
        case 'authentication':
          await emailAlerts.sendAuthenticationError(testError, 'test_user');
          break;
        case 'payroll':
          await emailAlerts.sendPayrollError(testError, 'Test payroll error');
          break;
        case 'system':
          await emailAlerts.sendSystemError(testError, 'Test system error');
          break;
        default:
          await emailAlerts.sendAPIError(testError, 'POST /api/system/test-alert', 'test_user');
      }
      
      res.json({ message: 'Test alert sent successfully' });
    } catch (error) {
      handleCriticalError(error as Error, 'Failed to send test alert');
      res.status(500).json({ message: "Failed to send test alert", error: (error as Error).message });
    }
  }));

  // System metrics endpoint
  app.get("/api/system/metrics", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const metrics = {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      };
      
      res.json(metrics);
    } catch (error) {
      handleCriticalError(error as Error, 'Failed to get system metrics');
      res.status(500).json({ message: "Failed to get system metrics", error: (error as Error).message });
    }
  }));

  // Data retention information endpoint
  app.get("/api/system/retention", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const retentionInfo = await dataRetentionMonitor.getRetentionInfo();
      res.json(retentionInfo);
    } catch (error) {
      handleCriticalError(error as Error, 'Failed to get data retention info');
      res.status(500).json({ message: "Failed to get data retention info", error: (error as Error).message });
    }
  }));

  // Storage estimation endpoint
  app.post("/api/system/estimate-storage", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const { employeeCount } = req.body;
      const estimate = await dataRetentionMonitor.estimateStorageForEmployees(employeeCount);
      res.json(estimate);
    } catch (error) {
      handleCriticalError(error as Error, 'Failed to estimate storage');
      res.status(500).json({ message: "Failed to estimate storage", error: (error as Error).message });
    }
  }));

  // Retention policy recommendations endpoint
  app.get("/api/system/retention-policies", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const policies = await dataRetentionMonitor.getRetentionPolicyRecommendations();
      res.json(policies);
    } catch (error) {
      handleCriticalError(error as Error, 'Failed to get retention policies');
      res.status(500).json({ message: "Failed to get retention policies", error: (error as Error).message });
    }
  }));

  // Storage monitoring endpoints
  app.get("/api/system/storage-usage", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const usage = await storageMonitor.getStorageUsage();
      res.json(usage);
    } catch (error) {
      handleCriticalError(error as Error, 'Failed to get storage usage');
      res.status(500).json({ message: "Failed to get storage usage", error: (error as Error).message });
    }
  }));

  app.get("/api/system/archive-candidates", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const candidates = await storageMonitor.getArchiveCandidates();
      res.json(candidates);
    } catch (error) {
      handleCriticalError(error as Error, 'Failed to get archive candidates');
      res.status(500).json({ message: "Failed to get archive candidates", error: (error as Error).message });
    }
  }));

  app.get("/api/system/storage-alerts", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const alerts = await storageMonitor.getStorageAlerts();
      res.json(alerts);
    } catch (error) {
      handleCriticalError(error as Error, 'Failed to get storage alerts');
      res.status(500).json({ message: "Failed to get storage alerts", error: (error as Error).message });
    }
  }));

  // Data archiving endpoints
  app.get("/api/system/archive-config", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const config = await dataArchiver.getArchiveConfig();
      res.json(config);
    } catch (error) {
      handleCriticalError(error as Error, 'Failed to get archive config');
      res.status(500).json({ message: "Failed to get archive config", error: (error as Error).message });
    }
  }));

  app.post("/api/system/archive-config", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const updatedConfig = await dataArchiver.updateArchiveConfig(req.body);
      res.json(updatedConfig);
    } catch (error) {
      handleCriticalError(error as Error, 'Failed to update archive config');
      res.status(500).json({ message: "Failed to update archive config", error: (error as Error).message });
    }
  }));

  app.post("/api/system/archive-records", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const { category, recordIds } = req.body;
      const job = await dataArchiver.createArchiveJob(category, recordIds);
      res.json(job);
    } catch (error) {
      handleCriticalError(error as Error, 'Failed to create archive job');
      res.status(500).json({ message: "Failed to create archive job", error: (error as Error).message });
    }
  }));

  app.get("/api/system/archive-jobs", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const jobs = await dataArchiver.getArchiveJobs();
      res.json(jobs);
    } catch (error) {
      handleCriticalError(error as Error, 'Failed to get archive jobs');
      res.status(500).json({ message: "Failed to get archive jobs", error: (error as Error).message });
    }
  }));

  app.post("/api/system/run-archiving", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const result = await dataArchiver.runAutomaticArchiving();
      res.json(result);
    } catch (error) {
      handleCriticalError(error as Error, 'Failed to run archiving');
      res.status(500).json({ message: "Failed to run archiving", error: (error as Error).message });
    }
  }));

  app.get("/api/system/archive-estimates", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const estimates = await dataArchiver.estimateArchivingSavings();
      res.json(estimates);
    } catch (error) {
      handleCriticalError(error as Error, 'Failed to get archive estimates');
      res.status(500).json({ message: "Failed to get archive estimates", error: (error as Error).message });
    }
  }));

  // Storage estimation endpoint
  app.post("/api/system/estimate-storage", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const { employeeCount } = req.body;
      const estimate = await dataRetentionMonitor.estimateStorageForEmployees(employeeCount);
      res.json(estimate);
    } catch (error) {
      handleCriticalError(error as Error, 'Failed to estimate storage');
      res.status(500).json({ message: "Failed to estimate storage", error: (error as Error).message });
    }
  }));

  // Password reset routes (public - no authentication required)
  app.post("/api/password-reset/request", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security, don't reveal whether email exists
        return res.json({ message: "If an account with this email exists, you will receive a password reset link." });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      // Store reset token
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt,
        used: false
      });

      // Send email (configure your email settings)
      try {
        const transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
        
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@hrpayroll.com',
          to: email,
          subject: 'Password Reset Request',
          html: `
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your HR Payroll System account.</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this reset, please ignore this email.</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError);
        // Continue processing even if email fails
      }

      res.json({ message: "If an account with this email exists, you will receive a password reset link." });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/password-reset/verify", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Reset token is required" });
      }

      // Verify token
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Get user info
      const user = await storage.getUser(resetToken.userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      res.json({ 
        valid: true, 
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });
    } catch (error) {
      console.error('Password reset verification error:', error);
      res.status(500).json({ message: "Failed to verify reset token" });
    }
  });

  app.post("/api/password-reset/confirm", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Reset token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      // Verify token
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update user password
      await storage.updateUserPassword(resetToken.userId, passwordHash);

      // Mark token as used
      await storage.markTokenAsUsed(resetToken.id);

      // Clean up expired tokens
      await storage.cleanupExpiredTokens();

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Retirees API endpoints
  app.get("/api/retirees", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const retirees = await db.select().from(schema.retirees).orderBy(schema.retirees.lastName);
      res.json(retirees);
    } catch (error) {
      handleAPIError(error as Error, '/api/retirees', req.user?.id);
      res.status(500).json({ message: "Failed to fetch retirees" });
    }
  }));

  app.post("/api/retirees", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const validatedData = schema.insertRetireeSchema.parse(req.body);
      const [retiree] = await db.insert(schema.retirees).values(validatedData).returning();
      res.json(retiree);
    } catch (error) {
      handleAPIError(error as Error, '/api/retirees', req.user?.id);
      res.status(500).json({ message: "Failed to create retiree" });
    }
  }));

  app.put("/api/retirees/:id", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = schema.insertRetireeSchema.parse(req.body);
      const [retiree] = await db.update(schema.retirees).set(validatedData).where(eq(schema.retirees.id, id)).returning();
      res.json(retiree);
    } catch (error) {
      handleAPIError(error as Error, '/api/retirees', req.user?.id);
      res.status(500).json({ message: "Failed to update retiree" });
    }
  }));

  app.delete("/api/retirees/:id", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(schema.retirees).where(eq(schema.retirees.id, id));
      res.json({ message: "Retiree deleted successfully" });
    } catch (error) {
      handleAPIError(error as Error, '/api/retirees', req.user?.id);
      res.status(500).json({ message: "Failed to delete retiree" });
    }
  }));

  // Archived Employees API endpoints
  app.get("/api/archived-employees", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const employees = await db.select().from(schema.archivedEmployees).orderBy(schema.archivedEmployees.lastName);
      res.json(employees);
    } catch (error) {
      handleAPIError(error as Error, '/api/archived-employees', req.user?.id);
      res.status(500).json({ message: "Failed to fetch archived employees" });
    }
  }));

  app.post("/api/archived-employees", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const validatedData = schema.insertArchivedEmployeeSchema.parse(req.body);
      const [employee] = await db.insert(schema.archivedEmployees).values(validatedData).returning();
      res.json(employee);
    } catch (error) {
      handleAPIError(error as Error, '/api/archived-employees', req.user?.id);
      res.status(500).json({ message: "Failed to create archived employee" });
    }
  }));

  app.put("/api/archived-employees/:id", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = schema.insertArchivedEmployeeSchema.parse(req.body);
      const [employee] = await db.update(schema.archivedEmployees).set(validatedData).where(eq(schema.archivedEmployees.id, id)).returning();
      res.json(employee);
    } catch (error) {
      handleAPIError(error as Error, '/api/archived-employees', req.user?.id);
      res.status(500).json({ message: "Failed to update archived employee" });
    }
  }));

  app.delete("/api/archived-employees/:id", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Delete associated files first
      await db.delete(schema.personnelFiles).where(eq(schema.personnelFiles.archivedEmployeeId, id));
      // Then delete the employee
      await db.delete(schema.archivedEmployees).where(eq(schema.archivedEmployees.id, id));
      res.json({ message: "Archived employee deleted successfully" });
    } catch (error) {
      handleAPIError(error as Error, '/api/archived-employees', req.user?.id);
      res.status(500).json({ message: "Failed to delete archived employee" });
    }
  }));

  // Personnel Files API endpoints
  app.get("/api/personnel-files/:employeeId", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const files = await db.select().from(schema.personnelFiles)
        .where(eq(schema.personnelFiles.archivedEmployeeId, employeeId))
        .orderBy(schema.personnelFiles.createdAt);
      res.json(files);
    } catch (error) {
      handleAPIError(error as Error, '/api/personnel-files', req.user?.id);
      res.status(500).json({ message: "Failed to fetch personnel files" });
    }
  }));

  app.post("/api/personnel-files/upload", requireRole(['admin', 'hr']), personnelUpload.single('file'), asyncErrorHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { archivedEmployeeId, category, description, documentDate, tags } = req.body;
      
      const fileData = {
        archivedEmployeeId: parseInt(archivedEmployeeId),
        fileName: req.file.filename,
        originalFileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: req.file.path,
        category,
        description: description || null,
        documentDate: documentDate ? new Date(documentDate) : null,
        tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : [],
        uploadedBy: req.user?.id || 'system',
      };

      const [file] = await db.insert(schema.personnelFiles).values(fileData).returning();
      
      // Update file count for the employee
      await db.update(schema.archivedEmployees)
        .set({ 
          personnelFilesCount: sql`${schema.archivedEmployees.personnelFilesCount} + 1`,
          lastFileUpload: new Date()
        })
        .where(eq(schema.archivedEmployees.id, parseInt(archivedEmployeeId)));

      res.json(file);
    } catch (error) {
      handleAPIError(error as Error, '/api/personnel-files/upload', req.user?.id);
      res.status(500).json({ message: "Failed to upload file" });
    }
  }));

  app.get("/api/personnel-files/:id/download", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [file] = await db.select().from(schema.personnelFiles).where(eq(schema.personnelFiles.id, id));
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      res.download(file.filePath, file.originalFileName);
    } catch (error) {
      handleAPIError(error as Error, '/api/personnel-files/download', req.user?.id);
      res.status(500).json({ message: "Failed to download file" });
    }
  }));

  app.delete("/api/personnel-files/:id", requireRole(['admin', 'hr']), asyncErrorHandler(async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [file] = await db.select().from(schema.personnelFiles).where(eq(schema.personnelFiles.id, id));
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Delete file from filesystem
      const fs = require('fs');
      try {
        fs.unlinkSync(file.filePath);
      } catch (err) {
        console.error('Error deleting file:', err);
      }

      // Delete from database
      await db.delete(schema.personnelFiles).where(eq(schema.personnelFiles.id, id));
      
      // Update file count for the employee
      await db.update(schema.archivedEmployees)
        .set({ personnelFilesCount: sql`${schema.archivedEmployees.personnelFilesCount} - 1` })
        .where(eq(schema.archivedEmployees.id, file.archivedEmployeeId));

      res.json({ message: "File deleted successfully" });
    } catch (error) {
      handleAPIError(error as Error, '/api/personnel-files', req.user?.id);
      res.status(500).json({ message: "Failed to delete file" });
    }
  }));

  // Security Settings Routes (before registerSecurityRoutes to take priority)
  app.get("/api/security/settings", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      // Return current security settings (mock implementation)
      const settings = {
        mfaRequired: false,
        passwordExpiration: 90,
        sessionTimeout: 30,
        autoLockout: true,
        emailAlerts: true,
        auditLogging: true
      };
      res.json(settings);
    } catch (error) {
      console.error("Error fetching security settings:", error);
      res.status(500).json({ message: "Failed to fetch security settings" });
    }
  });

  app.put("/api/security/settings", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const settings = req.body;
      
      // Validate settings
      if (typeof settings.mfaRequired !== 'boolean' ||
          typeof settings.passwordExpiration !== 'number' ||
          typeof settings.sessionTimeout !== 'number' ||
          typeof settings.autoLockout !== 'boolean' ||
          typeof settings.emailAlerts !== 'boolean' ||
          typeof settings.auditLogging !== 'boolean') {
        return res.status(400).json({ message: "Invalid security settings format" });
      }

      // Mock implementation - in real app, save to database
      console.log("Saving security settings:", settings);
      
      // Create activity log entry
      await storage.createActivityLog({
        userId: (req as any).user?.id || "system",
        action: "update_security_settings",
        entityType: "security",
        entityId: null,
        description: "Updated security settings",
      });

      res.json({ message: "Security settings updated successfully", settings });
    } catch (error) {
      console.error("Error saving security settings:", error);
      res.status(500).json({ message: "Failed to save security settings" });
    }
  });

  // Register security routes
  registerSecurityRoutes(app);

  // Register privacy compliance routes
  app.use('/api/privacy', isAuthenticated, privacyRoutes);


  // Support Documentation routes
  app.get('/api/support/documents', isAuthenticated, async (req, res) => {
    try {
      const { category, search, difficulty } = req.query;
      
      // Build query conditions safely using Drizzle's sql template literals
      const conditions = [sql`is_published = true`];
      
      if (category) {
        conditions.push(sql`category = ${category}`);
      }
      if (difficulty) {
        conditions.push(sql`difficulty = ${difficulty}`);
      }
      if (search) {
        conditions.push(sql`(title ILIKE ${'%' + search + '%'} OR content ILIKE ${'%' + search + '%'})`);
      }
      
      const whereClause = conditions.length > 1 
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql`WHERE ${conditions[0]}`;
      
      const result = await db.execute(sql`
        SELECT * FROM support_documents ${whereClause} ORDER BY created_at DESC
      `);
      res.json(result.rows || result);
    } catch (error) {
      console.error('Error fetching support documents:', error);
      res.status(500).json({ message: 'Failed to fetch support documents' });
    }
  });

  app.post('/api/support/documents', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const userId = req.user?.id;
      const { title, content, excerpt, category, tags = [], difficulty = 'beginner' } = req.body;
      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const result = await db.execute(sql`
        INSERT INTO support_documents (title, content, excerpt, category, tags, difficulty, is_published, author_id, slug)
        VALUES (${title}, ${content}, ${excerpt}, ${category}, ${tags}, ${difficulty}, true, ${userId}, ${slug})
        RETURNING *
      `);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating support document:', error);
      res.status(500).json({ message: 'Failed to create support document' });
    }
  });

  app.get('/api/support/categories', isAuthenticated, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM support_categories WHERE is_active = true ORDER BY sort_order
      `);
      res.json(result.rows || result);
    } catch (error) {
      console.error('Error fetching support categories:', error);
      res.status(500).json({ message: 'Failed to fetch support categories' });
    }
  });

  app.get('/api/support/bookmarks', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const result = await db.execute(sql`
        SELECT document_id FROM support_bookmarks WHERE user_id = ${userId}
      `);
      const bookmarks = (result.rows || result).map((row: any) => row.document_id);
      res.json(bookmarks);
    } catch (error) {
      console.error('Error fetching support bookmarks:', error);
      res.status(500).json({ message: 'Failed to fetch support bookmarks' });
    }
  });

  app.post('/api/support/bookmarks', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { documentId } = req.body;
      
      const [bookmark] = await db.insert(schema.supportBookmarks).values({
        userId,
        documentId,
      }).returning();
      
      res.json(bookmark);
    } catch (error) {
      console.error('Error creating support bookmark:', error);
      res.status(500).json({ message: 'Failed to create support bookmark' });
    }
  });

  app.delete('/api/support/bookmarks/:documentId', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const documentId = parseInt(req.params.documentId);
      
      await db.delete(schema.supportBookmarks)
        .where(and(
          eq(schema.supportBookmarks.userId, userId),
          eq(schema.supportBookmarks.documentId, documentId)
        ));
      
      res.json({ message: 'Bookmark removed' });
    } catch (error) {
      console.error('Error removing support bookmark:', error);
      res.status(500).json({ message: 'Failed to remove support bookmark' });
    }
  });

  app.post('/api/support/feedback', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const feedbackData = {
        ...req.body,
        userId,
      };
      
      const [feedback] = await db.insert(schema.supportFeedback).values(feedbackData).returning();
      res.json(feedback);
    } catch (error) {
      console.error('Error submitting support feedback:', error);
      res.status(500).json({ message: 'Failed to submit support feedback' });
    }
  });

  // Support Ticket routes
  app.get('/api/support/tickets', isAuthenticated, async (req, res) => {
    try {
      const { status, priority, category } = req.query;
      let query = db.select().from(schema.supportTickets);
      
      if (status) {
        query = query.where(eq(schema.supportTickets.status, status as string));
      }
      if (priority) {
        query = query.where(eq(schema.supportTickets.priority, priority as string));
      }
      if (category) {
        query = query.where(eq(schema.supportTickets.category, category as string));
      }
      
      const tickets = await query.orderBy(desc(schema.supportTickets.createdAt));
      res.json(tickets);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      res.status(500).json({ message: 'Failed to fetch support tickets' });
    }
  });

  app.post('/api/support/tickets', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      const ticketData = {
        ...req.body,
        ticketNumber,
        createdBy: userId,
      };
      
      const [ticket] = await db.insert(schema.supportTickets).values(ticketData).returning();
      res.json(ticket);
    } catch (error) {
      console.error('Error creating support ticket:', error);
      res.status(500).json({ message: 'Failed to create support ticket' });
    }
  });

  app.patch('/api/support/tickets/:id/status', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const { status } = req.body;
      
      const [ticket] = await db.update(schema.supportTickets)
        .set({ status, updatedAt: new Date() })
        .where(eq(schema.supportTickets.id, ticketId))
        .returning();
      
      res.json(ticket);
    } catch (error) {
      console.error('Error updating support ticket status:', error);
      res.status(500).json({ message: 'Failed to update support ticket status' });
    }
  });

  // Security Updates routes
  app.get('/api/security/updates', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { severity, status, search } = req.query;
      let query = db.select().from(schema.securityUpdates);
      
      if (severity) {
        query = query.where(eq(schema.securityUpdates.severity, severity as string));
      }
      if (status) {
        query = query.where(eq(schema.securityUpdates.status, status as string));
      }
      
      const updates = await query.orderBy(desc(schema.securityUpdates.createdAt));
      res.json(updates);
    } catch (error) {
      console.error('Error fetching security updates:', error);
      res.status(500).json({ message: 'Failed to fetch security updates' });
    }
  });

  app.post('/api/security/updates', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const userId = req.user?.id;
      const updateData = {
        ...req.body,
        releasedBy: userId,
      };
      
      const [update] = await db.insert(schema.securityUpdates).values(updateData).returning();
      res.json(update);
    } catch (error) {
      console.error('Error creating security update:', error);
      res.status(500).json({ message: 'Failed to create security update' });
    }
  });

  app.patch('/api/security/updates/:id/status', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const updateId = parseInt(req.params.id);
      const { status } = req.body;
      const userId = req.user?.id;
      
      const updateData: any = { status, updatedAt: new Date() };
      
      if (status === 'approved') {
        updateData.approvedBy = userId;
        updateData.approvedAt = new Date();
      } else if (status === 'deployed') {
        updateData.deployedBy = userId;
        updateData.deployedAt = new Date();
      }
      
      const [update] = await db.update(schema.securityUpdates)
        .set(updateData)
        .where(eq(schema.securityUpdates.id, updateId))
        .returning();
      
      res.json(update);
    } catch (error) {
      console.error('Error updating security update status:', error);
      res.status(500).json({ message: 'Failed to update security update status' });
    }
  });

  app.get('/api/security/notifications', isAuthenticated, async (req, res) => {
    try {
      const notifications = await db.select().from(schema.securityNotifications)
        .where(eq(schema.securityNotifications.isActive, true))
        .orderBy(desc(schema.securityNotifications.createdAt));
      
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching security notifications:', error);
      res.status(500).json({ message: 'Failed to fetch security notifications' });
    }
  });

  app.post('/api/security/notifications', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const userId = req.user?.id;
      const notificationData = {
        ...req.body,
        createdBy: userId,
      };
      
      const [notification] = await db.insert(schema.securityNotifications).values(notificationData).returning();
      res.json(notification);
    } catch (error) {
      console.error('Error creating security notification:', error);
      res.status(500).json({ message: 'Failed to create security notification' });
    }
  });

  app.get('/api/security/vulnerabilities', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const vulnerabilities = await db.select().from(schema.vulnerabilityAssessments)
        .orderBy(desc(schema.vulnerabilityAssessments.discoveredAt));
      
      res.json(vulnerabilities);
    } catch (error) {
      console.error('Error fetching vulnerability assessments:', error);
      res.status(500).json({ message: 'Failed to fetch vulnerability assessments' });
    }
  });

  // Monthly timecard endpoints
  app.get("/api/monthly-timecard/:employeeId/:month/:year", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, month, year } = req.params;
      const timecard = await storage.getMonthlyTimecard(parseInt(employeeId), parseInt(month), parseInt(year));
      res.json(timecard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monthly timecard", error: (error as Error).message });
    }
  });

  app.post("/api/monthly-timecard", isAuthenticated, async (req, res) => {
    try {
      const timecard = await storage.createMonthlyTimecard(req.body);
      res.status(201).json(timecard);
    } catch (error) {
      res.status(400).json({ message: "Failed to create monthly timecard", error: (error as Error).message });
    }
  });

  app.put("/api/monthly-timecard/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const timecard = await storage.updateMonthlyTimecard(parseInt(id), req.body);
      res.json(timecard);
    } catch (error) {
      res.status(500).json({ message: "Failed to update monthly timecard", error: (error as Error).message });
    }
  });

  // Dropdown options routes
  app.get('/api/dropdown-options/:category', async (req, res) => {
    try {
      const category = req.params.category;
      const options = await storage.getDropdownOptions(category);
      res.json(options);
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      res.status(500).json({ message: "Failed to fetch dropdown options" });
    }
  });

  app.get('/api/dropdown-options', async (req, res) => {
    try {
      const options = await storage.getAllDropdownOptions();
      res.json(options);
    } catch (error) {
      console.error('Error fetching all dropdown options:', error);
      res.status(500).json({ message: "Failed to fetch all dropdown options" });
    }
  });

  app.post('/api/dropdown-options', isAuthenticated, async (req, res) => {
    try {
      const validation = insertDropdownOptionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const option = await storage.createDropdownOption(validation.data);
      res.json(option);
    } catch (error) {
      console.error('Error creating dropdown option:', error);
      res.status(500).json({ message: "Failed to create dropdown option" });
    }
  });

  app.put('/api/dropdown-options/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertDropdownOptionSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const option = await storage.updateDropdownOption(id, validation.data);
      res.json(option);
    } catch (error) {
      console.error('Error updating dropdown option:', error);
      res.status(500).json({ message: "Failed to update dropdown option" });
    }
  });

  app.delete('/api/dropdown-options/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDropdownOption(id);
      res.json({ message: "Dropdown option deleted successfully" });
    } catch (error) {
      console.error('Error deleting dropdown option:', error);
      res.status(500).json({ message: "Failed to delete dropdown option" });
    }
  });

  // Monthly Timecards Routes
  app.get('/api/monthly-timecards/:employeeId', isAuthenticated, async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const timecards = await storage.getMonthlyTimecardsByEmployee(employeeId);
      res.json(timecards);
    } catch (error) {
      console.error('Error fetching monthly timecards:', error);
      res.status(500).json({ message: 'Failed to fetch monthly timecards' });
    }
  });

  app.get('/api/monthly-timecards/site/:site', isAuthenticated, async (req, res) => {
    try {
      const site = req.params.site;
      const timecards = await storage.getMonthlyTimecardsBySite(site);
      res.json(timecards);
    } catch (error) {
      console.error('Error fetching monthly timecards by site:', error);
      res.status(500).json({ message: 'Failed to fetch monthly timecards by site' });
    }
  });

  app.get('/api/monthly-timecards', isAuthenticated, async (req, res) => {
    try {
      const timecards = await storage.getAllMonthlyTimecards();
      res.json(timecards);
    } catch (error) {
      console.error('Error fetching all monthly timecards:', error);
      res.status(500).json({ message: 'Failed to fetch monthly timecards' });
    }
  });

  app.post('/api/monthly-timecards', isAuthenticated, async (req, res) => {
    try {
      const timecard = await storage.createMonthlyTimecard(req.body);
      res.json(timecard);
    } catch (error) {
      console.error('Error creating monthly timecard:', error);
      res.status(500).json({ message: 'Failed to create monthly timecard' });
    }
  });

  // Monthly Timecard Workflow Routes
  app.post('/api/monthly-timecards/:id/submit-to-employee', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const timecardId = parseInt(req.params.id);
      const user = (req as any).user;
      
      const timecard = await storage.submitTimecardToEmployee(timecardId, user.id);
      res.json(timecard);
    } catch (error) {
      console.error('Error submitting timecard to employee:', error);
      res.status(500).json({ message: 'Failed to submit timecard to employee' });
    }
  });

  app.post('/api/monthly-timecards/:id/employee-approve', isAuthenticated, async (req, res) => {
    try {
      const timecardId = parseInt(req.params.id);
      const { notes } = req.body;
      const user = (req as any).user;
      
      const timecard = await storage.employeeApproveTimecard(timecardId, user.id, notes);
      res.json(timecard);
    } catch (error) {
      console.error('Error approving timecard by employee:', error);
      res.status(500).json({ message: 'Failed to approve timecard' });
    }
  });

  app.post('/api/monthly-timecards/:id/submit-to-admin', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const timecardId = parseInt(req.params.id);
      const user = (req as any).user;
      
      const timecard = await storage.submitTimecardToAdmin(timecardId, user.id);
      res.json(timecard);
    } catch (error) {
      console.error('Error submitting timecard to admin:', error);
      res.status(500).json({ message: 'Failed to submit timecard to admin' });
    }
  });

  app.post('/api/monthly-timecards/batch-submit-to-admin', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { timecardIds } = req.body;
      const user = (req as any).user;
      
      const results = await storage.batchSubmitTimecardsToAdmin(timecardIds, user.id);
      res.json(results);
    } catch (error) {
      console.error('Error batch submitting timecards to admin:', error);
      res.status(500).json({ message: 'Failed to batch submit timecards to admin' });
    }
  });

  app.post('/api/monthly-timecards/:id/admin-approve', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const timecardId = parseInt(req.params.id);
      const { notes } = req.body;
      const user = (req as any).user;
      
      const timecard = await storage.adminApproveTimecard(timecardId, user.id, notes);
      res.json(timecard);
    } catch (error) {
      console.error('Error approving timecard by admin:', error);
      res.status(500).json({ message: 'Failed to approve timecard' });
    }
  });

  app.post('/api/monthly-timecards/:id/submit-to-payroll', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const timecardId = parseInt(req.params.id);
      const user = (req as any).user;
      
      const timecard = await storage.submitTimecardToPayroll(timecardId, user.id);
      res.json(timecard);
    } catch (error) {
      console.error('Error submitting timecard to payroll:', error);
      res.status(500).json({ message: 'Failed to submit timecard to payroll' });
    }
  });

  app.post('/api/monthly-timecards/batch-submit-to-payroll', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { timecardIds } = req.body;
      const user = (req as any).user;
      
      const results = await storage.batchSubmitTimecardsToPayroll(timecardIds, user.id);
      res.json(results);
    } catch (error) {
      console.error('Error batch submitting timecards to payroll:', error);
      res.status(500).json({ message: 'Failed to batch submit timecards to payroll' });
    }
  });

  app.post('/api/monthly-timecards/:id/payroll-process', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const timecardId = parseInt(req.params.id);
      const { notes } = req.body;
      const user = (req as any).user;
      
      const timecard = await storage.payrollProcessTimecard(timecardId, user.id, notes);
      res.json(timecard);
    } catch (error) {
      console.error('Error processing timecard by payroll:', error);
      res.status(500).json({ message: 'Failed to process timecard' });
    }
  });

  app.post('/api/monthly-timecards/:id/reject', isAuthenticated, async (req, res) => {
    try {
      const timecardId = parseInt(req.params.id);
      const { reason } = req.body;
      const user = (req as any).user;
      
      const timecard = await storage.rejectMonthlyTimecard(timecardId, user.id, reason);
      res.json(timecard);
    } catch (error) {
      console.error('Error rejecting timecard:', error);
      res.status(500).json({ message: 'Failed to reject timecard' });
    }
  });

  // Timecard Locking Routes
  app.post('/api/monthly-timecards/:id/lock', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const timecardId = parseInt(req.params.id);
      const { lockReason } = req.body;
      const user = req.user as any;
      
      const timecard = await storage.lockMonthlyTimecard(timecardId, user.username, lockReason);
      res.json(timecard);
    } catch (error) {
      console.error('Error locking timecard:', error);
      res.status(500).json({ message: 'Failed to lock timecard' });
    }
  });

  app.post('/api/monthly-timecards/:id/unlock', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const timecardId = parseInt(req.params.id);
      const timecard = await storage.unlockMonthlyTimecard(timecardId);
      res.json(timecard);
    } catch (error) {
      console.error('Error unlocking timecard:', error);
      res.status(500).json({ message: 'Failed to unlock timecard' });
    }
  });

  // Substitute Timecard Locking Routes
  app.post('/api/substitute-time-cards/:id/lock', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const timecardId = parseInt(req.params.id);
      const { lockReason } = req.body;
      const user = req.user as any;
      
      const timecard = await storage.lockSubstituteTimeCard(timecardId, user.username, lockReason);
      res.json(timecard);
    } catch (error) {
      console.error('Error locking substitute timecard:', error);
      res.status(500).json({ message: 'Failed to lock substitute timecard' });
    }
  });

  app.post('/api/substitute-time-cards/:id/unlock', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const timecardId = parseInt(req.params.id);
      const timecard = await storage.unlockSubstituteTimeCard(timecardId);
      res.json(timecard);
    } catch (error) {
      console.error('Error unlocking substitute timecard:', error);
      res.status(500).json({ message: 'Failed to unlock substitute timecard' });
    }
  });

  // Role permissions routes
  app.get('/api/role-permissions', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const permissions = await storage.getAllRolePermissions();
      res.json(permissions);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      res.status(500).json({ message: 'Failed to fetch role permissions' });
    }
  });

  app.get('/api/role-permissions/:role', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { role } = req.params;
      const permissions = await storage.getRolePermissions(role);
      res.json(permissions);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      res.status(500).json({ message: 'Failed to fetch role permissions' });
    }
  });

  app.put('/api/role-permissions/:role/:pagePath', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { role, pagePath } = req.params;
      const { canAccess } = req.body;
      const decodedPagePath = decodeURIComponent(pagePath);
      
      const permission = await storage.updateRolePermission(role, decodedPagePath, canAccess);
      res.json(permission);
    } catch (error) {
      console.error('Error updating role permission:', error);
      res.status(500).json({ message: 'Failed to update role permission' });
    }
  });

  // Security Monitoring API endpoints
  app.get("/api/security/dashboard", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { timeRange = '30' } = req.query;
      const dashboard = await SecurityMonitor.getSecurityDashboard(parseInt(timeRange as string));
      res.json(dashboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch security dashboard" });
    }
  });

  app.get("/api/security/audit", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const audit = await SecurityAudit.performSecurityAudit();
      res.json(audit);
    } catch (error) {
      res.status(500).json({ message: "Failed to perform security audit" });
    }
  });

  app.get("/api/security/compliance/:framework", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { framework } = req.params;
      const { startDate, endDate } = req.query;
      
      // Mock compliance data for now
      const complianceData = {
        framework: framework.toUpperCase(),
        period: { 
          startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), 
          endDate: endDate || new Date().toISOString()
        },
        totalAccess: 2847,
        accessDenied: 23,
        criticalEvents: 2,
        highSeverityEvents: 15,
        complianceScore: framework === 'FERPA' ? 94 : framework === 'HIPAA' ? 89 : 92
      };
      
      res.json(complianceData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch compliance data" });
    }
  });

  app.post("/api/security/alert/:alertId/resolve", requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { alertId } = req.params;
      const userId = (req as any).user.id;
      
      await SecurityMonitor.resolveSecurityAlert(parseInt(alertId), userId);
      
      res.json({ message: "Security alert resolved successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve security alert" });
    }
  });



  // E-Signature API endpoints
  app.get('/api/signature-requests', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const requests = await storage.getSignatureRequests();
      res.json(requests);
    } catch (error) {
      console.error('Error fetching signature requests:', error);
      res.status(500).json({ message: "Failed to fetch signature requests" });
    }
  });

  app.get('/api/signature-requests/pending', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const requests = await storage.getPendingSignatureRequests();
      res.json(requests);
    } catch (error) {
      console.error('Error fetching pending signature requests:', error);
      res.status(500).json({ message: "Failed to fetch pending signature requests" });
    }
  });

  app.get('/api/signature-requests/employee/:employeeId', isAuthenticated, async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const requests = await storage.getSignatureRequestsByEmployee(employeeId);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching signature requests by employee:', error);
      res.status(500).json({ message: "Failed to fetch signature requests" });
    }
  });

  app.get('/api/signature-requests/document/:documentType/:documentId', isAuthenticated, async (req, res) => {
    try {
      const { documentType, documentId } = req.params;
      const requests = await storage.getSignatureRequestsByDocument(documentType, parseInt(documentId));
      res.json(requests);
    } catch (error) {
      console.error('Error fetching signature requests by document:', error);
      res.status(500).json({ message: "Failed to fetch signature requests" });
    }
  });

  app.get('/api/signature-requests/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getSignatureRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Signature request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error('Error fetching signature request:', error);
      res.status(500).json({ message: "Failed to fetch signature request" });
    }
  });

  app.post('/api/signature-requests', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const validation = insertSignatureRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const request = await storage.createSignatureRequest(validation.data);
      res.json(request);
    } catch (error) {
      console.error('Error creating signature request:', error);
      res.status(500).json({ message: "Failed to create signature request" });
    }
  });

  app.put('/api/signature-requests/:id', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertSignatureRequestSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const request = await storage.updateSignatureRequest(id, validation.data);
      res.json(request);
    } catch (error) {
      console.error('Error updating signature request:', error);
      res.status(500).json({ message: "Failed to update signature request" });
    }
  });

  app.delete('/api/signature-requests/:id', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSignatureRequest(id);
      res.json({ message: "Signature request deleted successfully" });
    } catch (error) {
      console.error('Error deleting signature request:', error);
      res.status(500).json({ message: "Failed to delete signature request" });
    }
  });

  app.post('/api/signature-requests/:id/sign', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { signatureData, signedBy } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');
      
      const request = await storage.markSignatureRequestSigned(id, signatureData, signedBy, ipAddress, userAgent);
      res.json(request);
    } catch (error) {
      console.error('Error signing signature request:', error);
      res.status(500).json({ message: "Failed to sign signature request" });
    }
  });

  app.post('/api/signature-requests/:id/decline', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { notes } = req.body;
      
      const request = await storage.markSignatureRequestDeclined(id, notes);
      res.json(request);
    } catch (error) {
      console.error('Error declining signature request:', error);
      res.status(500).json({ message: "Failed to decline signature request" });
    }
  });

  app.post('/api/signature-requests/:id/reminder', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.sendSignatureRequestReminder(id);
      res.json(request);
    } catch (error) {
      console.error('Error sending signature request reminder:', error);
      res.status(500).json({ message: "Failed to send reminder" });
    }
  });

  // Signature Templates API endpoints
  app.get('/api/signature-templates', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const templates = await storage.getSignatureTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching signature templates:', error);
      res.status(500).json({ message: "Failed to fetch signature templates" });
    }
  });

  app.get('/api/signature-templates/active', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const templates = await storage.getActiveSignatureTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching active signature templates:', error);
      res.status(500).json({ message: "Failed to fetch active signature templates" });
    }
  });

  app.get('/api/signature-templates/document-type/:documentType', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { documentType } = req.params;
      const templates = await storage.getSignatureTemplatesByDocumentType(documentType);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching signature templates by document type:', error);
      res.status(500).json({ message: "Failed to fetch signature templates" });
    }
  });

  app.get('/api/signature-templates/:id', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getSignatureTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Signature template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error('Error fetching signature template:', error);
      res.status(500).json({ message: "Failed to fetch signature template" });
    }
  });

  app.post('/api/signature-templates', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const validation = insertSignatureTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const template = await storage.createSignatureTemplate(validation.data);
      res.json(template);
    } catch (error) {
      console.error('Error creating signature template:', error);
      res.status(500).json({ message: "Failed to create signature template" });
    }
  });

  app.put('/api/signature-templates/:id', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertSignatureTemplateSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.errors });
      }
      
      const template = await storage.updateSignatureTemplate(id, validation.data);
      res.json(template);
    } catch (error) {
      console.error('Error updating signature template:', error);
      res.status(500).json({ message: "Failed to update signature template" });
    }
  });

  app.delete('/api/signature-templates/:id', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSignatureTemplate(id);
      res.json({ message: "Signature template deleted successfully" });
    } catch (error) {
      console.error('Error deleting signature template:', error);
      res.status(500).json({ message: "Failed to delete signature template" });
    }
  });

  // Employee Account Management Routes
  app.get('/api/employee-accounts', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const accounts = await storage.getEmployeeAccounts();
      res.json(accounts);
    } catch (error) {
      console.error('Error fetching employee accounts:', error);
      res.status(500).json({ message: "Failed to fetch employee accounts" });
    }
  });

  app.post('/api/employee-accounts/create', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { employeeId, username, password, tempPassword } = req.body;
      const user = (req as any).user;
      
      const account = await storage.createEmployeeAccount({
        employeeId,
        username,
        password,
        tempPassword,
        createdBy: user.id
      });
      
      res.json(account);
    } catch (error) {
      console.error('Error creating employee account:', error);
      res.status(500).json({ message: "Failed to create employee account" });
    }
  });

  app.post('/api/employee-accounts/:id/grant-access', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const { temporaryUntil, notes } = req.body;
      const user = (req as any).user;
      
      const account = await storage.grantEmployeeAccess(accountId, user.id, temporaryUntil, notes);
      res.json(account);
    } catch (error) {
      console.error('Error granting employee access:', error);
      res.status(500).json({ message: "Failed to grant employee access" });
    }
  });

  app.post('/api/employee-accounts/:id/revoke-access', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const { notes } = req.body;
      const user = (req as any).user;
      
      const account = await storage.revokeEmployeeAccess(accountId, user.id, notes);
      res.json(account);
    } catch (error) {
      console.error('Error revoking employee access:', error);
      res.status(500).json({ message: "Failed to revoke employee access" });
    }
  });

  app.post('/api/employee-accounts/:id/reset-password', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const { newPassword, requirePasswordChange } = req.body;
      const user = (req as any).user;
      
      const result = await storage.resetEmployeePassword(accountId, newPassword, requirePasswordChange, user.id);
      res.json(result);
    } catch (error) {
      console.error('Error resetting employee password:', error);
      res.status(500).json({ message: "Failed to reset employee password" });
    }
  });

  app.put('/api/employee-accounts/:id', isAuthenticated, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      const { loginEnabled, notes } = req.body;
      const user = (req as any).user;
      
      const account = await storage.updateEmployeeAccount(accountId, {
        loginEnabled,
        notes,
        updatedBy: user.id
      });
      
      res.json(account);
    } catch (error) {
      console.error('Error updating employee account:', error);
      res.status(500).json({ message: "Failed to update employee account" });
    }
  });

  // Benefits documents routes
  app.get('/api/benefits/documents', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { classification, type, planYear, search } = req.query;
      
      let documents;
      if (search) {
        documents = await storage.searchBenefitsDocuments(search as string);
      } else if (classification) {
        documents = await storage.getBenefitsDocumentsByClassification(classification as string);
      } else if (type) {
        documents = await storage.getBenefitsDocumentsByType(type as string);
      } else if (planYear) {
        documents = await storage.getBenefitsDocumentsByPlanYear(planYear as string);
      } else {
        documents = await storage.getBenefitsDocuments();
      }
      
      res.json(documents);
    } catch (error) {
      console.error('Error fetching benefits documents:', error);
      res.status(500).json({ message: 'Failed to fetch benefits documents' });
    }
  });

  app.get('/api/benefits/documents/:id', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getBenefitsDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Benefits document not found' });
      }
      
      res.json(document);
    } catch (error) {
      console.error('Error fetching benefits document:', error);
      res.status(500).json({ message: 'Failed to fetch benefits document' });
    }
  });

  app.post('/api/benefits/documents', requireRole(['admin', 'hr']), upload.single('file'), async (req, res) => {
    try {
      const user = (req as any).user;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const documentData = {
        title: req.body.title,
        description: req.body.description,
        documentType: req.body.documentType,
        classification: req.body.classification,
        planYear: req.body.planYear,
        fileName: file.filename,
        fileUrl: `/uploads/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: user.id,
        category: req.body.category,
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : null,
        expirationDate: req.body.expirationDate ? new Date(req.body.expirationDate) : null,
      };

      const document = await storage.createBenefitsDocument(documentData);
      res.json(document);
    } catch (error) {
      console.error('Error creating benefits document:', error);
      res.status(500).json({ message: 'Failed to create benefits document' });
    }
  });

  app.put('/api/benefits/documents/:id', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = { ...req.body };
      
      if (updateData.tags && typeof updateData.tags === 'string') {
        updateData.tags = JSON.parse(updateData.tags);
      }
      
      if (updateData.effectiveDate) {
        updateData.effectiveDate = new Date(updateData.effectiveDate);
      }
      
      if (updateData.expirationDate) {
        updateData.expirationDate = new Date(updateData.expirationDate);
      }

      const document = await storage.updateBenefitsDocument(id, updateData);
      res.json(document);
    } catch (error) {
      console.error('Error updating benefits document:', error);
      res.status(500).json({ message: 'Failed to update benefits document' });
    }
  });

  app.delete('/api/benefits/documents/:id', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBenefitsDocument(id);
      res.json({ message: 'Benefits document deleted successfully' });
    } catch (error) {
      console.error('Error deleting benefits document:', error);
      res.status(500).json({ message: 'Failed to delete benefits document' });
    }
  });

  // Benefits plans routes
  app.get('/api/benefits/plans', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const { classification, type, planYear } = req.query;
      
      let plans;
      if (classification) {
        plans = await storage.getBenefitsPlansByClassification(classification as string);
      } else if (type) {
        plans = await storage.getBenefitsPlansByType(type as string);
      } else if (planYear) {
        plans = await storage.getBenefitsPlansByPlanYear(planYear as string);
      } else {
        plans = await storage.getBenefitsPlans();
      }
      
      res.json(plans);
    } catch (error) {
      console.error('Error fetching benefits plans:', error);
      res.status(500).json({ message: 'Failed to fetch benefits plans' });
    }
  });

  app.post('/api/benefits/plans', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const planData = { ...req.body };
      
      // Convert decimal strings to proper decimal values
      ['monthlyCost', 'employeeContribution', 'employerContribution', 'deductible', 'outOfPocketMax'].forEach(field => {
        if (planData[field]) {
          planData[field] = parseFloat(planData[field]);
        }
      });

      const plan = await storage.createBenefitsPlan(planData);
      res.json(plan);
    } catch (error) {
      console.error('Error creating benefits plan:', error);
      res.status(500).json({ message: 'Failed to create benefits plan' });
    }
  });

  app.put('/api/benefits/plans/:id', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = { ...req.body };
      
      // Convert decimal strings to proper decimal values
      ['monthlyCost', 'employeeContribution', 'employerContribution', 'deductible', 'outOfPocketMax'].forEach(field => {
        if (updateData[field]) {
          updateData[field] = parseFloat(updateData[field]);
        }
      });

      const plan = await storage.updateBenefitsPlan(id, updateData);
      res.json(plan);
    } catch (error) {
      console.error('Error updating benefits plan:', error);
      res.status(500).json({ message: 'Failed to update benefits plan' });
    }
  });

  app.delete('/api/benefits/plans/:id', requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBenefitsPlan(id);
      res.json({ message: 'Benefits plan deleted successfully' });
    } catch (error) {
      console.error('Error deleting benefits plan:', error);
      res.status(500).json({ message: 'Failed to delete benefits plan' });
    }
  });

  // Open Enrollment Campaign routes
  app.get('/api/open-enrollment/campaigns', requireRole(['hr', 'admin']), async (req, res) => {
    try {
      const campaigns = await storage.getOpenEnrollmentCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error('Get open enrollment campaigns error:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  });

  app.post('/api/open-enrollment/campaigns', requireRole(['hr', 'admin']), async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const campaignData = {
        ...req.body,
        createdBy: user.id
      };
      
      const campaign = await storage.createOpenEnrollmentCampaign(campaignData);
      res.status(201).json(campaign);
    } catch (error) {
      console.error('Create open enrollment campaign error:', error);
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  });

  app.put('/api/open-enrollment/campaigns/:id', requireRole(['hr', 'admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.updateOpenEnrollmentCampaign(id, req.body);
      res.json(campaign);
    } catch (error) {
      console.error('Update open enrollment campaign error:', error);
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  });

  app.delete('/api/open-enrollment/campaigns/:id', requireRole(['hr', 'admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteOpenEnrollmentCampaign(id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete open enrollment campaign error:', error);
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  });

  // Send open enrollment emails
  app.post('/api/open-enrollment/campaigns/:id/send', requireRole(['hr', 'admin']), async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const { classifications } = req.body;
      
      // Get campaign details
      const campaigns = await storage.getOpenEnrollmentCampaigns();
      const campaign = campaigns.find(c => c.id === campaignId);
      
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // Get employees based on classifications
      const employees = await storage.getEmployeesForOpenEnrollment(classifications);
      
      // Get documents for each classification
      const documents = await storage.getBenefitsDocuments();
      
      let emailsSent = 0;
      let emailsFailed = 0;
      
      for (const employee of employees) {
        if (!employee.email) {
          emailsFailed++;
          continue;
        }
        
        // Filter documents for this employee's classification
        const employeeDocuments = documents.filter(doc => 
          doc.classification === employee.employeeType && 
          doc.planYear === campaign.planYear
        );
        
        // Create email record
        const emailRecord = await storage.createOpenEnrollmentEmail({
          campaignId,
          employeeId: employee.id,
          classification: employee.employeeType || '',
          emailAddress: employee.email,
          documentIds: JSON.stringify(employeeDocuments.map(d => d.id)),
          status: 'pending',
          sentBy: (req as any).user?.id || 'system'
        });
        
        // Send email using SendGrid
        const emailParams = {
          employeeEmail: employee.email,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          classification: employee.employeeType || '',
          campaignName: campaign.campaignName,
          planYear: campaign.planYear,
          documents: employeeDocuments.map(doc => ({
            id: doc.id,
            title: doc.title,
            fileName: doc.fileName,
            fileUrl: doc.fileUrl,
            fileSize: doc.fileSize || 0
          })),
          customMessage: campaign.emailTemplate || undefined,
          senderEmail: campaign.senderEmail || 'hr@district.edu',
          senderName: campaign.senderName || 'HR Department'
        };
        
        const { sendOpenEnrollmentEmail } = await import('./sendgrid');
        const success = await sendOpenEnrollmentEmail(emailParams);
        
        if (success) {
          await storage.updateOpenEnrollmentEmail(emailRecord.id, {
            status: 'sent',
            sentAt: new Date()
          });
          emailsSent++;
        } else {
          await storage.updateOpenEnrollmentEmail(emailRecord.id, {
            status: 'failed',
            failureReason: 'Email delivery failed'
          });
          emailsFailed++;
        }
      }
      
      // Update campaign statistics
      await storage.updateOpenEnrollmentCampaign(campaignId, {
        emailsSent: emailsSent,
        emailsFailed: emailsFailed,
        totalEmployees: employees.length,
        status: 'active'
      });
      
      res.json({
        success: true,
        emailsSent,
        emailsFailed,
        totalEmployees: employees.length
      });
      
    } catch (error) {
      console.error('Send open enrollment emails error:', error);
      res.status(500).json({ error: 'Failed to send emails' });
    }
  });

  // Get open enrollment email logs
  app.get('/api/open-enrollment/campaigns/:id/emails', requireRole(['hr', 'admin']), async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const emails = await storage.getOpenEnrollmentEmails(campaignId);
      res.json(emails);
    } catch (error) {
      console.error('Get open enrollment emails error:', error);
      res.status(500).json({ error: 'Failed to fetch email logs' });
    }
  });

  // Register system owner routes
  registerSystemOwnerRoutes(app);
  
  // Serve attached_assets directory for PAF templates and other assets
  app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets'), {
    setHeaders: (res, filePath) => {
      if (path.extname(filePath) === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
      }
    }
  }));



  // Register PAF routes
  registerPafRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
