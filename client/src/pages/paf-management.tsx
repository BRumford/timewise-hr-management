import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Clock, FileText, User, Search, Send, Eye, Plus, Building, Calendar, Settings, ArrowRight, XCircle, RotateCcw, Workflow, Edit, Trash2, History } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Workflow Management Component
function WorkflowManagementSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateWorkflowDialogOpen, setIsCreateWorkflowDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);

  // Workflow management form
  const [workflowFormData, setWorkflowFormData] = useState({
    name: "",
    description: "",
    steps: [
      { role: "hr", title: "HR Review", required: true, order: 1 },
      { role: "finance", title: "Budget Approval", required: true, order: 2 },
      { role: "admin", title: "Administrator Approval", required: true, order: 3 }
    ]
  });

  const { data: workflowTemplates, isLoading: workflowTemplatesLoading } = useQuery({
    queryKey: ["/api/paf/workflow-templates"],
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async (workflowData: any) => {
      return apiRequest("/api/paf/workflow-templates", "POST", workflowData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Workflow template created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/paf/workflow-templates"] });
      setIsCreateWorkflowDialogOpen(false);
      setWorkflowFormData({
        name: "",
        description: "",
        steps: [
          { role: "hr", title: "HR Review", required: true, order: 1 },
          { role: "finance", title: "Budget Approval", required: true, order: 2 },
          { role: "admin", title: "Administrator Approval", required: true, order: 3 }
        ]
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create workflow template",
        variant: "destructive",
      });
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (workflowId: number) => {
      return apiRequest(`/api/paf/workflow-templates/${workflowId}`, "DELETE", {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Workflow template deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/paf/workflow-templates"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete workflow template",
        variant: "destructive",
      });
    },
  });

  const handleAddWorkflowStep = () => {
    const newStep = {
      role: "",
      title: "",
      required: true,
      order: workflowFormData.steps.length + 1
    };
    setWorkflowFormData({
      ...workflowFormData,
      steps: [...workflowFormData.steps, newStep]
    });
  };

  const handleRemoveWorkflowStep = (index: number) => {
    const updatedSteps = workflowFormData.steps.filter((_, i) => i !== index);
    const reorderedSteps = updatedSteps.map((step, i) => ({
      ...step,
      order: i + 1
    }));
    setWorkflowFormData({
      ...workflowFormData,
      steps: reorderedSteps
    });
  };

  const handleUpdateWorkflowStep = (index: number, field: string, value: any) => {
    const updatedSteps = [...workflowFormData.steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setWorkflowFormData({
      ...workflowFormData,
      steps: updatedSteps
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Workflow Templates</h2>
        <Dialog open={isCreateWorkflowDialogOpen} onOpenChange={setIsCreateWorkflowDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create Workflow Template</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Workflow Template</DialogTitle>
              <DialogDescription>
                Define the approval steps and requirements for this workflow template
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Template Name *</label>
                  <Input
                    placeholder="Enter workflow template name"
                    value={workflowFormData.name}
                    onChange={(e) => setWorkflowFormData({ ...workflowFormData, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <Textarea
                    placeholder="Enter workflow description"
                    value={workflowFormData.description}
                    onChange={(e) => setWorkflowFormData({ ...workflowFormData, description: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Approval Steps</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddWorkflowStep}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Step</span>
                  </Button>
                </div>

                <div className="space-y-3">
                  {workflowFormData.steps.map((step, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Step {index + 1}</h4>
                        {workflowFormData.steps.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveWorkflowStep(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Role *</label>
                          <Select
                            value={step.role}
                            onValueChange={(value) => handleUpdateWorkflowStep(index, 'role', value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hr">HR Department</SelectItem>
                              <SelectItem value="finance">Finance/Budget</SelectItem>
                              <SelectItem value="admin">Administrator</SelectItem>
                              <SelectItem value="superintendent">Superintendent</SelectItem>
                              <SelectItem value="board">School Board</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Step Title *</label>
                          <Input
                            placeholder="Enter step title"
                            value={step.title}
                            onChange={(e) => handleUpdateWorkflowStep(index, 'title', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateWorkflowDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => createWorkflowMutation.mutate(workflowFormData)}
                  disabled={!workflowFormData.name || workflowFormData.steps.some(step => !step.role || !step.title) || createWorkflowMutation.isPending}
                >
                  {createWorkflowMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {workflowTemplatesLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {Array.isArray(workflowTemplates) && workflowTemplates.map((template: any) => (
              <Card key={template.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{template.name}</h3>
                      <Badge variant="secondary">
                        {template.steps?.length || 0} Steps
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-gray-600 mb-4">{template.description}</p>
                    )}
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Approval Flow:</h4>
                      <div className="flex items-center space-x-2 flex-wrap">
                        {template.steps?.map((step: any, index: number) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {step.title}
                            </Badge>
                            {index < template.steps.length - 1 && (
                              <ArrowRight className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingWorkflow(template);
                        setWorkflowFormData({
                          name: template.name,
                          description: template.description || "",
                          steps: template.steps || []
                        });
                        setIsCreateWorkflowDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteWorkflowMutation.mutate(template.id)}
                      disabled={deleteWorkflowMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            
            {(!workflowTemplates || workflowTemplates.length === 0) && (
              <Card className="p-8 text-center">
                <Workflow className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Workflow Templates</h3>
                <p className="text-gray-600 mb-4">
                  Create your first workflow template to define approval processes for Personnel Action Forms.
                </p>
                <Button onClick={() => setIsCreateWorkflowDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Template
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const pafFormSchema = z.object({
  // PAF Type Section
  pafType: z.string().min(1, "PAF type is required"),
  positionType: z.string().min(1, "Position type is required"),
  positionCategory: z.string().min(1, "Position category is required"),
  
  // Section 1 - Position Information
  positionTitle: z.string().min(1, "Position title is required"),
  fte: z.string().optional(),
  gradeLevel: z.string().optional(),
  workSite: z.string().optional(),
  subjectArea: z.string().optional(),
  extraDutyType: z.string().optional(),
  
  // Section 2 - Advertisement Status
  advertise: z.string().optional(),
  postingDateRequested: z.string().optional(),
  advertisementType: z.string().optional(),
  edjoinTimeline: z.string().optional(),
  screeningCommitteeDate: z.string().optional(),
  noScreeningCommittee: z.boolean().optional(),
  formalInterviewDate: z.string().optional(),
  informalInterview: z.boolean().optional(),
  applicationRequirements: z.array(z.string()).optional(),
  publicationRequests: z.array(z.string()).optional(),
  numberOfVacancies: z.string().optional(),
  specialRequests: z.string().optional(),
  
  // Section 3 - Employee Information/Status
  employeeName: z.string().optional(),
  effectiveDate: z.string().optional(),
  reason: z.string().optional(),
  transferFrom: z.string().optional(),
  transferTo: z.string().optional(),
  increaseDecreaseFrom: z.string().optional(),
  increaseDecreaseTo: z.string().optional(),
  otherReason: z.string().optional(),
  
  // Section 4 - Work Shift Information
  totalHoursDay: z.string().optional(),
  totalDaysWeek: z.string().optional(),
  totalDaysYear: z.string().optional(),
  mondayTimeIn: z.string().optional(),
  mondayTimeOut: z.string().optional(),
  mondayTimeIn2: z.string().optional(),
  mondayTimeOut2: z.string().optional(),
  tuesdayTimeIn: z.string().optional(),
  tuesdayTimeOut: z.string().optional(),
  tuesdayTimeIn2: z.string().optional(),
  tuesdayTimeOut2: z.string().optional(),
  wednesdayTimeIn: z.string().optional(),
  wednesdayTimeOut: z.string().optional(),
  wednesdayTimeIn2: z.string().optional(),
  wednesdayTimeOut2: z.string().optional(),
  thursdayTimeIn: z.string().optional(),
  thursdayTimeOut: z.string().optional(),
  thursdayTimeIn2: z.string().optional(),
  thursdayTimeOut2: z.string().optional(),
  fridayTimeIn: z.string().optional(),
  fridayTimeOut: z.string().optional(),
  fridayTimeIn2: z.string().optional(),
  fridayTimeOut2: z.string().optional(),
  
  // Section 5 - Budget Code Information
  budgetCode1: z.string().optional(),
  budgetPercentage1: z.string().optional(),
  budgetCode2: z.string().optional(),
  budgetPercentage2: z.string().optional(),
  budgetCode3: z.string().optional(),
  budgetPercentage3: z.string().optional(),
  budgetCode4: z.string().optional(),
  budgetPercentage4: z.string().optional(),
  budgetCode5: z.string().optional(),
  budgetPercentage5: z.string().optional(),
  budgetCode6: z.string().optional(),
  budgetPercentage6: z.string().optional(),
  
  // Section 6 - Reason/Justification
  justification: z.string().optional(),
  
  // Workflow Selection
  workflowTemplateId: z.string().min(1, "Please select an approval workflow"),
});

type PafFormData = z.infer<typeof pafFormSchema>;

interface PafSubmission {
  id: number;
  templateId: number;
  status: string;
  formData: any;
  employeeName: string;
  positionTitle: string;
  effectiveDate: string;
  submittedBy: string;
  createdAt: string;
  updatedAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    draft: "secondary",
    submitted: "default",
    under_review: "secondary",
    approved: "default",
    denied: "destructive",
  } as const;

  const icons = {
    draft: Clock,
    submitted: Send,
    under_review: AlertCircle,
    approved: CheckCircle,
    denied: AlertCircle,
  };

  const Icon = icons[status as keyof typeof icons] || Clock;

  return (
    <Badge variant={variants[status as keyof typeof variants] || "secondary"} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
    </Badge>
  );
}

function PafSubmissionViewer({ submission, onClose }: { submission: PafSubmission; onClose: () => void }) {
  const formData = submission.formData as any || {};

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Status:</span>
            <div className="mt-1">
              <StatusBadge status={submission.status} />
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Employee:</span>
            <div className="mt-1">{submission.employeeName}</div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Position:</span>
            <div className="mt-1">{submission.positionTitle || 'Not specified'}</div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Submitted:</span>
            <div className="mt-1">{new Date(submission.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* Form Data Display */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Form Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Effective Date:</span>
            <div className="mt-1">
              {submission.effectiveDate ? new Date(submission.effectiveDate).toLocaleDateString() : 'Not provided'}
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Submitted By:</span>
            <div className="mt-1">{submission.submittedBy}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

export default function PafManagement() {
  const [selectedSubmission, setSelectedSubmission] = useState<PafSubmission | null>(null);
  const [isViewSubmissionDialogOpen, setIsViewSubmissionDialogOpen] = useState(false);
  const [isCreatePafDialogOpen, setIsCreatePafDialogOpen] = useState(false);
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorkflowSubmission, setSelectedWorkflowSubmission] = useState<PafSubmission | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/paf/submissions"],
  });

  const { data: workflowTemplates, isLoading: workflowTemplatesLoading } = useQuery({
    queryKey: ["/api/paf/workflow-templates"],
  });

  const filteredSubmissions = (submissions as PafSubmission[] || []).filter((submission: PafSubmission) => 
    submission.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.positionTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewSubmission = (submission: PafSubmission) => {
    setSelectedSubmission(submission);
    setIsViewSubmissionDialogOpen(true);
  };

  const handleViewWorkflow = (submission: PafSubmission) => {
    setSelectedWorkflowSubmission(submission);
    setIsWorkflowDialogOpen(true);
  };

  const { data: workflowSteps } = useQuery({
    queryKey: ["/api/paf/submissions", selectedWorkflowSubmission?.id, "approvals"],
    enabled: !!selectedWorkflowSubmission?.id,
  });

  const submitForApprovalMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      return apiRequest(`/api/paf/submissions/${submissionId}/submit`, "POST", {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "PAF submitted for approval",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/paf/submissions"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit PAF",
        variant: "destructive",
      });
    },
  });

  const approveStepMutation = useMutation({
    mutationFn: async ({ submissionId, step, action, comments }: { submissionId: number; step: number; action: string; comments?: string }) => {
      return apiRequest(`/api/paf/submissions/${submissionId}/approve`, "POST", {
        step,
        action,
        comments,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Workflow step updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/paf/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paf/submissions", selectedWorkflowSubmission?.id, "approvals"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workflow step",
        variant: "destructive",
      });
    },
  });



  const form = useForm<PafFormData>({
    resolver: zodResolver(pafFormSchema),
    defaultValues: {
      pafType: "",
      positionType: "",
      positionCategory: "",
      positionTitle: "",
      fte: "",
      gradeLevel: "",
      workSite: "",
      subjectArea: "",
      extraDutyType: "",
      advertise: "",
      postingDateRequested: "",
      advertisementType: "",
      edjoinTimeline: "",
      screeningCommitteeDate: "",
      noScreeningCommittee: false,
      formalInterviewDate: "",
      informalInterview: false,
      applicationRequirements: [],
      publicationRequests: [],
      numberOfVacancies: "",
      specialRequests: "",
      employeeName: "",
      effectiveDate: "",
      reason: "",
      transferFrom: "",
      transferTo: "",
      increaseDecreaseFrom: "",
      increaseDecreaseTo: "",
      otherReason: "",
      totalHoursDay: "",
      totalDaysWeek: "",
      totalDaysYear: "",
      mondayTimeIn: "",
      mondayTimeOut: "",
      mondayTimeIn2: "",
      mondayTimeOut2: "",
      tuesdayTimeIn: "",
      tuesdayTimeOut: "",
      tuesdayTimeIn2: "",
      tuesdayTimeOut2: "",
      wednesdayTimeIn: "",
      wednesdayTimeOut: "",
      wednesdayTimeIn2: "",
      wednesdayTimeOut2: "",
      thursdayTimeIn: "",
      thursdayTimeOut: "",
      thursdayTimeIn2: "",
      thursdayTimeOut2: "",
      fridayTimeIn: "",
      fridayTimeOut: "",
      fridayTimeIn2: "",
      fridayTimeOut2: "",
      budgetCode1: "",
      budgetPercentage1: "",
      budgetCode2: "",
      budgetPercentage2: "",
      budgetCode3: "",
      budgetPercentage3: "",
      budgetCode4: "",
      budgetPercentage4: "",
      budgetCode5: "",
      budgetPercentage5: "",
      budgetCode6: "",
      budgetPercentage6: "",
      justification: "",
      workflowTemplateId: "",
    },
  });

  const createPafMutation = useMutation({
    mutationFn: async (data: PafFormData) => {
      return apiRequest("/api/paf/submissions", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Personnel Action Form submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/paf/submissions"] });
      setIsCreatePafDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit PAF",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: PafFormData) => {
    await createPafMutation.mutateAsync(data);
  };

  // Watch form fields for conditional display  
  const positionType = form.watch("positionType");
  const showSubjectArea = positionType === "certificated";

  if (submissionsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Personnel Action Forms</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <FileText className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Personnel Action Forms</h1>
      </div>

      {/* Tabs for PAF Management and Workflow Management */}
      <Tabs defaultValue="paf-management" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="paf-management" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>PAF Management</span>
          </TabsTrigger>
          <TabsTrigger value="workflow-management" className="flex items-center space-x-2">
            <Workflow className="h-4 w-4" />
            <span>Workflow Management</span>
          </TabsTrigger>
        </TabsList>

        {/* PAF Management Tab */}
        <TabsContent value="paf-management" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Manage Personnel Action Forms</h2>
            <Dialog open={isCreatePafDialogOpen} onOpenChange={setIsCreatePafDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create New PAF</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Personnel Action Form</DialogTitle>
              <DialogDescription>
                Complete the form below for personnel action processing
              </DialogDescription>
            </DialogHeader>
            
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900">PERSONNEL ACTION FORM (PAF)</h2>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
                  {/* PAF Type Header Section */}
                  <div className="border border-gray-300 rounded-md">
                    <div className="p-4">
                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">PAF Type Requested (Check One):</h3>
                          <FormField
                            control={form.control}
                            name="pafType"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="border-gray-300">
                                      <SelectValue placeholder="Select PAF type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="new-position">New Position (Section 1, 2, 4, 5, 6)</SelectItem>
                                      <SelectItem value="vacant-position">Vacant Position (Section 1, 2, 3, 4, 5)</SelectItem>
                                      <SelectItem value="change-existing">Change Existing Position (Section 1, 3, 4, 5, 6)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">Position Type (Check One):</h3>
                          <FormField
                            control={form.control}
                            name="positionType"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="border-gray-300">
                                      <SelectValue placeholder="Select position type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="certificated">Certificated</SelectItem>
                                      <SelectItem value="classified">Classified</SelectItem>
                                      <SelectItem value="management-confidential">Management/Confidential</SelectItem>
                                      <SelectItem value="administrator">Administrator</SelectItem>
                                      <SelectItem value="coach-extra-duty">Coach or Extra Duty</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">Position Category (Check One):</h3>
                          <FormField
                            control={form.control}
                            name="positionCategory"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="border-gray-300">
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="prob-perm">Prob/Perm</SelectItem>
                                      <SelectItem value="temporary">Temporary</SelectItem>
                                      <SelectItem value="short-term">Short-Term</SelectItem>
                                      <SelectItem value="categorical">Categorical</SelectItem>
                                      <SelectItem value="summer-program">Summer Program</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 1 - Position Information */}
                  <div className="border border-gray-300 rounded-md">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
                      <h3 className="font-semibold text-gray-900">SECTION 1 - POSITION INFORMATION</h3>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="positionTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Position Title:</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter position title" 
                                className="border-gray-300"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="workSite"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Work Site:</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter work site" 
                                className="border-gray-300"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="fte"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">FTE:</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter FTE" 
                                className="border-gray-300"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="gradeLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Grade Level(s):</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter grade level(s)" 
                                className="border-gray-300"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="subjectArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">*Subject Area(s): (*If Certificated)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter subject area(s)" 
                                className="border-gray-300"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="extraDutyType"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-sm font-medium">Extra Duty Type (if applicable):</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter extra duty type" 
                                className="border-gray-300"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Section 3 - Employee Information/Status */}
                  <div className="border border-gray-300 rounded-md">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
                      <h3 className="font-semibold text-gray-900">SECTION 3 - EMPLOYEE INFORMATION/STATUS</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="employeeName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Name:</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter employee name" 
                                  className="border-gray-300"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="effectiveDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Effective Date:</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  className="border-gray-300"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="reason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Reason:</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="border-gray-300">
                                  <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="resignation">Resignation</SelectItem>
                                  <SelectItem value="retirement">Retirement</SelectItem>
                                  <SelectItem value="leave-of-absence">Leave of Absence</SelectItem>
                                  <SelectItem value="transfer">Transfer</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="transferFrom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Transfer From PC#:</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="PC#" 
                                  className="border-gray-300"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="transferTo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">To PC#:</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="PC#" 
                                  className="border-gray-300"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="increaseDecreaseFrom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Increase/Decrease From:</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="days/hours" 
                                  className="border-gray-300"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="increaseDecreaseTo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">To:</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="days/hours" 
                                  className="border-gray-300"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="otherReason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Other Reason:</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter other reason" 
                                className="border-gray-300"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Section 4 - Work Shift Information */}
                  <div className="border border-gray-300 rounded-md">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
                      <h3 className="font-semibold text-gray-900">SECTION 4 - WORK SHIFT INFORMATION</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name="fte"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">FTE:</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="FTE" 
                                  className="border-gray-300"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="totalHoursDay"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Total Hours/Day:</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Hours" 
                                  className="border-gray-300"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="totalDaysWeek"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Total Days/Week:</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Days" 
                                  className="border-gray-300"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="totalDaysYear"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Total Days/Year:</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Days" 
                                  className="border-gray-300"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Work Schedule Grid */}
                      <div className="overflow-x-auto">
                        <table className="w-full border border-gray-300">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-3 py-2 text-sm font-medium">Work Hours</th>
                              <th className="border border-gray-300 px-3 py-2 text-sm font-medium">Time In</th>
                              <th className="border border-gray-300 px-3 py-2 text-sm font-medium">Time Out</th>
                              <th className="border border-gray-300 px-3 py-2 text-sm font-medium">Time In</th>
                              <th className="border border-gray-300 px-3 py-2 text-sm font-medium">Time Out</th>
                              <th className="border border-gray-300 px-3 py-2 text-sm font-medium">Total Hours/Day</th>
                            </tr>
                          </thead>
                          <tbody>
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                              <tr key={day}>
                                <td className="border border-gray-300 px-3 py-2 font-medium">{day}</td>
                                <td className="border border-gray-300 px-1 py-1">
                                  <FormField
                                    control={form.control}
                                    name={`${day.toLowerCase()}TimeIn` as any}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input 
                                            type="time"
                                            className="border-0 text-sm"
                                            {...field} 
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </td>
                                <td className="border border-gray-300 px-1 py-1">
                                  <FormField
                                    control={form.control}
                                    name={`${day.toLowerCase()}TimeOut` as any}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input 
                                            type="time"
                                            className="border-0 text-sm"
                                            {...field} 
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </td>
                                <td className="border border-gray-300 px-1 py-1">
                                  <FormField
                                    control={form.control}
                                    name={`${day.toLowerCase()}TimeIn2` as any}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input 
                                            type="time"
                                            className="border-0 text-sm"
                                            {...field} 
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </td>
                                <td className="border border-gray-300 px-1 py-1">
                                  <FormField
                                    control={form.control}
                                    name={`${day.toLowerCase()}TimeOut2` as any}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input 
                                            type="time"
                                            className="border-0 text-sm"
                                            {...field} 
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-sm">
                                  {/* Total hours calculation would go here */}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Section 5 - Budget Code Information */}
                  <div className="border border-gray-300 rounded-md">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
                      <h3 className="font-semibold text-gray-900">SECTION 5 - BUDGET CODE INFORMATION</h3>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600 mb-3">Fund - Resource - Year - Object - Goal - Function - School - Budget Responsibility - Type</p>
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5, 6].map((lineNumber) => (
                          <div key={lineNumber} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`budgetCode${lineNumber}` as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">
                                    Budget Code {lineNumber}:
                                  </FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="XX - XXXX - X - XXXX - XXXX - XXXX - XXX - XXXX - XXXX" 
                                      className="border-gray-300"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`budgetPercentage${lineNumber}` as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">
                                    Percentage {lineNumber}:
                                  </FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="%" 
                                      className="border-gray-300"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Section 6 - Reason/Justification */}
                  <div className="border border-gray-300 rounded-md">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
                      <h3 className="font-semibold text-gray-900">SECTION 6 - REASON/JUSTIFICATION FOR REQUEST</h3>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600 mb-3">If brand new position or a change to existing position, please indicate reasoning / justification for request:</p>
                      <FormField
                        control={form.control}
                        name="justification"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter justification for request"
                                className="min-h-[100px] border-gray-300"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Workflow Selection */}
                  <div className="border-2 border-blue-200 rounded-md bg-blue-50/30">
                    <div className="bg-blue-100 px-4 py-2 border-b border-blue-200">
                      <h3 className="font-semibold text-blue-900 flex items-center space-x-2">
                        <Workflow className="h-5 w-5" />
                        <span>WORKFLOW SELECTION</span>
                      </h3>
                      <p className="text-xs text-blue-700 mt-1">Choose the approval process for this PAF - determines who will review and approve this form</p>
                    </div>
                    <div className="p-4 space-y-4">
                      <FormField
                        control={form.control}
                        name="workflowTemplateId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-blue-900">Select Approval Workflow: <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="border-gray-300 h-auto min-h-[48px]">
                                  <SelectValue placeholder="Choose workflow template" />
                                </SelectTrigger>
                                <SelectContent>
                                  {!workflowTemplatesLoading && Array.isArray(workflowTemplates) && workflowTemplates.map((template: any) => (
                                    <SelectItem key={template.id} value={template.id.toString()}>
                                      <div className="flex flex-col space-y-1 py-2">
                                        <span className="font-medium text-sm">{template.name}</span>
                                        {template.description && (
                                          <span className="text-xs text-gray-500">{template.description}</span>
                                        )}
                                        <div className="flex items-center space-x-1 mt-1">
                                          <Badge variant="outline" className="text-xs">
                                            {template.steps?.length || 0} Steps
                                          </Badge>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                            {field.value && Array.isArray(workflowTemplates) && (
                              <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-md">
                                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center space-x-2">
                                  <Eye className="h-4 w-4 text-blue-600" />
                                  <span>Selected Workflow Preview</span>
                                </h4>
                                <div className="space-y-2">
                                  {workflowTemplates
                                    .find((t: any) => t.id.toString() === field.value)
                                    ?.steps?.map((step: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                                      <div className="flex items-center space-x-3">
                                        <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                                          {step.order || index + 1}
                                        </span>
                                        <div>
                                          <span className="text-sm font-medium text-gray-900">{step.title}</span>
                                          <div className="text-xs text-gray-500 capitalize">
                                            {step.role?.replace('_', ' ').replace('-', '/')}
                                          </div>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="text-xs">
                                        {step.required ? 'Required' : 'Optional'}
                                      </Badge>
                                    </div>
                                  )) || []}
                                </div>
                                
                                {/* Estimated Processing Time */}
                                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                                  <div className="flex items-center space-x-2 text-sm text-blue-800">
                                    <Clock className="h-4 w-4" />
                                    <span className="font-medium">Estimated Processing Time: </span>
                                    <span>
                                      {(() => {
                                        const selectedTemplate = workflowTemplates.find((t: any) => t.id.toString() === field.value);
                                        const stepCount = selectedTemplate?.steps?.length || 0;
                                        return `${stepCount * 2}-${stepCount * 4} business days`;
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                      
                      {/* Workflow Recommendations */}
                      {!form.watch("workflowTemplateId") && Array.isArray(workflowTemplates) && workflowTemplates.length > 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center space-x-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>Recommended Workflows</span>
                          </h4>
                          <div className="space-y-2">
                            {(() => {
                              const pafType = form.watch("pafType");
                              const positionType = form.watch("positionType");
                              
                              // Simple recommendation logic based on form data
                              let recommendedTemplates = workflowTemplates;
                              
                              if (pafType === "new-position") {
                                recommendedTemplates = workflowTemplates.filter((t: any) => 
                                  t.name.toLowerCase().includes("new") || 
                                  t.name.toLowerCase().includes("standard") ||
                                  t.steps?.length >= 3
                                );
                              } else if (positionType === "administrator") {
                                recommendedTemplates = workflowTemplates.filter((t: any) => 
                                  t.name.toLowerCase().includes("admin") || 
                                  t.name.toLowerCase().includes("executive") ||
                                  t.steps?.length >= 4
                                );
                              }
                              
                              return recommendedTemplates.slice(0, 2).map((template: any) => (
                                <div key={template.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm text-gray-900">{template.name}</div>
                                    <div className="text-xs text-gray-500">{template.description}</div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => form.setValue("workflowTemplateId", template.id.toString())}
                                    className="ml-2 text-xs"
                                  >
                                    Select
                                  </Button>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Section */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex justify-end space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreatePafDialogOpen(false)}
                        className="px-6 py-2"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createPafMutation.isPending}
                        className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="h-4 w-4" />
                        <span>{createPafMutation.isPending ? "Submitting..." : "Submit PAF"}</span>
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Submissions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Personnel Action Forms</span>
            <Badge variant="outline" className="text-xs">
              {filteredSubmissions.length} Total Forms
            </Badge>
          </CardTitle>
          <CardDescription>
            Track and manage all Personnel Action Form submissions
          </CardDescription>
          
          {/* Search */}
          <div className="flex items-center space-x-2 pt-4">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by employee name, position, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No Personnel Action Forms Found</p>
              <p className="text-sm">
                {searchTerm ? "Try adjusting your search criteria" : "Get started by creating your first PAF"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission: PafSubmission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{submission.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{submission.positionTitle || 'Not specified'}</TableCell>
                      <TableCell>
                        <StatusBadge status={submission.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Settings className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{(submission as any).currentStep || 0}/3</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {submission.effectiveDate ? new Date(submission.effectiveDate).toLocaleDateString() : 'Not set'}
                      </TableCell>
                      <TableCell>{new Date(submission.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewSubmission(submission)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Link href={`/paf/${submission.id}/timeline`}>
                            <Button
                              size="sm"
                              variant="outline"
                            >
                              <History className="h-3 w-3 mr-1" />
                              Timeline
                            </Button>
                          </Link>
                          {submission.status !== "draft" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewWorkflow(submission)}
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              Workflow
                            </Button>
                          )}
                          {submission.status === "draft" && (
                            <Button
                              size="sm"
                              onClick={() => submitForApprovalMutation.mutate(submission.id)}
                              disabled={submitForApprovalMutation.isPending}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Submit
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Submission Dialog */}
      <Dialog open={isViewSubmissionDialogOpen} onOpenChange={setIsViewSubmissionDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Personnel Action Form Details</DialogTitle>
            <DialogDescription>
              View complete form information and submission details
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <PafSubmissionViewer
              submission={selectedSubmission}
              onClose={() => setIsViewSubmissionDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Workflow Management Dialog */}
      <Dialog open={isWorkflowDialogOpen} onOpenChange={setIsWorkflowDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workflow Management</DialogTitle>
            <DialogDescription>
              Manage approval workflow for {selectedWorkflowSubmission?.employeeName} - {selectedWorkflowSubmission?.positionTitle}
            </DialogDescription>
          </DialogHeader>
          {selectedWorkflowSubmission && Array.isArray(workflowSteps) && (
            <div className="space-y-4">
              {workflowSteps.map((step: any, index: number) => (
                <div key={step.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        step.status === 'approved' ? 'bg-green-100 text-green-800' :
                        step.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        step.status === 'needs_correction' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {step.step}
                      </div>
                      <div>
                        <h4 className="font-medium">{step.approverRole}</h4>
                        <p className="text-sm text-gray-500">
                          {step.status === 'pending' ? 'Awaiting approval' : 
                           step.status === 'approved' ? `Approved on ${new Date(step.signedAt).toLocaleDateString()}` :
                           step.status === 'rejected' ? `Rejected on ${new Date(step.signedAt).toLocaleDateString()}` :
                           step.status === 'needs_correction' ? 'Corrections requested' :
                           step.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {step.status === 'approved' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {step.status === 'rejected' && <XCircle className="h-5 w-5 text-red-500" />}
                      {step.status === 'needs_correction' && <RotateCcw className="h-5 w-5 text-yellow-500" />}
                      {step.status === 'pending' && <Clock className="h-5 w-5 text-gray-400" />}
                    </div>
                  </div>
                  
                  {step.comments && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <strong>Comments:</strong> {step.comments}
                    </div>
                  )}
                  
                  {step.correctionReason && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                      <strong>Correction Requested:</strong> {step.correctionReason}
                    </div>
                  )}
                  
                  {step.status === 'pending' && (
                    <div className="mt-3 flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => approveStepMutation.mutate({
                          submissionId: selectedWorkflowSubmission.id,
                          step: step.step,
                          action: 'approve'
                        })}
                        disabled={approveStepMutation.isPending}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveStepMutation.mutate({
                          submissionId: selectedWorkflowSubmission.id,
                          step: step.step,
                          action: 'request_correction',
                          comments: 'Please review and correct the form'
                        })}
                        disabled={approveStepMutation.isPending}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Request Corrections
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => approveStepMutation.mutate({
                          submissionId: selectedWorkflowSubmission.id,
                          step: step.step,
                          action: 'reject',
                          comments: 'Form rejected'
                        })}
                        disabled={approveStepMutation.isPending}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Deny
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
        </TabsContent>

        {/* Workflow Management Tab */}
        <TabsContent value="workflow-management" className="space-y-4">
          <WorkflowManagementSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}