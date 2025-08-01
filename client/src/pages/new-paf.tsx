import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Users, ArrowRight, CheckCircle, Settings } from "lucide-react";

interface WorkflowStep {
  role: string;
  title: string;
  required: boolean;
  order: number;
}

interface WorkflowTemplate {
  id: number;
  name: string;
  description: string;
  steps: WorkflowStep[];
  isDefault: boolean;
}

interface PafTemplate {
  id: number;
  name: string;
  description: string;
  fileUrl: string;
}

export default function NewPaf() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [formData, setFormData] = useState({
    templateId: "",
    workflowTemplateId: "",
    employeeName: "",
    employeeId: "",
    department: "",
    currentPosition: "",
    newPosition: "",
    effectiveDate: "",
    actionType: "",
    reason: "",
    currentSalary: "",
    newSalary: "",
    justification: "",
  });

  // Fetch PAF templates
  const { data: templates = [] } = useQuery<PafTemplate[]>({
    queryKey: ["/api/paf/templates"],
  });

  // Fetch workflow templates
  const { data: workflowTemplates = [] } = useQuery<WorkflowTemplate[]>({
    queryKey: ["/api/paf/workflow-templates"],
  });

  // Create PAF submission
  const createPafMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/paf/submissions/create-and-fill", "POST", data);
    },
    onSuccess: (result) => {
      console.log("PAF Creation Response:", result);
      console.log("fillablePdfUrl:", result.fillablePdfUrl);
      
      toast({
        title: "PAF Created Successfully",
        description: `Your PAF has been created and sent to the approval workflow. Download the fillable PDF to add signatures.`,
      });
      
      // Open the fillable PDF in a new tab
      if (result.fillablePdfUrl) {
        console.log("Opening PDF URL:", result.fillablePdfUrl);
        window.open(result.fillablePdfUrl, '_blank');
      } else {
        console.log("No fillablePdfUrl in response");
      }
      
      // Reset form
      setFormData({
        templateId: "",
        workflowTemplateId: "",
        employeeName: "",
        employeeId: "",
        department: "",
        currentPosition: "",
        newPosition: "",
        effectiveDate: "",
        actionType: "",
        reason: "",
        currentSalary: "",
        newSalary: "",
        justification: "",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/paf/submissions"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create PAF. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    if (!formData.templateId || !formData.workflowTemplateId || !formData.employeeName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select a template and workflow.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createPafMutation.mutateAsync(formData);
    } catch (error) {
      console.error("[PAF] Frontend error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create PAF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const selectedWorkflow = workflowTemplates.find(wt => wt.id.toString() === formData.workflowTemplateId);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <FileText className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Create New PAF</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Select PAF Template</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template">PAF Template *</Label>
                  <Select value={formData.templateId} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, templateId: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Information */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employeeName">Employee Name *</Label>
                  <Input
                    id="employeeName"
                    value={formData.employeeName}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeName: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                    placeholder="Employee ID"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="Department"
                  />
                </div>
                <div>
                  <Label htmlFor="effectiveDate">Effective Date</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Position Details */}
          <Card>
            <CardHeader>
              <CardTitle>Position Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentPosition">Current Position</Label>
                  <Input
                    id="currentPosition"
                    value={formData.currentPosition}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentPosition: e.target.value }))}
                    placeholder="Current position title"
                  />
                </div>
                <div>
                  <Label htmlFor="newPosition">New Position</Label>
                  <Input
                    id="newPosition"
                    value={formData.newPosition}
                    onChange={(e) => setFormData(prev => ({ ...prev, newPosition: e.target.value }))}
                    placeholder="New position title"
                  />
                </div>
                <div>
                  <Label htmlFor="actionType">Action Type</Label>
                  <Select value={formData.actionType} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, actionType: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hire">New Hire</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="termination">Termination</SelectItem>
                      <SelectItem value="salary_change">Salary Change</SelectItem>
                      <SelectItem value="position_change">Position Change</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Reason for action"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Salary Information */}
          <Card>
            <CardHeader>
              <CardTitle>Salary Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentSalary">Current Salary</Label>
                  <Input
                    id="currentSalary"
                    value={formData.currentSalary}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentSalary: e.target.value }))}
                    placeholder="$0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="newSalary">New Salary</Label>
                  <Input
                    id="newSalary"
                    value={formData.newSalary}
                    onChange={(e) => setFormData(prev => ({ ...prev, newSalary: e.target.value }))}
                    placeholder="$0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Justification */}
          <Card>
            <CardHeader>
              <CardTitle>Justification</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="justification">Detailed Justification</Label>
                <Textarea
                  id="justification"
                  value={formData.justification}
                  onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                  placeholder="Provide detailed justification for this personnel action..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approval Workflow Selection */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Approval Workflow</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="workflowTemplate">Select Workflow *</Label>
                  <Select value={formData.workflowTemplateId} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, workflowTemplateId: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose approval workflow" />
                    </SelectTrigger>
                    <SelectContent>
                      {workflowTemplates.map(workflow => (
                        <SelectItem key={workflow.id} value={workflow.id.toString()}>
                          <div className="flex items-center space-x-2">
                            <span>{workflow.name}</span>
                            {workflow.isDefault && <Badge variant="secondary">Default</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedWorkflow && (
                  <div>
                    <Label>Approval Steps</Label>
                    <div className="space-y-3 mt-2">
                      {selectedWorkflow.steps
                        .sort((a, b) => a.order - b.order)
                        .map((step, index) => (
                          <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                              {step.order}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{step.title}</div>
                              <div className="text-xs text-gray-600 capitalize">{step.role}</div>
                            </div>
                            {step.required && (
                              <Badge variant="outline" className="text-xs">Required</Badge>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Button 
                  onClick={handleSubmit}
                  disabled={createPafMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {createPafMutation.isPending ? "Creating PAF..." : "Create & Download Fillable PDF"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <div className="text-xs text-gray-600 text-center">
                  This will create a fillable PDF with signature fields for each approval step
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Workflow Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full">
                  Manage Workflows
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  Create Custom Workflow
                </Button>
              </div>
              <div className="text-xs text-gray-600 mt-3">
                Customize approval workflows to meet your district's specific needs
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}