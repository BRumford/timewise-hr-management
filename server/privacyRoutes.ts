import { Router } from "express";
import { privacyService } from "./privacyService";
import { z } from "zod";
import { 
  insertPrivacyPolicySchema,
  insertTermsOfServiceSchema,
  insertDataProcessingAgreementSchema,
  insertUserConsentSchema,
  insertDataRetentionPolicySchema,
  insertDataDeletionRequestSchema,
  insertPrivacyImpactAssessmentSchema,
  insertDataBreachIncidentSchema 
} from "@shared/schema";

const router = Router();

// ===========================================
// PRIVACY POLICIES
// ===========================================

router.get("/privacy-policies", async (req, res) => {
  try {
    const policies = await privacyService.getPrivacyPolicies();
    res.json(policies);
  } catch (error) {
    console.error("Error fetching privacy policies:", error);
    res.status(500).json({ message: "Failed to fetch privacy policies" });
  }
});

router.get("/privacy-policies/active", async (req, res) => {
  try {
    const policy = await privacyService.getActivePrivacyPolicy();
    res.json(policy);
  } catch (error) {
    console.error("Error fetching active privacy policy:", error);
    res.status(500).json({ message: "Failed to fetch active privacy policy" });
  }
});

router.post("/privacy-policies", async (req: any, res) => {
  try {
    const validatedData = insertPrivacyPolicySchema.parse({
      ...req.body,
      createdBy: req.user.id
    });
    const policy = await privacyService.createPrivacyPolicy(validatedData);
    res.status(201).json(policy);
  } catch (error) {
    console.error("Error creating privacy policy:", error);
    res.status(500).json({ message: "Failed to create privacy policy" });
  }
});

router.put("/privacy-policies/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertPrivacyPolicySchema.partial().parse(req.body);
    const policy = await privacyService.updatePrivacyPolicy(id, validatedData);
    res.json(policy);
  } catch (error) {
    console.error("Error updating privacy policy:", error);
    res.status(500).json({ message: "Failed to update privacy policy" });
  }
});

// ===========================================
// TERMS OF SERVICE
// ===========================================

router.get("/terms-of-service", async (req, res) => {
  try {
    const terms = await privacyService.getTermsOfService();
    res.json(terms);
  } catch (error) {
    console.error("Error fetching terms of service:", error);
    res.status(500).json({ message: "Failed to fetch terms of service" });
  }
});

router.get("/terms-of-service/active", async (req, res) => {
  try {
    const terms = await privacyService.getActiveTermsOfService();
    res.json(terms);
  } catch (error) {
    console.error("Error fetching active terms of service:", error);
    res.status(500).json({ message: "Failed to fetch active terms of service" });
  }
});

router.post("/terms-of-service", async (req: any, res) => {
  try {
    const validatedData = insertTermsOfServiceSchema.parse({
      ...req.body,
      createdBy: req.user.id
    });
    const terms = await privacyService.createTermsOfService(validatedData);
    res.status(201).json(terms);
  } catch (error) {
    console.error("Error creating terms of service:", error);
    res.status(500).json({ message: "Failed to create terms of service" });
  }
});

router.put("/terms-of-service/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertTermsOfServiceSchema.partial().parse(req.body);
    const terms = await privacyService.updateTermsOfService(id, validatedData);
    res.json(terms);
  } catch (error) {
    console.error("Error updating terms of service:", error);
    res.status(500).json({ message: "Failed to update terms of service" });
  }
});

// ===========================================
// DATA PROCESSING AGREEMENTS
// ===========================================

router.get("/data-processing-agreements", async (req, res) => {
  try {
    const agreements = await privacyService.getDataProcessingAgreements();
    res.json(agreements);
  } catch (error) {
    console.error("Error fetching data processing agreements:", error);
    res.status(500).json({ message: "Failed to fetch data processing agreements" });
  }
});

router.post("/data-processing-agreements", async (req: any, res) => {
  try {
    const validatedData = insertDataProcessingAgreementSchema.parse({
      ...req.body,
      createdBy: req.user.id
    });
    const agreement = await privacyService.createDataProcessingAgreement(validatedData);
    res.status(201).json(agreement);
  } catch (error) {
    console.error("Error creating data processing agreement:", error);
    res.status(500).json({ message: "Failed to create data processing agreement" });
  }
});

router.put("/data-processing-agreements/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertDataProcessingAgreementSchema.partial().parse(req.body);
    const agreement = await privacyService.updateDataProcessingAgreement(id, validatedData);
    res.json(agreement);
  } catch (error) {
    console.error("Error updating data processing agreement:", error);
    res.status(500).json({ message: "Failed to update data processing agreement" });
  }
});

router.delete("/data-processing-agreements/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await privacyService.deleteDataProcessingAgreement(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting data processing agreement:", error);
    res.status(500).json({ message: "Failed to delete data processing agreement" });
  }
});

// ===========================================
// USER CONSENTS
// ===========================================

router.get("/user-consents/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const consents = await privacyService.getUserConsents(userId);
    res.json(consents);
  } catch (error) {
    console.error("Error fetching user consents:", error);
    res.status(500).json({ message: "Failed to fetch user consents" });
  }
});

router.post("/user-consents", async (req, res) => {
  try {
    const validatedData = insertUserConsentSchema.parse({
      ...req.body,
      consentDate: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    const consent = await privacyService.recordUserConsent(validatedData);
    res.status(201).json(consent);
  } catch (error) {
    console.error("Error recording user consent:", error);
    res.status(500).json({ message: "Failed to record user consent" });
  }
});

router.post("/user-consents/:userId/withdraw", async (req, res) => {
  try {
    const { userId } = req.params;
    const { consentType } = req.body;
    await privacyService.withdrawUserConsent(userId, consentType);
    res.status(200).json({ message: "Consent withdrawn successfully" });
  } catch (error) {
    console.error("Error withdrawing user consent:", error);
    res.status(500).json({ message: "Failed to withdraw user consent" });
  }
});

router.get("/user-consents/:userId/check/:consentType", async (req, res) => {
  try {
    const { userId, consentType } = req.params;
    const hasConsent = await privacyService.checkUserConsent(userId, consentType);
    res.json({ hasConsent });
  } catch (error) {
    console.error("Error checking user consent:", error);
    res.status(500).json({ message: "Failed to check user consent" });
  }
});

// ===========================================
// DATA RETENTION POLICIES
// ===========================================

router.get("/data-retention-policies", async (req, res) => {
  try {
    const policies = await privacyService.getDataRetentionPolicies();
    res.json(policies);
  } catch (error) {
    console.error("Error fetching data retention policies:", error);
    res.status(500).json({ message: "Failed to fetch data retention policies" });
  }
});

router.post("/data-retention-policies", async (req: any, res) => {
  try {
    const validatedData = insertDataRetentionPolicySchema.parse({
      ...req.body,
      createdBy: req.user.id
    });
    const policy = await privacyService.createDataRetentionPolicy(validatedData);
    res.status(201).json(policy);
  } catch (error) {
    console.error("Error creating data retention policy:", error);
    res.status(500).json({ message: "Failed to create data retention policy" });
  }
});

router.put("/data-retention-policies/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertDataRetentionPolicySchema.partial().parse(req.body);
    const policy = await privacyService.updateDataRetentionPolicy(id, validatedData);
    res.json(policy);
  } catch (error) {
    console.error("Error updating data retention policy:", error);
    res.status(500).json({ message: "Failed to update data retention policy" });
  }
});

router.delete("/data-retention-policies/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await privacyService.deleteDataRetentionPolicy(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting data retention policy:", error);
    res.status(500).json({ message: "Failed to delete data retention policy" });
  }
});

// ===========================================
// DATA DELETION REQUESTS (RIGHT TO BE FORGOTTEN)
// ===========================================

router.get("/data-deletion-requests", async (req, res) => {
  try {
    const requests = await privacyService.getDataDeletionRequests();
    res.json(requests);
  } catch (error) {
    console.error("Error fetching data deletion requests:", error);
    res.status(500).json({ message: "Failed to fetch data deletion requests" });
  }
});

router.post("/data-deletion-requests", async (req: any, res) => {
  try {
    const validatedData = insertDataDeletionRequestSchema.parse({
      ...req.body,
      requesterId: req.user.id,
      requestDate: new Date()
    });
    const request = await privacyService.createDataDeletionRequest(validatedData);
    res.status(201).json(request);
  } catch (error) {
    console.error("Error creating data deletion request:", error);
    res.status(500).json({ message: "Failed to create data deletion request" });
  }
});

router.put("/data-deletion-requests/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertDataDeletionRequestSchema.partial().parse(req.body);
    const request = await privacyService.updateDataDeletionRequest(id, validatedData);
    res.json(request);
  } catch (error) {
    console.error("Error updating data deletion request:", error);
    res.status(500).json({ message: "Failed to update data deletion request" });
  }
});

router.post("/data-deletion-requests/:id/approve", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const request = await privacyService.approveDataDeletionRequest(id, req.user.id);
    res.json(request);
  } catch (error) {
    console.error("Error approving data deletion request:", error);
    res.status(500).json({ message: "Failed to approve data deletion request" });
  }
});

router.post("/data-deletion-requests/:id/reject", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rejectionReason } = req.body;
    const request = await privacyService.rejectDataDeletionRequest(id, req.user.id, rejectionReason);
    res.json(request);
  } catch (error) {
    console.error("Error rejecting data deletion request:", error);
    res.status(500).json({ message: "Failed to reject data deletion request" });
  }
});

router.post("/data-deletion-requests/:id/process", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await privacyService.processDataDeletion(id);
    res.json({ message: "Data deletion processed successfully" });
  } catch (error) {
    console.error("Error processing data deletion:", error);
    res.status(500).json({ message: "Failed to process data deletion" });
  }
});

// ===========================================
// PRIVACY IMPACT ASSESSMENTS
// ===========================================

router.get("/privacy-impact-assessments", async (req, res) => {
  try {
    const assessments = await privacyService.getPrivacyImpactAssessments();
    res.json(assessments);
  } catch (error) {
    console.error("Error fetching privacy impact assessments:", error);
    res.status(500).json({ message: "Failed to fetch privacy impact assessments" });
  }
});

router.post("/privacy-impact-assessments", async (req: any, res) => {
  try {
    const validatedData = insertPrivacyImpactAssessmentSchema.parse({
      ...req.body,
      assessorId: req.user.id
    });
    const assessment = await privacyService.createPrivacyImpactAssessment(validatedData);
    res.status(201).json(assessment);
  } catch (error) {
    console.error("Error creating privacy impact assessment:", error);
    res.status(500).json({ message: "Failed to create privacy impact assessment" });
  }
});

router.put("/privacy-impact-assessments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertPrivacyImpactAssessmentSchema.partial().parse(req.body);
    const assessment = await privacyService.updatePrivacyImpactAssessment(id, validatedData);
    res.json(assessment);
  } catch (error) {
    console.error("Error updating privacy impact assessment:", error);
    res.status(500).json({ message: "Failed to update privacy impact assessment" });
  }
});

router.delete("/privacy-impact-assessments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await privacyService.deletePrivacyImpactAssessment(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting privacy impact assessment:", error);
    res.status(500).json({ message: "Failed to delete privacy impact assessment" });
  }
});

// ===========================================
// DATA BREACH INCIDENTS
// ===========================================

router.get("/data-breach-incidents", async (req, res) => {
  try {
    const incidents = await privacyService.getDataBreachIncidents();
    res.json(incidents);
  } catch (error) {
    console.error("Error fetching data breach incidents:", error);
    res.status(500).json({ message: "Failed to fetch data breach incidents" });
  }
});

router.post("/data-breach-incidents", async (req: any, res) => {
  try {
    const validatedData = insertDataBreachIncidentSchema.parse({
      ...req.body,
      reportedBy: req.user.id
    });
    const incident = await privacyService.createDataBreachIncident(validatedData);
    res.status(201).json(incident);
  } catch (error) {
    console.error("Error creating data breach incident:", error);
    res.status(500).json({ message: "Failed to create data breach incident" });
  }
});

router.put("/data-breach-incidents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertDataBreachIncidentSchema.partial().parse(req.body);
    const incident = await privacyService.updateDataBreachIncident(id, validatedData);
    res.json(incident);
  } catch (error) {
    console.error("Error updating data breach incident:", error);
    res.status(500).json({ message: "Failed to update data breach incident" });
  }
});

router.delete("/data-breach-incidents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await privacyService.deleteDataBreachIncident(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting data breach incident:", error);
    res.status(500).json({ message: "Failed to delete data breach incident" });
  }
});

// ===========================================
// COMPLIANCE REPORTING
// ===========================================

router.get("/compliance/retention-summary", async (req, res) => {
  try {
    const summary = await privacyService.getDataRetentionSummary();
    res.json(summary);
  } catch (error) {
    console.error("Error fetching data retention summary:", error);
    res.status(500).json({ message: "Failed to fetch data retention summary" });
  }
});

router.get("/compliance/metrics", async (req, res) => {
  try {
    const metrics = await privacyService.getComplianceMetrics();
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching compliance metrics:", error);
    res.status(500).json({ message: "Failed to fetch compliance metrics" });
  }
});

export default router;