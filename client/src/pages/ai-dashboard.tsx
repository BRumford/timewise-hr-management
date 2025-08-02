import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Bot, 
  Brain,
  Zap,
  FileText, 
  UserPlus, 
  DollarSign, 
  Users, 
  Calendar,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
  TrendingUp,
  Clock,
  Target,
  Shield
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AIStatusResponse {
  overall?: string;
  features?: Array<{
    name: string;
    status: string;
    description?: string;
  }>;
}

interface AIResponse {
  success?: boolean;
  confidence?: number;
  documentAnalysis?: {
    summary: string;
  };
  compliance?: {
    violations?: Array<{
      description: string;
    }>;
  };
  checklist?: {
    steps?: any[];
  };
  estimatedDuration?: string;
}

export default function AIDashboard() {
  const [selectedDocType, setSelectedDocType] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [employeeType, setEmployeeType] = useState("");
  const [department, setDepartment] = useState("");
  const queryClient = useQueryClient();

  // Get AI system status
  const { data: aiStatus, isLoading: statusLoading } = useQuery<AIStatusResponse>({
    queryKey: ["/api/ai/status"],
    refetchInterval: 30000
  });

  // AI automation mutations
  const processDocumentMutation = useMutation<AIResponse, Error, any>({
    mutationFn: async (data: any) => apiRequest("/api/ai/process-document", "POST", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/ai"] })
  });

  const automateOnboardingMutation = useMutation<AIResponse, Error, any>({
    mutationFn: async (data: any) => apiRequest("/api/ai/automate-onboarding", "POST", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] })
  });

  const analyzePayrollMutation = useMutation<AIResponse, Error, any>({
    mutationFn: async (data: any) => apiRequest("/api/ai/analyze-payroll", "POST", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/payroll"] })
  });

  const handleProcessDocument = () => {
    if (!documentText || !selectedDocType) return;
    processDocumentMutation.mutate({
      documentText,
      documentType: selectedDocType
    });
  };

  const handleAutomateOnboarding = () => {
    if (!employeeType || !department) return;
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

  const getFeatureBadge = (status: string) => {
    switch (status) {
      case 'enabled': return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'disabled': return <Badge variant="secondary">Inactive</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const mockMetrics = {
    totalAutomations: 247,
    timeSaved: 18.5,
    accuracyImprovement: 94,
    complianceScore: 98
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="h-8 w-8 text-blue-600" />
            AI Automation Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Intelligent automation for streamlined HR operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${aiStatus?.overall === 'operational' ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className={`font-medium ${getStatusColor(aiStatus?.overall || 'unknown')}`}>
            {statusLoading ? 'Checking...' : (aiStatus?.overall || 'Unknown')}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Automations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{mockMetrics.totalAutomations}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">{mockMetrics.timeSaved}h</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per week average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="text-2xl font-bold">{mockMetrics.accuracyImprovement}%</span>
            </div>
            <Progress value={mockMetrics.accuracyImprovement} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold">{mockMetrics.complianceScore}%</span>
            </div>
            <Progress value={mockMetrics.complianceScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="automation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="automation">AI Tools</TabsTrigger>
          <TabsTrigger value="status">System Status</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="automation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Document Processing */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <CardTitle>Document Processing</CardTitle>
                </div>
                <CardDescription>
                  AI-powered document analysis and data extraction
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="document-type">Document Type</Label>
                  <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personnel_action_form">Personnel Action Form</SelectItem>
                      <SelectItem value="employment_contract">Employment Contract</SelectItem>
                      <SelectItem value="background_check">Background Check</SelectItem>
                      <SelectItem value="certification">Teaching Certification</SelectItem>
                      <SelectItem value="performance_review">Performance Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document-text">Document Content</Label>
                  <Textarea
                    id="document-text"
                    placeholder="Paste document text here for AI analysis..."
                    value={documentText}
                    onChange={(e) => setDocumentText(e.target.value)}
                    rows={6}
                  />
                </div>

                <Button 
                  onClick={handleProcessDocument}
                  disabled={!documentText || !selectedDocType || processDocumentMutation.isPending}
                  className="w-full"
                >
                  {processDocumentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Process Document
                </Button>

                {processDocumentMutation.data && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <div className="space-y-2">
                        <p className="font-medium">Document processed successfully!</p>
                        <p className="text-sm">{processDocumentMutation.data.documentAnalysis?.summary}</p>
                        {processDocumentMutation.data.compliance?.violations?.length > 0 && (
                          <div>
                            <p className="font-medium text-red-600">Compliance Issues Found:</p>
                            <ul className="text-sm space-y-1">
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
              </CardContent>
            </Card>

            {/* Onboarding Automation */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-green-600" />
                  <CardTitle>Onboarding Automation</CardTitle>
                </div>
                <CardDescription>
                  Generate personalized onboarding workflows and materials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee-type">Employee Type</Label>
                  <Select value={employeeType} onValueChange={setEmployeeType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="certificated">Certificated (Teachers)</SelectItem>
                      <SelectItem value="classified">Classified (Support Staff)</SelectItem>
                      <SelectItem value="administrative">Administrative</SelectItem>
                      <SelectItem value="substitute">Substitute Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="elementary">Elementary Education</SelectItem>
                      <SelectItem value="middle">Middle School</SelectItem>
                      <SelectItem value="high">High School</SelectItem>
                      <SelectItem value="special">Special Education</SelectItem>
                      <SelectItem value="administration">Administration</SelectItem>
                      <SelectItem value="support">Support Services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleAutomateOnboarding}
                  disabled={!employeeType || !department || automateOnboardingMutation.isPending}
                  className="w-full"
                >
                  {automateOnboardingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Generate Onboarding Plan
                </Button>

                {automateOnboardingMutation.data && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <div className="space-y-2">
                        <p className="font-medium">Onboarding plan generated!</p>
                        <p className="text-sm">
                          Created {automateOnboardingMutation.data.checklist?.steps?.length || 0} checklist items
                        </p>
                        <p className="text-sm">
                          Estimated duration: {automateOnboardingMutation.data.estimatedDuration}
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Payroll Analysis */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  <CardTitle>Payroll Analysis</CardTitle>
                </div>
                <CardDescription>
                  Detect anomalies and optimize payroll processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Payroll data analysis coming soon
                  </p>
                  <Button 
                    onClick={() => analyzePayrollMutation.mutate({ payrollData: [] })}
                    disabled={analyzePayrollMutation.isPending}
                    variant="outline"
                  >
                    {analyzePayrollMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Run Sample Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Smart Recommendations */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-orange-600" />
                  <CardTitle>Smart Recommendations</CardTitle>
                </div>
                <CardDescription>
                  AI-driven insights and workflow optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Form Optimization</p>
                        <p className="text-xs text-blue-700">
                          Consider adding smart validation to reduce form errors by 23%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Workflow Efficiency</p>
                        <p className="text-xs text-green-700">
                          Automate substitute assignments to save 4.2 hours per week
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Compliance Alert</p>
                        <p className="text-xs text-yellow-700">
                          Update background check procedures for new regulations
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI System Status</CardTitle>
              <CardDescription>
                Monitor the health and availability of AI automation features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiStatus?.features?.map((feature: any, index: number) => (
                  <div key={index} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{feature.name}</h4>
                      {getFeatureBadge(feature.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Automation Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                  <p className="text-muted-foreground">Analytics dashboard coming soon</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Processing Speed</span>
                    <span className="font-medium">+89%</span>
                  </div>
                  <Progress value={89} />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Accuracy Rate</span>
                    <span className="font-medium">94%</span>
                  </div>
                  <Progress value={94} />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">User Satisfaction</span>
                    <span className="font-medium">96%</span>
                  </div>
                  <Progress value={96} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}