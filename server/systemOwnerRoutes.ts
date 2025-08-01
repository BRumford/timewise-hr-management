import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";

interface SystemOwnerUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isSystemOwner: boolean;
}

interface SystemOwnerRequest extends Request {
  systemOwner?: SystemOwnerUser;
}

export function registerSystemOwnerRoutes(app: Express) {
  // System owner authentication routes
  app.post('/api/system-owner/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user || !user.isSystemOwner) {
        return res.status(401).json({ message: "Invalid credentials or not a system owner" });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash || '');
      if (!isValid) {
        await storage.incrementFailedLoginAttempts(user.id);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if account is locked
      if (user.accountLocked && user.lockedUntil && new Date() < user.lockedUntil) {
        return res.status(423).json({ message: "Account is temporarily locked" });
      }

      // Update login tracking
      await storage.resetFailedLoginAttempts(user.id);
      await storage.updateLastLogin(user.id);

      // Store system owner session
      (req.session as any).systemOwner = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isSystemOwner: true
      };

      // Log system owner access
      await storage.logSystemOwnerAccess({
        systemOwnerId: user.id,
        districtId: null,
        action: 'login',
        details: { email },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isSystemOwner: true
        }
      });
    } catch (error) {
      console.error('System owner login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // System owner logout
  app.post('/api/system-owner/logout', (req, res) => {
    const session = req.session as any;
    if (session.systemOwner) {
      session.destroy((err: any) => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
  });

  // Middleware to check system owner authentication
  const requireSystemOwner = (req: SystemOwnerRequest, res: Response, next: NextFunction) => {
    const session = req.session as any;
    if (!session.systemOwner || !session.systemOwner.isSystemOwner) {
      return res.status(401).json({ message: "System owner access required" });
    }
    req.systemOwner = session.systemOwner;
    next();
  };

  // Get all districts
  app.get('/api/system-owner/districts', requireSystemOwner, async (req: Request, res: Response) => {
    const systemOwnerReq = req as SystemOwnerRequest;
    try {
      const districts = await storage.getAllDistricts();
      res.json(districts);
    } catch (error) {
      console.error('Error fetching districts:', error);
      res.status(500).json({ message: "Failed to fetch districts" });
    }
  });

  // Get specific district
  app.get('/api/system-owner/districts/:id', requireSystemOwner, async (req: Request, res: Response) => {
    const systemOwnerReq = req as SystemOwnerRequest;
    try {
      const districtId = parseInt(req.params.id);
      const district = await storage.getDistrict(districtId);
      
      if (!district) {
        return res.status(404).json({ message: "District not found" });
      }

      res.json(district);
    } catch (error) {
      console.error('Error fetching district:', error);
      res.status(500).json({ message: "Failed to fetch district" });
    }
  });

  // District impersonation - creates a session for the specified district
  app.post('/api/system-owner/impersonate/:districtId', requireSystemOwner, async (req: Request, res: Response) => {
    const systemOwnerReq = req as SystemOwnerRequest;
    try {
      const districtId = parseInt(req.params.districtId);
      const district = await storage.getDistrict(districtId);
      
      if (!district) {
        return res.status(404).json({ message: "District not found" });
      }

      // Log the impersonation
      await storage.logSystemOwnerAccess({
        systemOwnerId: systemOwnerReq.systemOwner.id,
        districtId: districtId,
        action: 'impersonate_district',
        details: { districtName: district.name },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Store impersonation in session
      (req.session as any).impersonation = {
        systemOwnerId: systemOwnerReq.systemOwner.id,
        districtId: districtId,
        districtName: district.name,
        startedAt: new Date()
      };

      res.json({ 
        success: true, 
        district: {
          id: district.id,
          name: district.name,
          slug: district.slug
        }
      });
    } catch (error) {
      console.error('Error impersonating district:', error);
      res.status(500).json({ message: "Failed to impersonate district" });
    }
  });

  // End district impersonation
  app.post('/api/system-owner/end-impersonation', requireSystemOwner, async (req: Request, res: Response) => {
    try {
      const session = req.session as any;
      
      if (session.impersonation) {
        // Log end of impersonation
        await storage.logSystemOwnerAccess({
          systemOwnerId: session.impersonation.systemOwnerId,
          districtId: session.impersonation.districtId,
          action: 'end_impersonation',
          details: { 
            districtName: session.impersonation.districtName,
            duration: Date.now() - new Date(session.impersonation.startedAt).getTime()
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        delete session.impersonation;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error ending impersonation:', error);
      res.status(500).json({ message: "Failed to end impersonation" });
    }
  });

  // Workflow management routes
  app.get('/api/system-owner/workflows', requireSystemOwner, async (req: Request, res: Response) => {
    try {
      const districtId = req.query.districtId ? parseInt(req.query.districtId as string) : undefined;
      const workflows = await storage.getDistrictWorkflows(districtId);
      res.json(workflows);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      res.status(500).json({ message: "Failed to fetch workflows" });
    }
  });

  app.post('/api/system-owner/workflows', requireSystemOwner, async (req: Request, res: Response) => {
    const systemOwnerReq = req as SystemOwnerRequest;
    try {
      const { name, description, workflowType, districtId, configuration } = req.body;
      const workflowData = {
        districtId,
        name,
        description,
        category: workflowType,
        isActive: true,
        isTemplate: false,
        workflowSteps: configuration?.steps || [],
        triggers: configuration?.triggers || {},
        conditions: configuration?.conditions || {},
        settings: configuration?.settings || {},
        assignedRoles: configuration?.assignedRoles || [],
        approvalRequired: configuration?.approvalRequired || false,
        createdBy: systemOwnerReq.systemOwner.id,
        lastModifiedBy: systemOwnerReq.systemOwner.id
      };

      const workflow = await storage.createDistrictWorkflow(workflowData);

      // Log workflow creation
      await storage.logSystemOwnerAccess({
        systemOwnerId: systemOwnerReq.systemOwner.id,
        districtId: workflow.districtId,
        action: 'create_workflow',
        details: { workflowName: workflow.name, workflowId: workflow.id },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json(workflow);
    } catch (error) {
      console.error('Error creating workflow:', error);
      res.status(500).json({ message: "Failed to create workflow" });
    }
  });

  app.put('/api/system-owner/workflows/:id', requireSystemOwner, async (req: Request, res: Response) => {
    const systemOwnerReq = req as SystemOwnerRequest;
    try {
      const workflowId = parseInt(req.params.id);
      const updateData = {
        ...req.body,
        lastModifiedBy: systemOwnerReq.systemOwner.id
      };

      const workflow = await storage.updateDistrictWorkflow(workflowId, updateData);

      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      // Log workflow modification
      await storage.logSystemOwnerAccess({
        systemOwnerId: systemOwnerReq.systemOwner.id,
        districtId: workflow.districtId,
        action: 'modify_workflow',
        details: { workflowName: workflow.name, workflowId: workflow.id },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(workflow);
    } catch (error) {
      console.error('Error updating workflow:', error);
      res.status(500).json({ message: "Failed to update workflow" });
    }
  });

  app.delete('/api/system-owner/workflows/:id', requireSystemOwner, async (req: Request, res: Response) => {
    const systemOwnerReq = req as SystemOwnerRequest;
    try {
      const workflowId = parseInt(req.params.id);
      const success = await storage.deleteDistrictWorkflow(workflowId);

      if (!success) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      // Log workflow deletion
      await storage.logSystemOwnerAccess({
        systemOwnerId: systemOwnerReq.systemOwner.id,
        districtId: null, // We don't have district info after deletion
        action: 'delete_workflow',
        details: { workflowId },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting workflow:', error);
      res.status(500).json({ message: "Failed to delete workflow" });
    }
  });

  // Workflow execution routes
  app.get('/api/system-owner/workflow-executions', requireSystemOwner, async (req: Request, res: Response) => {
    try {
      const districtId = req.query.districtId ? parseInt(req.query.districtId as string) : undefined;
      const executions = await storage.getWorkflowExecutions(districtId);
      res.json(executions);
    } catch (error) {
      console.error('Error fetching workflow executions:', error);
      res.status(500).json({ message: "Failed to fetch workflow executions" });
    }
  });

  app.post('/api/system-owner/workflow-executions', requireSystemOwner, async (req: Request, res: Response) => {
    const systemOwnerReq = req as SystemOwnerRequest;
    try {
      const executionData = {
        workflowId: req.body.workflowId,
        districtId: req.body.districtId,
        executedBy: systemOwnerReq.systemOwner.id,
        triggerType: 'manual',
        status: req.body.status || 'running',
        inputData: req.body.inputData || {},
        outputData: {},
        stepResults: [],
        startedAt: new Date()
      };

      const execution = await storage.createWorkflowExecution(executionData);
      res.status(201).json(execution);
    } catch (error) {
      console.error('Error creating workflow execution:', error);
      res.status(500).json({ message: "Failed to create workflow execution" });
    }
  });

  // Get system owner access logs
  app.get('/api/system-owner/access-logs', requireSystemOwner, async (req: Request, res: Response) => {
    try {
      // This would need a dedicated method in storage, for now return empty array
      res.json([]);
    } catch (error) {
      console.error('Error fetching access logs:', error);
      res.status(500).json({ message: "Failed to fetch access logs" });
    }
  });

  // Check system owner session
  app.get('/api/system-owner/session', (req, res) => {
    const session = req.session as any;
    if (session.systemOwner && session.systemOwner.isSystemOwner) {
      res.json({ 
        isAuthenticated: true, 
        user: session.systemOwner,
        impersonation: session.impersonation || null
      });
    } else {
      res.json({ isAuthenticated: false });
    }
  });
}