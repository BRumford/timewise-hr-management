import { db } from './db';
import { extraPayTimestamps, extraPayContracts, extraPayRequests } from '@shared/schema';
import type { InsertExtraPayTimestamp } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class ExtraPayTimestampService {
  static async recordEvent(data: {
    entityType: 'contract' | 'request';
    entityId: number;
    districtId: number;
    eventType: string;
    eventDescription: string;
    userId?: string;
    userRole?: string;
    fromStatus?: string;
    toStatus?: string;
    workflowStep?: number;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const timestampData: InsertExtraPayTimestamp = {
      districtId: data.districtId,
      entityType: data.entityType,
      entityId: data.entityId,
      eventType: data.eventType,
      eventDescription: data.eventDescription,
      userId: data.userId,
      userRole: data.userRole,
      fromStatus: data.fromStatus,
      toStatus: data.toStatus,
      workflowStep: data.workflowStep,
      metadata: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    };

    await db.insert(extraPayTimestamps).values(timestampData);

    // Update the lastActivityAt timestamp on the entity
    if (data.entityType === 'contract') {
      await db
        .update(extraPayContracts)
        .set({ updatedAt: new Date() })
        .where(eq(extraPayContracts.id, data.entityId));
    } else if (data.entityType === 'request') {
      await db
        .update(extraPayRequests)
        .set({ updatedAt: new Date() })
        .where(eq(extraPayRequests.id, data.entityId));
    }
  }

  static async getEntityTimeline(entityType: 'contract' | 'request', entityId: number): Promise<any[]> {
    return await db
      .select()
      .from(extraPayTimestamps)
      .where(eq(extraPayTimestamps.entityId, entityId))
      .where(eq(extraPayTimestamps.entityType, entityType))
      .orderBy(extraPayTimestamps.timestamp);
  }

  // Helper methods for common events
  static async recordContractCreated(contractId: number, districtId: number, userId: string, userRole: string, metadata?: any): Promise<void> {
    await this.recordEvent({
      entityType: 'contract',
      entityId: contractId,
      districtId,
      eventType: 'created',
      eventDescription: 'Extra Pay contract created',
      userId,
      userRole,
      toStatus: 'draft',
      metadata,
    });
  }

  static async recordContractStatusChange(contractId: number, districtId: number, userId: string, userRole: string, fromStatus: string, toStatus: string, metadata?: any): Promise<void> {
    await this.recordEvent({
      entityType: 'contract',
      entityId: contractId,
      districtId,
      eventType: 'status_change',
      eventDescription: `Contract status changed from ${fromStatus} to ${toStatus}`,
      userId,
      userRole,
      fromStatus,
      toStatus,
      metadata,
    });
  }

  static async recordContractSigned(contractId: number, districtId: number, userId: string, userRole: string, metadata?: any): Promise<void> {
    await this.recordEvent({
      entityType: 'contract',
      entityId: contractId,
      districtId,
      eventType: 'signed',
      eventDescription: 'Contract signed electronically',
      userId,
      userRole,
      toStatus: 'signed',
      metadata,
    });
  }

  static async recordRequestCreated(requestId: number, districtId: number, userId: string, userRole: string, contractId?: number, metadata?: any): Promise<void> {
    await this.recordEvent({
      entityType: 'request',
      entityId: requestId,
      districtId,
      eventType: 'created',
      eventDescription: 'Extra Pay request created',
      userId,
      userRole,
      toStatus: 'pending',
      metadata: { contractId, ...metadata },
    });
  }

  static async recordRequestApproved(requestId: number, districtId: number, userId: string, userRole: string, workflowStep?: number, metadata?: any): Promise<void> {
    await this.recordEvent({
      entityType: 'request',
      entityId: requestId,
      districtId,
      eventType: 'approved',
      eventDescription: 'Extra Pay request approved',
      userId,
      userRole,
      fromStatus: 'pending',
      toStatus: 'approved',
      workflowStep,
      metadata,
    });
  }

  static async recordRequestRejected(requestId: number, districtId: number, userId: string, userRole: string, reason: string, workflowStep?: number, metadata?: any): Promise<void> {
    await this.recordEvent({
      entityType: 'request',
      entityId: requestId,
      districtId,
      eventType: 'rejected',
      eventDescription: `Extra Pay request rejected: ${reason}`,
      userId,
      userRole,
      fromStatus: 'pending',
      toStatus: 'rejected',
      workflowStep,
      metadata: { rejectionReason: reason, ...metadata },
    });
  }

  static async recordRequestPaid(requestId: number, districtId: number, userId: string, userRole: string, metadata?: any): Promise<void> {
    await this.recordEvent({
      entityType: 'request',
      entityId: requestId,
      districtId,
      eventType: 'paid',
      eventDescription: 'Extra Pay request marked as paid',
      userId,
      userRole,
      fromStatus: 'approved',
      toStatus: 'paid',
      metadata,
    });
  }

  static async recordWorkflowStep(entityType: 'contract' | 'request', entityId: number, districtId: number, userId: string, userRole: string, step: number, action: string, metadata?: any): Promise<void> {
    await this.recordEvent({
      entityType,
      entityId,
      districtId,
      eventType: 'workflow_step',
      eventDescription: `Workflow step ${step}: ${action}`,
      userId,
      userRole,
      workflowStep: step,
      metadata,
    });
  }
}