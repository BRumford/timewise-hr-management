import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { db } from './db';
import { 
  extraPayContracts, 
  extraPayRequests, 
  extraPayCustomFields,
  extraPayWorkflowTemplates,
  extraPayWorkflowExecutions,
  employees,
  districts,
  insertExtraPayContractSchema,
  insertExtraPayRequestSchema,
  insertExtraPayCustomFieldSchema,
  insertExtraPayWorkflowTemplateSchema,
  type ExtraPayContract,
  type ExtraPayRequest,
  type ExtraPayCustomField,
  type ExtraPayWorkflowTemplate,
  type InsertExtraPayContract,
  type InsertExtraPayRequest,
  type InsertExtraPayCustomField,
  type InsertExtraPayWorkflowTemplate
} from '@shared/schema';
import { eq, and, desc, asc, like, or } from 'drizzle-orm';
import { ExtraPayTimestampService } from './extraPayTimestampService';

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    districtId?: number;
  };
}

const router = Router();

// Helper function to get user's district ID (implement based on your auth system)
const getUserDistrictId = (req: AuthenticatedRequest): number => {
  // This should be implemented based on your authentication system
  // For now, returning a default value - replace with actual implementation
  return req.user?.districtId || 1;
};

const getUserId = (req: AuthenticatedRequest): string => {
  return req.user?.id || 'unknown';
};

const getUserRole = (req: AuthenticatedRequest): string => {
  return req.user?.role || 'user';
};

// Contract Management Routes
router.get('/contracts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const districtId = getUserDistrictId(req);
    const { status, search, limit = '50', offset = '0' } = req.query;

    // Build conditions for filtering
    const conditions = [eq(extraPayContracts.districtId, districtId)];
    
    if (status && typeof status === 'string') {
      conditions.push(eq(extraPayContracts.status, status));
    }

    if (search && typeof search === 'string') {
      conditions.push(or(
        like(extraPayContracts.title, `%${search}%`),
        like(extraPayContracts.description, `%${search}%`)
      ));
    }

    const contracts = await db
      .select()
      .from(extraPayContracts)
      .where(and(...conditions))
      .orderBy(desc(extraPayContracts.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json(contracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

router.get('/contracts/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = parseInt(req.params.id);
    const districtId = getUserDistrictId(req);

    const [contract] = await db
      .select()
      .from(extraPayContracts)
      .where(and(
        eq(extraPayContracts.id, contractId),
        eq(extraPayContracts.districtId, districtId)
      ));

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Get timeline for this contract
    const timeline = await ExtraPayTimestampService.getEntityTimeline('contract', contractId);

    res.json({ ...contract, timeline });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

router.post('/contracts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const districtId = getUserDistrictId(req);
    const userId = getUserId(req);
    const userRole = getUserRole(req);
    
    const contractData: InsertExtraPayContract = {
      ...insertExtraPayContractSchema.parse(req.body),
      districtId,
      createdBy: userId
    };

    const [contract] = await db
      .insert(extraPayContracts)
      .values(contractData)
      .returning();

    // Record creation event
    await ExtraPayTimestampService.recordContractCreated(
      contract.id,
      districtId,
      userId,
      userRole,
      { contractData }
    );

    res.status(201).json(contract);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating contract:', error);
    res.status(500).json({ error: 'Failed to create contract' });
  }
});

router.patch('/contracts/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = parseInt(req.params.id);
    const districtId = getUserDistrictId(req);
    const userId = getUserId(req);
    const userRole = getUserRole(req);

    // Get current contract for status tracking
    const [currentContract] = await db
      .select()
      .from(extraPayContracts)
      .where(and(
        eq(extraPayContracts.id, contractId),
        eq(extraPayContracts.districtId, districtId)
      ));

    if (!currentContract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const updateData = insertExtraPayContractSchema.partial().parse(req.body);
    
    const [updatedContract] = await db
      .update(extraPayContracts)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(extraPayContracts.id, contractId),
        eq(extraPayContracts.districtId, districtId)
      ))
      .returning();

    // Record status change if status was updated
    if (updateData.status && updateData.status !== currentContract.status) {
      await ExtraPayTimestampService.recordContractStatusChange(
        contractId,
        districtId,
        userId,
        userRole,
        currentContract.status,
        updateData.status,
        updateData
      );
    }

    res.json(updatedContract);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating contract:', error);
    res.status(500).json({ error: 'Failed to update contract' });
  }
});

router.delete('/contracts/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contractId = parseInt(req.params.id);
    const districtId = getUserDistrictId(req);

    const [deletedContract] = await db
      .delete(extraPayContracts)
      .where(and(
        eq(extraPayContracts.id, contractId),
        eq(extraPayContracts.districtId, districtId)
      ))
      .returning();

    if (!deletedContract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json({ message: 'Contract deleted successfully' });
  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({ error: 'Failed to delete contract' });
  }
});

// Request Management Routes
router.get('/requests', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const districtId = getUserDistrictId(req);
    const { status, contractId, employeeId, limit = '50', offset = '0' } = req.query;

    // Build conditions for filtering
    const conditions = [eq(extraPayRequests.districtId, districtId)];
    
    if (status && typeof status === 'string') {
      conditions.push(eq(extraPayRequests.status, status));
    }
    
    if (contractId && typeof contractId === 'string') {
      conditions.push(eq(extraPayRequests.contractId, parseInt(contractId)));
    }
    
    if (employeeId && typeof employeeId === 'string') {
      conditions.push(eq(extraPayRequests.employeeId, parseInt(employeeId)));
    }

    const requests = await db
      .select({
        id: extraPayRequests.id,
        employeeId: extraPayRequests.employeeId,
        contractId: extraPayRequests.contractId,
        description: extraPayRequests.description,
        amount: extraPayRequests.amount,
        status: extraPayRequests.status,
        createdAt: extraPayRequests.createdAt,
        employeeName: employees.firstName,
        employeeLastName: employees.lastName,
        contractTitle: extraPayContracts.title
      })
      .from(extraPayRequests)
      .leftJoin(employees, eq(extraPayRequests.employeeId, employees.id))
      .leftJoin(extraPayContracts, eq(extraPayRequests.contractId, extraPayContracts.id))
      .where(and(...conditions))
      .orderBy(desc(extraPayRequests.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

router.get('/requests/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    const districtId = getUserDistrictId(req);

    const [request] = await db
      .select({
        id: extraPayRequests.id,
        employeeId: extraPayRequests.employeeId,
        contractId: extraPayRequests.contractId,
        description: extraPayRequests.description,
        amount: extraPayRequests.amount,
        status: extraPayRequests.status,
        createdAt: extraPayRequests.createdAt,
        employeeName: employees.firstName,
        employeeLastName: employees.lastName,
        contractTitle: extraPayContracts.title
      })
      .from(extraPayRequests)
      .leftJoin(employees, eq(extraPayRequests.employeeId, employees.id))
      .leftJoin(extraPayContracts, eq(extraPayRequests.contractId, extraPayContracts.id))
      .where(and(
        eq(extraPayRequests.id, requestId),
        eq(extraPayRequests.districtId, districtId)
      ));

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Get timeline for this request
    const timeline = await ExtraPayTimestampService.getEntityTimeline('request', requestId);

    res.json({ ...request, timeline });
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

router.post('/requests', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const districtId = getUserDistrictId(req);
    const userId = getUserId(req);
    const userRole = getUserRole(req);
    
    const requestData: InsertExtraPayRequest = {
      ...insertExtraPayRequestSchema.parse(req.body),
      districtId,
      requestedBy: userId
    };

    const [request] = await db
      .insert(extraPayRequests)
      .values(requestData)
      .returning();

    // Record creation event
    await ExtraPayTimestampService.recordRequestCreated(
      request.id,
      districtId,
      userId,
      userRole,
      request.contractId || undefined,
      { requestData }
    );

    res.status(201).json(request);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

router.patch('/requests/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    const districtId = getUserDistrictId(req);
    const userId = getUserId(req);
    const userRole = getUserRole(req);
    const { workflowStep, comments } = req.body;

    const [updatedRequest] = await db
      .update(extraPayRequests)
      .set({
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(extraPayRequests.id, requestId),
        eq(extraPayRequests.districtId, districtId)
      ))
      .returning();

    if (!updatedRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Record approval event
    await ExtraPayTimestampService.recordRequestApproved(
      requestId,
      districtId,
      userId,
      userRole,
      workflowStep,
      { comments }
    );

    res.json(updatedRequest);
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

router.patch('/requests/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    const districtId = getUserDistrictId(req);
    const userId = getUserId(req);
    const userRole = getUserRole(req);
    const { reason, workflowStep } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const [updatedRequest] = await db
      .update(extraPayRequests)
      .set({
        status: 'rejected',
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date()
      })
      .where(and(
        eq(extraPayRequests.id, requestId),
        eq(extraPayRequests.districtId, districtId)
      ))
      .returning();

    if (!updatedRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Record rejection event
    await ExtraPayTimestampService.recordRequestRejected(
      requestId,
      districtId,
      userId,
      userRole,
      reason,
      workflowStep
    );

    res.json(updatedRequest);
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

router.patch('/requests/:id/mark-paid', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestId = parseInt(req.params.id);
    const districtId = getUserDistrictId(req);
    const userId = getUserId(req);
    const userRole = getUserRole(req);

    const [updatedRequest] = await db
      .update(extraPayRequests)
      .set({
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(extraPayRequests.id, requestId),
        eq(extraPayRequests.districtId, districtId)
      ))
      .returning();

    if (!updatedRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Record payment event
    await ExtraPayTimestampService.recordRequestPaid(
      requestId,
      districtId,
      userId,
      userRole
    );

    res.json(updatedRequest);
  } catch (error) {
    console.error('Error marking request as paid:', error);
    res.status(500).json({ error: 'Failed to mark request as paid' });
  }
});

// Custom Fields Management Routes
router.get('/custom-fields', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const districtId = getUserDistrictId(req);
    const { section, category } = req.query;

    const conditions = [eq(extraPayCustomFields.districtId, districtId)];
    
    if (section && typeof section === 'string') {
      conditions.push(eq(extraPayCustomFields.section, section));
    }
    
    if (category && typeof category === 'string') {
      conditions.push(eq(extraPayCustomFields.category, category));
    }

    const customFields = await db
      .select()
      .from(extraPayCustomFields)
      .where(and(...conditions))
      .orderBy(asc(extraPayCustomFields.displayOrder));

    res.json(customFields);
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    res.status(500).json({ error: 'Failed to fetch custom fields' });
  }
});

router.post('/custom-fields', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const districtId = getUserDistrictId(req);
    
    const customFieldData: InsertExtraPayCustomField = {
      ...insertExtraPayCustomFieldSchema.parse(req.body),
      districtId
    };

    const [customField] = await db
      .insert(extraPayCustomFields)
      .values(customFieldData)
      .returning();

    res.status(201).json(customField);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating custom field:', error);
    res.status(500).json({ error: 'Failed to create custom field' });
  }
});

// Dashboard/Stats Routes
router.get('/dashboard-stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const districtId = getUserDistrictId(req);

    // Get contract counts by status
    const contractStats = await db
      .select({
        status: extraPayContracts.status,
        count: extraPayContracts.id
      })
      .from(extraPayContracts)
      .where(eq(extraPayContracts.districtId, districtId));

    // Get request counts by status
    const requestStats = await db
      .select({
        status: extraPayRequests.status,
        count: extraPayRequests.id
      })
      .from(extraPayRequests)
      .where(eq(extraPayRequests.districtId, districtId));

    // Get recent activity
    const recentRequests = await db
      .select({
        id: extraPayRequests.id,
        description: extraPayRequests.description,
        amount: extraPayRequests.amount,
        status: extraPayRequests.status,
        createdAt: extraPayRequests.createdAt,
        employeeName: employees.firstName,
        employeeLastName: employees.lastName
      })
      .from(extraPayRequests)
      .leftJoin(employees, eq(extraPayRequests.employeeId, employees.id))
      .where(eq(extraPayRequests.districtId, districtId))
      .orderBy(desc(extraPayRequests.createdAt))
      .limit(10);

    res.json({
      contractStats,
      requestStats,
      recentRequests
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;