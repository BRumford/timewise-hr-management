import { 
  privacyPolicies,
  termsOfService,
  dataProcessingAgreements,
  userConsents,
  dataRetentionPolicies,
  dataDeletionRequests,
  privacyImpactAssessments,
  dataBreachIncidents,
  employees,
  users,
  payrollRecords,
  leaveRequests,
  documents,
  timeCards,
  type PrivacyPolicy,
  type InsertPrivacyPolicy,
  type TermsOfService,
  type InsertTermsOfService,
  type DataProcessingAgreement,
  type InsertDataProcessingAgreement,
  type UserConsent,
  type InsertUserConsent,
  type DataRetentionPolicy,
  type InsertDataRetentionPolicy,
  type DataDeletionRequest,
  type InsertDataDeletionRequest,
  type PrivacyImpactAssessment,
  type InsertPrivacyImpactAssessment,
  type DataBreachIncident,
  type InsertDataBreachIncident,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export class PrivacyService {
  // ===========================================
  // PRIVACY POLICIES
  // ===========================================

  async getPrivacyPolicies(): Promise<PrivacyPolicy[]> {
    return await db.select().from(privacyPolicies).orderBy(desc(privacyPolicies.createdAt));
  }

  async getActivePrivacyPolicy(): Promise<PrivacyPolicy | undefined> {
    const [policy] = await db
      .select()
      .from(privacyPolicies)
      .where(eq(privacyPolicies.isActive, true))
      .orderBy(desc(privacyPolicies.effectiveDate))
      .limit(1);
    return policy;
  }

  async createPrivacyPolicy(data: InsertPrivacyPolicy): Promise<PrivacyPolicy> {
    // Deactivate existing active policy if creating a new active one
    if (data.isActive) {
      await db.update(privacyPolicies)
        .set({ isActive: false })
        .where(eq(privacyPolicies.isActive, true));
    }

    const [policy] = await db
      .insert(privacyPolicies)
      .values(data)
      .returning();
    return policy;
  }

  async updatePrivacyPolicy(id: number, data: Partial<InsertPrivacyPolicy>): Promise<PrivacyPolicy> {
    // Deactivate existing active policy if updating to active
    if (data.isActive) {
      await db.update(privacyPolicies)
        .set({ isActive: false })
        .where(and(eq(privacyPolicies.isActive, true), eq(privacyPolicies.id, id)));
    }

    const [policy] = await db
      .update(privacyPolicies)
      .set(data)
      .where(eq(privacyPolicies.id, id))
      .returning();
    return policy;
  }

  // ===========================================
  // TERMS OF SERVICE
  // ===========================================

  async getTermsOfService(): Promise<TermsOfService[]> {
    return await db.select().from(termsOfService).orderBy(desc(termsOfService.createdAt));
  }

  async getActiveTermsOfService(): Promise<TermsOfService | undefined> {
    const [terms] = await db
      .select()
      .from(termsOfService)
      .where(eq(termsOfService.isActive, true))
      .orderBy(desc(termsOfService.effectiveDate))
      .limit(1);
    return terms;
  }

  async createTermsOfService(data: InsertTermsOfService): Promise<TermsOfService> {
    // Deactivate existing active terms if creating a new active one
    if (data.isActive) {
      await db.update(termsOfService)
        .set({ isActive: false })
        .where(eq(termsOfService.isActive, true));
    }

    const [terms] = await db
      .insert(termsOfService)
      .values(data)
      .returning();
    return terms;
  }

  async updateTermsOfService(id: number, data: Partial<InsertTermsOfService>): Promise<TermsOfService> {
    // Deactivate existing active terms if updating to active
    if (data.isActive) {
      await db.update(termsOfService)
        .set({ isActive: false })
        .where(and(eq(termsOfService.isActive, true), eq(termsOfService.id, id)));
    }

    const [terms] = await db
      .update(termsOfService)
      .set(data)
      .where(eq(termsOfService.id, id))
      .returning();
    return terms;
  }

  // ===========================================
  // DATA PROCESSING AGREEMENTS
  // ===========================================

  async getDataProcessingAgreements(): Promise<DataProcessingAgreement[]> {
    return await db.select().from(dataProcessingAgreements).orderBy(desc(dataProcessingAgreements.createdAt));
  }

  async createDataProcessingAgreement(data: InsertDataProcessingAgreement): Promise<DataProcessingAgreement> {
    const [agreement] = await db
      .insert(dataProcessingAgreements)
      .values(data)
      .returning();
    return agreement;
  }

  async updateDataProcessingAgreement(id: number, data: Partial<InsertDataProcessingAgreement>): Promise<DataProcessingAgreement> {
    const [agreement] = await db
      .update(dataProcessingAgreements)
      .set(data)
      .where(eq(dataProcessingAgreements.id, id))
      .returning();
    return agreement;
  }

  async deleteDataProcessingAgreement(id: number): Promise<void> {
    await db.delete(dataProcessingAgreements).where(eq(dataProcessingAgreements.id, id));
  }

  // ===========================================
  // USER CONSENTS
  // ===========================================

  async getUserConsents(userId: string): Promise<UserConsent[]> {
    return await db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, userId))
      .orderBy(desc(userConsents.consentDate));
  }

  async recordUserConsent(data: InsertUserConsent): Promise<UserConsent> {
    const [consent] = await db
      .insert(userConsents)
      .values(data)
      .returning();
    return consent;
  }

  async withdrawUserConsent(userId: string, consentType: string): Promise<void> {
    await db
      .update(userConsents)
      .set({ 
        consentGiven: false,
        withdrawnDate: new Date()
      })
      .where(and(
        eq(userConsents.userId, userId),
        eq(userConsents.consentType, consentType),
        eq(userConsents.consentGiven, true)
      ));
  }

  async checkUserConsent(userId: string, consentType: string): Promise<boolean> {
    const [consent] = await db
      .select()
      .from(userConsents)
      .where(and(
        eq(userConsents.userId, userId),
        eq(userConsents.consentType, consentType),
        eq(userConsents.consentGiven, true)
      ))
      .limit(1);
    return !!consent;
  }

  // ===========================================
  // DATA RETENTION POLICIES
  // ===========================================

  async getDataRetentionPolicies(): Promise<DataRetentionPolicy[]> {
    return await db.select().from(dataRetentionPolicies).orderBy(asc(dataRetentionPolicies.dataCategory));
  }

  async createDataRetentionPolicy(data: InsertDataRetentionPolicy): Promise<DataRetentionPolicy> {
    const [policy] = await db
      .insert(dataRetentionPolicies)
      .values(data)
      .returning();
    return policy;
  }

  async updateDataRetentionPolicy(id: number, data: Partial<InsertDataRetentionPolicy>): Promise<DataRetentionPolicy> {
    const [policy] = await db
      .update(dataRetentionPolicies)
      .set(data)
      .where(eq(dataRetentionPolicies.id, id))
      .returning();
    return policy;
  }

  async deleteDataRetentionPolicy(id: number): Promise<void> {
    await db.delete(dataRetentionPolicies).where(eq(dataRetentionPolicies.id, id));
  }

  // ===========================================
  // DATA DELETION REQUESTS (RIGHT TO BE FORGOTTEN)
  // ===========================================

  async getDataDeletionRequests(): Promise<DataDeletionRequest[]> {
    return await db.select().from(dataDeletionRequests).orderBy(desc(dataDeletionRequests.requestDate));
  }

  async createDataDeletionRequest(data: InsertDataDeletionRequest): Promise<DataDeletionRequest> {
    const [request] = await db
      .insert(dataDeletionRequests)
      .values(data)
      .returning();
    return request;
  }

  async updateDataDeletionRequest(id: number, data: Partial<InsertDataDeletionRequest>): Promise<DataDeletionRequest> {
    const [request] = await db
      .update(dataDeletionRequests)
      .set(data)
      .where(eq(dataDeletionRequests.id, id))
      .returning();
    return request;
  }

  async approveDataDeletionRequest(id: number, reviewedBy: string): Promise<DataDeletionRequest> {
    const [request] = await db
      .update(dataDeletionRequests)
      .set({
        status: "approved",
        reviewedBy,
        reviewDate: new Date()
      })
      .where(eq(dataDeletionRequests.id, id))
      .returning();
    return request;
  }

  async rejectDataDeletionRequest(id: number, reviewedBy: string, rejectionReason: string): Promise<DataDeletionRequest> {
    const [request] = await db
      .update(dataDeletionRequests)
      .set({
        status: "rejected",
        reviewedBy,
        reviewDate: new Date(),
        rejectionReason
      })
      .where(eq(dataDeletionRequests.id, id))
      .returning();
    return request;
  }

  // Process actual data deletion
  async processDataDeletion(requestId: number): Promise<void> {
    // Get the deletion request
    const [request] = await db
      .select()
      .from(dataDeletionRequests)
      .where(eq(dataDeletionRequests.id, requestId));

    if (!request || request.status !== "approved") {
      throw new Error("Invalid or unapproved deletion request");
    }

    const deletionDetails: any = {};
    const employeeId = request.employeeId;

    // Process deletion based on data categories
    if (request.dataCategories?.includes("personal")) {
      // Anonymize personal data in employees table
      await db.update(employees)
        .set({
          firstName: "DELETED",
          lastName: "USER",
          email: "deleted@example.com",
          phoneNumber: null,
          address: null
        })
        .where(eq(employees.id, employeeId!));
      deletionDetails.personal = "Anonymized employee personal data";
    }

    if (request.dataCategories?.includes("payroll")) {
      // Check retention policy for payroll data
      const retentionPolicy = await db
        .select()
        .from(dataRetentionPolicies)
        .where(eq(dataRetentionPolicies.dataCategory, "payroll"))
        .limit(1);

      if (retentionPolicy.length === 0 || !request.retentionOverride) {
        // Delete payroll records
        await db.delete(payroll).where(eq(payroll.employeeId, employeeId!));
        deletionDetails.payroll = "Deleted payroll records";
      } else {
        deletionDetails.payroll = "Payroll data retained due to legal requirement";
      }
    }

    if (request.dataCategories?.includes("leave")) {
      // Delete leave requests
      await db.delete(leaveRequests).where(eq(leaveRequests.employeeId, employeeId!));
      deletionDetails.leave = "Deleted leave request records";
    }

    if (request.dataCategories?.includes("timecards")) {
      // Delete time cards
      await db.delete(timeCards).where(eq(timeCards.employeeId, employeeId!));
      deletionDetails.timecards = "Deleted timecard records";
    }

    if (request.dataCategories?.includes("documents")) {
      // Delete documents
      await db.delete(documents).where(eq(documents.employeeId, employeeId!));
      deletionDetails.documents = "Deleted document records";
    }

    // Update deletion request as completed
    await db.update(dataDeletionRequests)
      .set({
        status: "completed",
        completionDate: new Date(),
        deletionDetails
      })
      .where(eq(dataDeletionRequests.id, requestId));
  }

  // ===========================================
  // PRIVACY IMPACT ASSESSMENTS
  // ===========================================

  async getPrivacyImpactAssessments(): Promise<PrivacyImpactAssessment[]> {
    return await db.select().from(privacyImpactAssessments).orderBy(desc(privacyImpactAssessments.assessmentDate));
  }

  async createPrivacyImpactAssessment(data: InsertPrivacyImpactAssessment): Promise<PrivacyImpactAssessment> {
    const [assessment] = await db
      .insert(privacyImpactAssessments)
      .values(data)
      .returning();
    return assessment;
  }

  async updatePrivacyImpactAssessment(id: number, data: Partial<InsertPrivacyImpactAssessment>): Promise<PrivacyImpactAssessment> {
    const [assessment] = await db
      .update(privacyImpactAssessments)
      .set(data)
      .where(eq(privacyImpactAssessments.id, id))
      .returning();
    return assessment;
  }

  async deletePrivacyImpactAssessment(id: number): Promise<void> {
    await db.delete(privacyImpactAssessments).where(eq(privacyImpactAssessments.id, id));
  }

  // ===========================================
  // DATA BREACH INCIDENTS
  // ===========================================

  async getDataBreachIncidents(): Promise<DataBreachIncident[]> {
    return await db.select().from(dataBreachIncidents).orderBy(desc(dataBreachIncidents.discoveryDate));
  }

  async createDataBreachIncident(data: InsertDataBreachIncident): Promise<DataBreachIncident> {
    const [incident] = await db
      .insert(dataBreachIncidents)
      .values(data)
      .returning();
    return incident;
  }

  async updateDataBreachIncident(id: number, data: Partial<InsertDataBreachIncident>): Promise<DataBreachIncident> {
    const [incident] = await db
      .update(dataBreachIncidents)
      .set(data)
      .where(eq(dataBreachIncidents.id, id))
      .returning();
    return incident;
  }

  async deleteDataBreachIncident(id: number): Promise<void> {
    await db.delete(dataBreachIncidents).where(eq(dataBreachIncidents.id, id));
  }

  // ===========================================
  // COMPLIANCE UTILITIES
  // ===========================================

  async getDataRetentionSummary(): Promise<any> {
    const policies = await this.getDataRetentionPolicies();
    const employeeCount = await db.select().from(employees);
    const payrollCount = await db.select().from(payroll);
    const leaveCount = await db.select().from(leaveRequests);
    const documentCount = await db.select().from(documents);
    const timecardCount = await db.select().from(timeCards);

    return {
      policies: policies.length,
      dataCategories: {
        employees: employeeCount.length,
        payroll: payrollCount.length,
        leaveRequests: leaveCount.length,
        documents: documentCount.length,
        timecards: timecardCount.length
      },
      retentionPolicies: policies.map(p => ({
        category: p.dataCategory,
        retentionPeriodYears: p.retentionPeriodYears,
        disposalMethod: p.disposalMethod
      }))
    };
  }

  async getComplianceMetrics(): Promise<any> {
    const deletionRequests = await this.getDataDeletionRequests();
    const privacyPolicies = await this.getPrivacyPolicies();
    const termsOfService = await this.getTermsOfService();
    const dataProcessingAgreements = await this.getDataProcessingAgreements();
    const privacyImpactAssessments = await this.getPrivacyImpactAssessments();
    const dataBreachIncidents = await this.getDataBreachIncidents();

    return {
      deletionRequests: {
        total: deletionRequests.length,
        pending: deletionRequests.filter(r => r.status === "pending").length,
        approved: deletionRequests.filter(r => r.status === "approved").length,
        completed: deletionRequests.filter(r => r.status === "completed").length,
        rejected: deletionRequests.filter(r => r.status === "rejected").length
      },
      policies: {
        privacy: privacyPolicies.length,
        terms: termsOfService.length,
        dataProcessing: dataProcessingAgreements.length
      },
      assessments: {
        privacyImpact: privacyImpactAssessments.length,
        dataBreaches: dataBreachIncidents.length
      }
    };
  }
}

export const privacyService = new PrivacyService();