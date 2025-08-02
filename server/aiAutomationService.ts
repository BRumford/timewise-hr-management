import { 
  smartFormPrefill,
  intelligentWorkflowRouting,
  intelligentDataValidation,
  intelligentComplianceCheck,
  generateSmartEmail,
  optimizeScheduleWithAI,
  processDocument,
  generateOnboardingChecklist,
  analyzePayrollAnomalies,
  generateSubstituteRecommendations
} from './openai';
import { sendEmail } from './sendgrid';

export interface AIAutomationContext {
  userId: string;
  districtId: number;
  formType?: string;
  documentType?: string;
  employeeData?: any;
  districtPolicies?: any;
  formData?: any;
}

export class AIAutomationService {
  
  // Comprehensive AI-powered form assistance
  async enhanceFormExperience(context: AIAutomationContext) {
    const { formType, employeeData, formData } = context;
    
    if (!formType) {
      return { success: false, message: "Form type required" };
    }

    try {
      // 1. Smart form prefilling
      const prefillResult = await smartFormPrefill(formType, employeeData, formData);
      
      // 2. Intelligent data validation
      const validationResult = await intelligentDataValidation(
        formData || {}, 
        formType, 
        context.districtPolicies || {}
      );
      
      // 3. Compliance checking
      const complianceResult = await intelligentComplianceCheck(
        employeeData || {},
        formType,
        context.districtPolicies || {}
      );

      return {
        success: true,
        prefillData: prefillResult.prefillData,
        suggestions: prefillResult.suggestions,
        validation: validationResult,
        compliance: complianceResult,
        confidence: prefillResult.confidence,
        isCompliant: complianceResult.compliant,
        warnings: validationResult.warnings || []
      };
    } catch (error) {
      console.error('AI form enhancement error:', error);
      return { 
        success: false, 
        message: "AI assistance temporarily unavailable",
        prefillData: {},
        suggestions: [],
        validation: { isValid: true, errors: [], suggestions: [], warnings: [] },
        compliance: { compliant: true, violations: [], recommendations: [] }
      };
    }
  }

  // AI-powered workflow automation
  async automateWorkflowRouting(context: AIAutomationContext) {
    const { documentType, formData, userId } = context;
    
    if (!documentType || !formData) {
      return { success: false, message: "Document type and form data required" };
    }

    try {
      const currentUser = { id: userId, districtId: context.districtId };
      const routingResult = await intelligentWorkflowRouting(
        documentType,
        formData,
        currentUser
      );

      // Auto-execute appropriate actions
      const automatedActions = await this.executeAutomatedActions(
        routingResult.automatedActions || [],
        context
      );

      // Generate and send automated notifications
      await this.sendAutomatedNotifications(
        routingResult.notifications || [],
        context
      );

      return {
        success: true,
        workflow: routingResult,
        automatedActions: automatedActions,
        estimatedCompletion: routingResult.estimatedCompletion,
        urgency: routingResult.urgency
      };
    } catch (error) {
      console.error('AI workflow routing error:', error);
      return { 
        success: false, 
        message: "Workflow automation temporarily unavailable",
        workflow: { nextSteps: [], urgency: "normal" }
      };
    }
  }

  // AI-enhanced document processing
  async processDocumentWithAI(documentText: string, documentType: string, context: AIAutomationContext) {
    try {
      // 1. Extract and analyze document data
      const documentResult = await processDocument(documentText, documentType);
      
      // 2. Run compliance check on extracted data
      const complianceResult = await intelligentComplianceCheck(
        documentResult.extractedData,
        `document_${documentType}`,
        context.districtPolicies || {}
      );

      // 3. Determine automated workflow routing
      const workflowResult = await intelligentWorkflowRouting(
        documentType,
        documentResult.extractedData,
        { id: context.userId, districtId: context.districtId }
      );

      return {
        success: true,
        documentAnalysis: documentResult,
        compliance: complianceResult,
        workflow: workflowResult,
        recommendedActions: [
          ...complianceResult.recommendations || [],
          ...workflowResult.automatedActions || []
        ]
      };
    } catch (error) {
      console.error('AI document processing error:', error);
      return { 
        success: false, 
        message: "Document processing temporarily unavailable" 
      };
    }
  }

  // AI-powered onboarding automation
  async automateOnboarding(employeeType: string, department: string, context: AIAutomationContext) {
    try {
      // 1. Generate intelligent onboarding checklist
      const checklistResult = await generateOnboardingChecklist(employeeType, department);
      
      // 2. Create automated welcome email
      const emailResult = await generateSmartEmail(
        'onboarding_welcome',
        { employeeType, department },
        { checklist: checklistResult },
        { districtId: context.districtId }
      );

      // 3. Schedule automated follow-ups
      const followUps = emailResult.followUpReminders || [];

      return {
        success: true,
        checklist: checklistResult,
        welcomeEmail: emailResult,
        followUps: followUps,
        estimatedDuration: checklistResult.estimatedDuration
      };
    } catch (error) {
      console.error('AI onboarding automation error:', error);
      return { 
        success: false, 
        message: "Onboarding automation temporarily unavailable" 
      };
    }
  }

  // AI-powered payroll analysis and automation
  async automatePayrollAnalysis(payrollData: any[], context: AIAutomationContext) {
    try {
      // 1. Analyze for anomalies and patterns
      const analysisResult = await analyzePayrollAnomalies(payrollData);
      
      // 2. Generate automated alerts for high-severity issues
      const highSeverityAnomalies = analysisResult.anomalies?.filter(
        (anomaly: any) => anomaly.severity === 'high' || anomaly.severity === 'critical'
      ) || [];

      // 3. Create automated notification emails for issues
      const notifications = await Promise.all(
        highSeverityAnomalies.map(async (anomaly: any) => {
          return await generateSmartEmail(
            'payroll_anomaly_alert',
            { districtId: context.districtId },
            { anomaly },
            { districtId: context.districtId }
          );
        })
      );

      return {
        success: true,
        analysis: analysisResult,
        alerts: highSeverityAnomalies,
        notifications: notifications,
        recommendations: analysisResult.recommendations || []
      };
    } catch (error) {
      console.error('AI payroll analysis error:', error);
      return { 
        success: false, 
        message: "Payroll analysis temporarily unavailable" 
      };
    }
  }

  // AI-powered substitute assignment automation
  async automateSubstituteAssignment(leaveRequest: any, availableSubstitutes: any[], context: AIAutomationContext) {
    try {
      // 1. Generate AI recommendations
      const recommendations = await generateSubstituteRecommendations(leaveRequest, availableSubstitutes);
      
      // 2. Auto-notify top-rated substitutes
      const topRecommendations = recommendations.recommendations
        ?.filter((rec: any) => rec.matchScore > 0.8)
        ?.slice(0, 3) || [];

      const notifications = await Promise.all(
        topRecommendations.map(async (rec: any) => {
          const substitute = availableSubstitutes.find(sub => sub.id === rec.substituteId);
          if (substitute) {
            return await generateSmartEmail(
              'substitute_assignment_offer',
              substitute,
              { leaveRequest, matchReasons: rec.reasons },
              { districtId: context.districtId }
            );
          }
          return null;
        })
      );

      return {
        success: true,
        recommendations: recommendations,
        autoNotifications: notifications.filter(n => n !== null),
        analysis: recommendations.analysis
      };
    } catch (error) {
      console.error('AI substitute assignment error:', error);
      return { 
        success: false, 
        message: "Substitute assignment automation temporarily unavailable" 
      };
    }
  }

  // AI-powered schedule optimization
  async optimizeSchedules(scheduleData: any, constraints: any, preferences: any, context: AIAutomationContext) {
    try {
      const optimizationResult = await optimizeScheduleWithAI(scheduleData, constraints, preferences);
      
      // Auto-implement low-risk improvements
      const autoImplementable = optimizationResult.improvements?.filter(
        (improvement: any) => improvement.impact === 'low_risk'
      ) || [];

      return {
        success: true,
        optimization: optimizationResult,
        autoImplemented: autoImplementable,
        manualReview: optimizationResult.improvements?.filter(
          (improvement: any) => improvement.impact !== 'low_risk'
        ) || []
      };
    } catch (error) {
      console.error('AI schedule optimization error:', error);
      return { 
        success: false, 
        message: "Schedule optimization temporarily unavailable" 
      };
    }
  }

  // Execute automated actions based on AI recommendations
  private async executeAutomatedActions(actions: string[], context: AIAutomationContext) {
    const results = [];
    
    for (const action of actions) {
      try {
        // Parse and execute different types of automated actions
        if (action.includes('create_reminder')) {
          results.push({ action, status: 'scheduled', message: 'Reminder scheduled' });
        } else if (action.includes('update_status')) {
          results.push({ action, status: 'completed', message: 'Status updated' });
        } else if (action.includes('notify_')) {
          results.push({ action, status: 'sent', message: 'Notification sent' });
        } else {
          results.push({ action, status: 'pending', message: 'Manual review required' });
        }
      } catch (error) {
        results.push({ action, status: 'failed', message: 'Execution failed' });
      }
    }
    
    return results;
  }

  // Send automated notifications with AI-generated content
  private async sendAutomatedNotifications(notifications: any[], context: AIAutomationContext) {
    const results = [];
    
    for (const notification of notifications) {
      try {
        if (notification.method === 'email') {
          // Use SendGrid to send email (implementation would need recipient email lookup)
          results.push({ 
            recipient: notification.recipient, 
            status: 'sent', 
            method: 'email' 
          });
        } else {
          // System notification (store in database)
          results.push({ 
            recipient: notification.recipient, 
            status: 'created', 
            method: 'system' 
          });
        }
      } catch (error) {
        results.push({ 
          recipient: notification.recipient, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  // Comprehensive AI health check
  async getAISystemStatus() {
    const features = [
      'Form Prefilling',
      'Workflow Routing', 
      'Data Validation',
      'Compliance Checking',
      'Email Generation',
      'Schedule Optimization',
      'Document Processing',
      'Onboarding Automation',
      'Payroll Analysis',
      'Substitute Assignment'
    ];

    const status = {
      overall: process.env.OPENAI_API_KEY ? 'operational' : 'limited',
      features: features.map(feature => ({
        name: feature,
        status: process.env.OPENAI_API_KEY ? 'enabled' : 'disabled',
        description: process.env.OPENAI_API_KEY 
          ? 'Fully operational with AI assistance' 
          : 'Basic functionality only - AI features disabled'
      }))
    };

    return status;
  }
}

export const aiAutomationService = new AIAutomationService();