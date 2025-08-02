import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Bot, 
  FileText, 
  UserPlus, 
  DollarSign, 
  Users, 
  Calendar,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AIAssistantProps {
  context?: {
    formType?: string;
    employeeData?: any;
    formData?: any;
    currentPage?: string;
  };
}

export function AIAssistant({ context }: AIAssistantProps) {
  const [selectedFunction, setSelectedFunction] = useState<string>("");
  const [documentText, setDocumentText] = useState("");
  const [documentType, setDocumentType] = useState("");
  const queryClient = useQueryClient();

  // Get AI system status
  const { data: aiStatus } = useQuery({
    queryKey: ["/api/ai/status"],
    refetchInterval: 30000 // Check every 30 seconds
  });

  // AI form enhancement mutation
  const enhanceFormMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/ai/enhance-form", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai"] });
    }
  });

  // AI document processing mutation
  const processDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/ai/process-document", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai"] });
    }
  });

  // AI onboarding automation mutation
  const automateOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/ai/automate-onboarding", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
    }
  });

  // AI workflow automation mutation
  const automateWorkflowMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/ai/automate-workflow", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
    }
  });

  const handleProcessDocument = async () => {
    if (!documentText || !documentType) {
      return;
    }

    processDocumentMutation.mutate({
      documentText,
      documentType
    });
  };

  const handleEnhanceForm = async () => {
    if (!context?.formType) {
      return;
    }

    enhanceFormMutation.mutate({
      formType: context.formType,
      employeeData: context.employeeData || {},
      formData: context.formData || {}
    });
  };

  const handleAutomateOnboarding = async (employeeType: string, department: string) => {
    automateOnboardingMutation.mutate({
      employeeType,
      department
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600';
      case 'limited': return 'text-yellow-600';
      case 'disabled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enabled': return <Badge className="bg-green-100 text-green-800">Enabled</Badge>;
      case 'disabled': return <Badge variant="secondary">Disabled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <CardTitle>AI Assistant</CardTitle>
          <div className="flex items-center gap-1 ml-auto">
            <div className={`w-2 h-2 rounded-full ${aiStatus?.overall === 'operational' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className={`text-sm font-medium ${getStatusColor(aiStatus?.overall || 'unknown')}`}>
              {aiStatus?.overall || 'Unknown'}
            </span>
          </div>
        </div>
        <CardDescription>
          Intelligent automation to streamline your HR processes
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Context-aware suggestions */}
        {context && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              Smart Suggestions
            </h4>
            
            {context.formType && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  AI can help prefill this {context.formType} form and validate data automatically.
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-2"
                    onClick={handleEnhanceForm}
                    disabled={enhanceFormMutation.isPending}
                  >
                    {enhanceFormMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Enhance Form
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {context.currentPage === 'onboarding' && (
              <Alert>
                <UserPlus className="h-4 w-4" />
                <AlertDescription>
                  Create automated onboarding checklists and welcome emails with AI.
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-2"
                    onClick={() => handleAutomateOnboarding('certificated', 'teaching')}
                    disabled={automateOnboardingMutation.isPending}
                  >
                    {automateOnboardingMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Auto-Generate
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* AI Functions */}
        <div className="space-y-3">
          <h4 className="font-medium">Available AI Functions</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">Document Processing</span>
                {getStatusBadge(aiStatus?.features?.find(f => f.name === 'Document Processing')?.status || 'unknown')}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Automatically extract data and check compliance from uploaded documents
              </p>
              <div className="space-y-2">
                <Textarea
                  placeholder="Paste document text here..."
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  className="text-xs"
                  rows={3}
                />
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personnel_action_form">Personnel Action Form</SelectItem>
                    <SelectItem value="employment_contract">Employment Contract</SelectItem>
                    <SelectItem value="background_check">Background Check</SelectItem>
                    <SelectItem value="certification">Certification</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={handleProcessDocument}
                  disabled={!documentText || !documentType || processDocumentMutation.isPending}
                >
                  {processDocumentMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Process Document
                </Button>
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="h-4 w-4 text-green-600" />
                <span className="font-medium text-sm">Onboarding Automation</span>
                {getStatusBadge(aiStatus?.features?.find(f => f.name === 'Onboarding Automation')?.status || 'unknown')}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Generate personalized onboarding checklists and welcome materials
              </p>
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => handleAutomateOnboarding('certificated', 'teaching')}
                disabled={automateOnboardingMutation.isPending}
              >
                {automateOnboardingMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Generate Checklist
              </Button>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-sm">Payroll Analysis</span>
                {getStatusBadge(aiStatus?.features?.find(f => f.name === 'Payroll Analysis')?.status || 'unknown')}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Detect anomalies and optimize payroll processing
              </p>
              <Button size="sm" className="w-full" disabled>
                Analyze Payroll
              </Button>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-sm">Substitute Matching</span>
                {getStatusBadge(aiStatus?.features?.find(f => f.name === 'Substitute Assignment')?.status || 'unknown')}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Smart substitute teacher recommendations based on qualifications
              </p>
              <Button size="sm" className="w-full" disabled>
                Find Substitutes
              </Button>
            </Card>
          </div>
        </div>

        {/* Results Display */}
        {(enhanceFormMutation.data || processDocumentMutation.data || automateOnboardingMutation.data) && (
          <div className="space-y-3">
            <h4 className="font-medium">AI Results</h4>
            
            {enhanceFormMutation.data && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Form Enhancement Complete</p>
                    <p className="text-sm">
                      Confidence: {Math.round((enhanceFormMutation.data.confidence || 0) * 100)}%
                    </p>
                    {enhanceFormMutation.data.suggestions?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium">Suggestions:</p>
                        <ul className="text-xs space-y-1">
                          {enhanceFormMutation.data.suggestions.map((suggestion: any, index: number) => (
                            <li key={index}>• {suggestion.suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {processDocumentMutation.data && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Document Processing Complete</p>
                    <p className="text-sm">{processDocumentMutation.data.documentAnalysis?.summary}</p>
                    {processDocumentMutation.data.compliance?.violations?.length > 0 && (
                      <div className="text-sm">
                        <p className="font-medium text-red-600">Compliance Issues:</p>
                        <ul className="text-xs space-y-1">
                          {processDocumentMutation.data.compliance.violations.map((violation: any, index: number) => (
                            <li key={index}>• {violation.description}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {automateOnboardingMutation.data && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Onboarding Automation Complete</p>
                    <p className="text-sm">
                      Generated {automateOnboardingMutation.data.checklist?.steps?.length || 0} checklist items
                    </p>
                    <p className="text-sm">
                      Estimated duration: {automateOnboardingMutation.data.estimatedDuration}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* System Status */}
        <div className="space-y-3">
          <h4 className="font-medium">System Status</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {aiStatus?.features?.slice(0, 6).map((feature: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>{feature.name}</span>
                {getStatusBadge(feature.status)}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AIAssistant;