import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

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
  } catch (error) {
    throw new Error("Failed to generate substitute recommendations: " + error.message);
  }
}
