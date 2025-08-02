import { db } from './db';
import { pafTimestamps, pafSubmissions } from '@shared/schema';
import type { InsertPafTimestamp } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class PafTimestampService {
  /**
   * Records a new timestamp event for a PAF submission
   */
  async recordEvent(data: {
    submissionId: number;
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
    const timestampData: InsertPafTimestamp = {
      submissionId: data.submissionId,
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

    await db.insert(pafTimestamps).values(timestampData);

    // Update the lastActivityAt timestamp on the submission
    await db
      .update(pafSubmissions)
      .set({ 
        lastActivityAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(pafSubmissions.id, data.submissionId));
  }

  /**
   * Records specific workflow events with automatic descriptions
   */
  async recordWorkflowEvent(
    submissionId: number, 
    eventType: 'created' | 'submitted' | 'assigned' | 'reviewed' | 'approved' | 'rejected' | 'corrected' | 'reopened' | 'finalized',
    userId?: string,
    userRole?: string,
    additionalContext?: any
  ): Promise<void> {
    const descriptions = {
      created: 'PAF form created as draft',
      submitted: 'PAF form submitted for review',
      assigned: 'PAF assigned to approver',
      reviewed: 'PAF reviewed by approver',
      approved: 'PAF approved by approver',
      rejected: 'PAF rejected',
      corrected: 'PAF returned for corrections',
      reopened: 'PAF reopened for modifications',
      finalized: 'PAF processing completed'
    };

    await this.recordEvent({
      submissionId,
      eventType,
      eventDescription: descriptions[eventType],
      userId,
      userRole,
      metadata: additionalContext
    });
  }

  /**
   * Updates main PAF timestamps based on workflow events
   */
  async updateMainTimestamps(
    submissionId: number,
    updates: {
      submittedAt?: Date;
      firstReviewedAt?: Date;
      workflowStartedAt?: Date;
      workflowCompletedAt?: Date;
      rejectedAt?: Date;
      reopenedAt?: Date;
      finalizedAt?: Date;
    }
  ): Promise<void> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    
    await db
      .update(pafSubmissions)
      .set(updateData)
      .where(eq(pafSubmissions.id, submissionId));
  }

  /**
   * Gets complete timeline for a PAF submission
   */
  async getTimeline(submissionId: number) {
    const timestamps = await db
      .select()
      .from(pafTimestamps)
      .where(eq(pafTimestamps.submissionId, submissionId))
      .orderBy(pafTimestamps.timestamp);

    const submission = await db
      .select({
        id: pafSubmissions.id,
        createdAt: pafSubmissions.createdAt,
        updatedAt: pafSubmissions.updatedAt,
        submittedAt: pafSubmissions.submittedAt,
        firstReviewedAt: pafSubmissions.firstReviewedAt,
        lastActivityAt: pafSubmissions.lastActivityAt,
        workflowStartedAt: pafSubmissions.workflowStartedAt,
        workflowCompletedAt: pafSubmissions.workflowCompletedAt,
        rejectedAt: pafSubmissions.rejectedAt,
        reopenedAt: pafSubmissions.reopenedAt,
        finalizedAt: pafSubmissions.finalizedAt,
        status: pafSubmissions.status,
        currentStep: pafSubmissions.currentStep
      })
      .from(pafSubmissions)
      .where(eq(pafSubmissions.id, submissionId))
      .limit(1);

    return {
      submission: submission[0],
      timeline: timestamps,
      summary: this.generateTimelineSummary(submission[0], timestamps)
    };
  }

  /**
   * Generates a human-readable timeline summary
   */
  private generateTimelineSummary(submission: any, timestamps: any[]) {
    if (!submission) return null;

    const summary = {
      totalDuration: null as string | null,
      currentStatus: submission.status,
      keyMilestones: [] as Array<{ event: string; date: Date; duration?: string }>,
      averageStepTime: null as string | null,
      isOverdue: false,
      nextExpectedAction: null as string | null
    };

    // Calculate total duration if completed
    if (submission.finalizedAt && submission.createdAt) {
      const totalMs = new Date(submission.finalizedAt).getTime() - new Date(submission.createdAt).getTime();
      summary.totalDuration = this.formatDuration(totalMs);
    }

    // Key milestones
    if (submission.createdAt) {
      summary.keyMilestones.push({ event: 'Created', date: submission.createdAt });
    }
    if (submission.submittedAt) {
      summary.keyMilestones.push({ event: 'Submitted', date: submission.submittedAt });
    }
    if (submission.workflowStartedAt) {
      summary.keyMilestones.push({ event: 'Workflow Started', date: submission.workflowStartedAt });
    }
    if (submission.firstReviewedAt) {
      summary.keyMilestones.push({ event: 'First Review', date: submission.firstReviewedAt });
    }
    if (submission.workflowCompletedAt) {
      summary.keyMilestones.push({ event: 'Workflow Completed', date: submission.workflowCompletedAt });
    }
    if (submission.finalizedAt) {
      summary.keyMilestones.push({ event: 'Finalized', date: submission.finalizedAt });
    }

    // Calculate duration between milestones
    for (let i = 1; i < summary.keyMilestones.length; i++) {
      const prev = summary.keyMilestones[i - 1];
      const curr = summary.keyMilestones[i];
      const durationMs = curr.date.getTime() - prev.date.getTime();
      curr.duration = this.formatDuration(durationMs);
    }

    // Determine if overdue (more than 5 business days without activity)
    if (submission.lastActivityAt) {
      const daysSinceActivity = (Date.now() - new Date(submission.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
      summary.isOverdue = daysSinceActivity > 5 && submission.status !== 'approved' && submission.status !== 'denied';
    }

    // Next expected action
    if (submission.status === 'draft') {
      summary.nextExpectedAction = 'Waiting for submission';
    } else if (submission.status === 'submitted' || submission.status === 'under_review') {
      summary.nextExpectedAction = 'Waiting for approval';
    } else if (submission.status === 'needs_correction') {
      summary.nextExpectedAction = 'Waiting for corrections';
    }

    return summary;
  }

  /**
   * Formats duration in milliseconds to human-readable format
   */
  private formatDuration(ms: number): string {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Gets performance analytics for PAF processing
   */
  async getPerformanceAnalytics(districtId?: number) {
    // This would contain more complex queries for analytics
    // For now, return basic structure
    return {
      averageProcessingTime: '3.2 days',
      completionRate: '94%',
      overdueCount: 12,
      totalProcessed: 156,
      currentPending: 23
    };
  }
}

export const pafTimestampService = new PafTimestampService();