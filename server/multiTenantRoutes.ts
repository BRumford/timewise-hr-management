import type { Express, Request, Response } from "express";
import { tenantMiddleware, requireDistrict, withDistrictFilter } from './tenantMiddleware';
import { getDistrictStorage } from './multiTenantStorage';
import { getDistrictAuth, DistrictAuth } from './districtAuth';
import { db } from './db';
import { districts } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Schema for district login
const districtLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  districtSlug: z.string().min(1, "District is required")
});

// Schema for creating district users
const createDistrictUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "hr", "employee"]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  districtSlug: z.string().min(1, "District is required")
});

export function registerMultiTenantRoutes(app: Express) {
  // District-specific login endpoint
  app.post('/api/district/login', async (req: Request, res: Response) => {
    try {
      const { username, password, districtSlug } = districtLoginSchema.parse(req.body);
      
      // Get district by slug
      const district = await db.select().from(districts).where(eq(districts.slug, districtSlug)).limit(1);
      if (!district.length) {
        return res.status(404).json({ message: "District not found" });
      }
      
      // Authenticate user within district
      const districtAuth = new DistrictAuth(district[0].id);
      const authResult = await districtAuth.authenticateUser(username, password);
      
      if (!authResult.success) {
        return res.status(401).json({ message: authResult.message });
      }
      
      // Set session data
      (req as any).session.user = authResult.user;
      (req as any).session.district = district[0];
      
      res.json({
        success: true,
        user: authResult.user,
        district: {
          id: district[0].id,
          name: district[0].name,
          slug: district[0].slug,
          subscriptionTier: district[0].subscriptionTier
        }
      });
      
    } catch (error) {
      console.error("District login error:", error);
      res.status(400).json({ 
        message: "Login failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Usage stats endpoint
  app.get('/api/district/usage-stats', tenantMiddleware, requireDistrict, async (req: Request, res: Response) => {
    try {
      const districtStorage = getDistrictStorage(req);
      const [employees, leaveRequests, timeCards] = await Promise.all([
        districtStorage.getEmployees(),
        districtStorage.getLeaveRequests(),
        districtStorage.getTimeCards()
      ]);
      
      res.json({
        employeeCount: employees.length,
        leaveRequestCount: leaveRequests.length,
        timeCardCount: timeCards.length,
        documentCount: 0 // placeholder
      });
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      res.status(500).json({ message: "Failed to fetch usage stats" });
    }
  });

  // Multi-tenant employee endpoints
  app.get('/api/district/employees', tenantMiddleware, requireDistrict, async (req: Request, res: Response) => {
    try {
      const districtStorage = getDistrictStorage(req);
      const employees = await districtStorage.getEmployees();
      res.json(employees);
    } catch (error) {
      console.error("Error fetching district employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.post('/api/district/employees', tenantMiddleware, requireDistrict, async (req: Request, res: Response) => {
    try {
      const districtStorage = getDistrictStorage(req);
      const employee = await districtStorage.createEmployee(req.body);
      res.status(201).json(employee);
    } catch (error) {
      console.error("Error creating district employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.get('/api/district/employees/:id', tenantMiddleware, requireDistrict, async (req: Request, res: Response) => {
    try {
      const districtStorage = getDistrictStorage(req);
      const employee = await districtStorage.getEmployee(parseInt(req.params.id));
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error) {
      console.error("Error fetching district employee:", error);
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  // Multi-tenant leave request endpoints
  app.get('/api/district/leave-requests', tenantMiddleware, requireDistrict, async (req: Request, res: Response) => {
    try {
      const districtStorage = getDistrictStorage(req);
      const leaveRequests = await districtStorage.getLeaveRequests();
      res.json(leaveRequests);
    } catch (error) {
      console.error("Error fetching district leave requests:", error);
      res.status(500).json({ message: "Failed to fetch leave requests" });
    }
  });

  app.post('/api/district/leave-requests', tenantMiddleware, requireDistrict, async (req: Request, res: Response) => {
    try {
      const districtStorage = getDistrictStorage(req);
      const leaveRequest = await districtStorage.createLeaveRequest(req.body);
      res.status(201).json(leaveRequest);
    } catch (error) {
      console.error("Error creating district leave request:", error);
      res.status(500).json({ message: "Failed to create leave request" });
    }
  });

  // Multi-tenant timecard endpoints
  app.get('/api/district/time-cards', tenantMiddleware, requireDistrict, async (req: Request, res: Response) => {
    try {
      const districtStorage = getDistrictStorage(req);
      const timeCards = await districtStorage.getTimeCards();
      res.json(timeCards);
    } catch (error) {
      console.error("Error fetching district time cards:", error);
      res.status(500).json({ message: "Failed to fetch time cards" });
    }
  });

  app.post('/api/district/time-cards', tenantMiddleware, requireDistrict, async (req: Request, res: Response) => {
    try {
      const districtStorage = getDistrictStorage(req);
      const timeCard = await districtStorage.createTimeCard(req.body);
      res.status(201).json(timeCard);
    } catch (error) {
      console.error("Error creating district time card:", error);
      res.status(500).json({ message: "Failed to create time card" });
    }
  });

  // Multi-tenant payroll endpoints
  app.get('/api/district/payroll-records', tenantMiddleware, requireDistrict, async (req: Request, res: Response) => {
    try {
      const districtStorage = getDistrictStorage(req);
      const payrollRecords = await districtStorage.getPayrollRecords();
      res.json(payrollRecords);
    } catch (error) {
      console.error("Error fetching district payroll records:", error);
      res.status(500).json({ message: "Failed to fetch payroll records" });
    }
  });

  // Multi-tenant document endpoints
  app.get('/api/district/documents', tenantMiddleware, requireDistrict, async (req: Request, res: Response) => {
    try {
      const districtStorage = getDistrictStorage(req);
      const documents = await districtStorage.getDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching district documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // District usage and analytics
  app.get('/api/district/usage-stats', tenantMiddleware, requireDistrict, async (req: Request, res: Response) => {
    try {
      const districtStorage = getDistrictStorage(req);
      const stats = await districtStorage.getDistrictUsageStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching district usage stats:", error);
      res.status(500).json({ message: "Failed to fetch usage statistics" });
    }
  });

  // District user management
  app.get('/api/district/users', tenantMiddleware, requireDistrict, async (req: Request, res: Response) => {
    try {
      const districtAuth = getDistrictAuth(req);
      const users = await districtAuth.getUsersByDistrict();
      res.json(users);
    } catch (error) {
      console.error("Error fetching district users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/district/users', tenantMiddleware, requireDistrict, async (req: Request, res: Response) => {
    try {
      const districtAuth = getDistrictAuth(req);
      const result = await districtAuth.createDistrictUser(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      res.status(201).json(result.user);
    } catch (error) {
      console.error("Error creating district user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // District logout
  app.post('/api/district/logout', (req: Request, res: Response) => {
    (req as any).session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  });
}