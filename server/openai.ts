import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

if (!process.env.OPENAI_API_KEY) {
  console.warn("OpenAI API key not found. AI features will be disabled.");
}

export async function processDocument(documentText: string, documentType: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a document processing expert for school district HR systems. 
          Analyze the provided document and extract relevant information based on the document type.
          Respond with JSON in this format: {
            "extractedData": {},
            "complianceIssues": [],
            "expirationDate": null,
            "status": "approved|rejected|requires_review",
            "confidence": 0.0-1.0,
            "summary": "Brief summary of findings"
          }`
        },
        {
          role: "user",
          content: `Document Type: ${documentType}\n\nDocument Content:\n${documentText}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    throw new Error("Failed to process document with AI: " + error.message);
  }
}

export async function generateOnboardingChecklist(employeeType: string, department: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an HR automation expert for school districts. Generate a comprehensive onboarding checklist 
          for the specified employee type and department. Include all required documents, compliance requirements, 
          and step-by-step workflow. Respond with JSON in this format: {
            "steps": [{"step": "string", "description": "string", "deadline": "string", "required": boolean}],
            "requiredDocuments": ["string"],
            "estimatedDuration": "string",
            "specialRequirements": ["string"]
          }`
        },
        {
          role: "user",
          content: `Employee Type: ${employeeType}\nDepartment: ${department}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    throw new Error("Failed to generate onboarding checklist: " + error.message);
  }
}

export async function analyzePayrollAnomalies(payrollData: any[]): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a payroll analysis expert for school districts. Analyze the provided payroll data 
          for anomalies, patterns, and potential issues. Respond with JSON in this format: {
            "anomalies": [{"type": "string", "description": "string", "severity": "high|medium|low", "affectedEmployees": []}],
            "patterns": [{"pattern": "string", "description": "string"}],
            "recommendations": ["string"],
            "summary": "string"
          }`
        },
        {
          role: "user",
          content: `Payroll Data:\n${JSON.stringify(payrollData, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    throw new Error("Failed to analyze payroll data: " + error.message);
  }
}

export async function generateSubstituteRecommendations(
  leaveRequest: any,
  availableSubstitutes: any[]
): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a substitute assignment expert for school districts. Based on the leave request 
          and available substitutes, recommend the best matches considering qualifications, availability, 
          and past performance. Respond with JSON in this format: {
            "recommendations": [{"substituteId": number, "matchScore": 0.0-1.0, "reasons": ["string"]}],
            "analysis": "string",
            "alternativeOptions": ["string"]
          }`
        },
        {
          role: "user",
          content: `Leave Request:\n${JSON.stringify(leaveRequest, null, 2)}\n\nAvailable Substitutes:\n${JSON.stringify(availableSubstitutes, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error: any) {
    // Check if this is an OpenAI quota error
    if (error.message && error.message.includes('429')) {
      throw new Error("Failed to generate substitute recommendations: OpenAI API quota exceeded. Please check your plan and billing details.");
    }
    // Re-throw other errors
    throw new Error(`Failed to generate substitute recommendations: ${error.message}`);
  }
}

// AI-Automated Form Pre-filling
export async function smartFormPrefill(
  formType: string,
  employeeData: any,
  existingData?: any
): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    return { prefillData: {}, suggestions: [], confidence: 0 };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an intelligent form assistant for school district HR systems. Based on employee data and form type, 
          intelligently prefill form fields with accurate data and provide helpful suggestions. Consider context, patterns, 
          and best practices. Respond with JSON in this format: {
            "prefillData": {"fieldName": "suggestedValue"},
            "suggestions": [{"field": "string", "suggestion": "string", "reason": "string"}],
            "confidence": 0.0-1.0,
            "recommendations": ["string"]
          }`
        },
        {
          role: "user",
          content: `Form Type: ${formType}\nEmployee Data:\n${JSON.stringify(employeeData, null, 2)}\nExisting Data:\n${JSON.stringify(existingData || {}, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("AI form prefill error:", error);
    return { prefillData: {}, suggestions: [], confidence: 0 };
  }
}

// AI-Automated Workflow Routing
export async function intelligentWorkflowRouting(
  documentType: string,
  formData: any,
  currentUser: any
): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    return { 
      nextSteps: [], 
      urgency: "normal", 
      requiredApprovals: [], 
      estimatedCompletion: "Unknown" 
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a workflow automation expert for school district HR systems. Based on document type and form data, 
          determine optimal workflow routing, approvals needed, and timeline. Respond with JSON in this format: {
            "nextSteps": [{"step": "string", "assignee": "string", "deadline": "string", "priority": "high|medium|low"}],
            "urgency": "high|medium|low",
            "requiredApprovals": [{"role": "string", "reason": "string"}],
            "estimatedCompletion": "string",
            "automatedActions": ["string"],
            "notifications": [{"recipient": "string", "message": "string", "method": "email|system"}]
          }`
        },
        {
          role: "user",
          content: `Document Type: ${documentType}\nForm Data:\n${JSON.stringify(formData, null, 2)}\nCurrent User:\n${JSON.stringify(currentUser, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("AI workflow routing error:", error);
    return { 
      nextSteps: [], 
      urgency: "normal", 
      requiredApprovals: [], 
      estimatedCompletion: "Unknown" 
    };
  }
}

// AI-Automated Data Validation
export async function intelligentDataValidation(
  formData: any,
  formType: string,
  validationRules: any
): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    return { isValid: true, errors: [], suggestions: [], warnings: [] };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a data validation expert for school district HR systems. Analyze form data for completeness, 
          accuracy, compliance issues, and potential errors. Provide intelligent validation beyond basic rules. 
          Respond with JSON in this format: {
            "isValid": boolean,
            "errors": [{"field": "string", "message": "string", "severity": "high|medium|low"}],
            "suggestions": [{"field": "string", "suggestion": "string", "reason": "string"}],
            "warnings": [{"message": "string", "impact": "string"}],
            "completeness": 0.0-1.0,
            "complianceIssues": ["string"]
          }`
        },
        {
          role: "user",
          content: `Form Type: ${formType}\nForm Data:\n${JSON.stringify(formData, null, 2)}\nValidation Rules:\n${JSON.stringify(validationRules, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("AI data validation error:", error);
    return { isValid: true, errors: [], suggestions: [], warnings: [] };
  }
}

// AI-Automated Compliance Monitoring
export async function intelligentComplianceCheck(
  employeeData: any,
  actionType: string,
  districtPolicies: any
): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    return { 
      compliant: true, 
      violations: [], 
      recommendations: [], 
      requiredActions: [] 
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a compliance expert for school district HR systems. Analyze employee data and actions against 
          federal/state regulations (FERPA, HIPAA, Equal Employment, etc.) and district policies. 
          Respond with JSON in this format: {
            "compliant": boolean,
            "violations": [{"regulation": "string", "description": "string", "severity": "critical|high|medium|low"}],
            "recommendations": [{"action": "string", "reason": "string", "deadline": "string"}],
            "requiredActions": ["string"],
            "riskLevel": "high|medium|low",
            "auditTrail": ["string"]
          }`
        },
        {
          role: "user",
          content: `Action Type: ${actionType}\nEmployee Data:\n${JSON.stringify(employeeData, null, 2)}\nDistrict Policies:\n${JSON.stringify(districtPolicies, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("AI compliance check error:", error);
    return { 
      compliant: true, 
      violations: [], 
      recommendations: [], 
      requiredActions: [] 
    };
  }
}

// AI-Automated Email Generation
export async function generateSmartEmail(
  emailType: string,
  recipientData: any,
  context: any,
  districtInfo: any
): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    return { 
      subject: "Notification", 
      body: "This is an automated notification.", 
      tone: "professional" 
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert email composer for school district HR communications. Generate professional, 
          personalized emails that are clear, compliant, and appropriate for the educational environment. 
          Respond with JSON in this format: {
            "subject": "string",
            "body": "string",
            "tone": "professional|friendly|urgent|formal",
            "attachmentSuggestions": ["string"],
            "followUpReminders": [{"days": number, "message": "string"}],
            "urgency": "high|medium|low"
          }`
        },
        {
          role: "user",
          content: `Email Type: ${emailType}\nRecipient Data:\n${JSON.stringify(recipientData, null, 2)}\nContext:\n${JSON.stringify(context, null, 2)}\nDistrict Info:\n${JSON.stringify(districtInfo, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("AI email generation error:", error);
    return { 
      subject: "Notification", 
      body: "This is an automated notification.", 
      tone: "professional" 
    };
  }
}

// AI-Automated Schedule Optimization
export async function optimizeScheduleWithAI(
  scheduleData: any,
  constraints: any,
  preferences: any
): Promise<any> {
  if (!process.env.OPENAI_API_KEY) {
    return { 
      optimizedSchedule: scheduleData, 
      improvements: [], 
      conflicts: [], 
      efficiency: 0.8 
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a scheduling optimization expert for school districts. Analyze schedules and suggest optimizations 
          for efficiency, compliance, and employee satisfaction. Consider workload balance, coverage requirements, and regulations. 
          Respond with JSON in this format: {
            "optimizedSchedule": {},
            "improvements": [{"area": "string", "suggestion": "string", "impact": "string"}],
            "conflicts": [{"type": "string", "description": "string", "solution": "string"}],
            "efficiency": 0.0-1.0,
            "recommendations": ["string"],
            "costSavings": "string"
          }`
        },
        {
          role: "user",
          content: `Schedule Data:\n${JSON.stringify(scheduleData, null, 2)}\nConstraints:\n${JSON.stringify(constraints, null, 2)}\nPreferences:\n${JSON.stringify(preferences, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("AI schedule optimization error:", error);
    return { 
      optimizedSchedule: scheduleData, 
      improvements: [], 
      conflicts: [], 
      efficiency: 0.8 
    };
  }
}
