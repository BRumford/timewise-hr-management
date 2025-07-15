import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOnboardingFormSchema, insertOnboardingWorkflowSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  UserPlus, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  User,
  FileText,
  Calendar,
  Upload,
  Download,
  Trash2,
  Edit,
  Eye,
  FolderOpen,
  Settings
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import type { OnboardingForm } from "@shared/schema";
import { z } from "zod";

const formSchema = insertOnboardingFormSchema.extend({
  applicableEmployeeTypes: z.array(z.string()).optional(),
});

const workflowFormSchema = insertOnboardingWorkflowSchema.extend({
  targetCompletionDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;
type WorkflowFormData = z.infer<typeof workflowFormSchema>;

export default function Onboarding() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"workflows" | "forms">("workflows");
  const [isCreateFormDialogOpen, setIsCreateFormDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<OnboardingForm | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [createMode, setCreateMode] = useState<"new" | "existing">("new");
  const [selectedExistingForm, setSelectedExistingForm] = useState<OnboardingForm | null>(null);
  const [isStartWorkflowDialogOpen, setIsStartWorkflowDialogOpen] = useState(false);
  
  console.log("Dialog state:", isStartWorkflowDialogOpen);
  const { toast } = useToast();

  const { data: workflows, isLoading } = useQuery({
    queryKey: ["/api/onboarding"],
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: onboardingForms, isLoading: isLoadingForms } = useQuery({
    queryKey: ["/api/onboarding/forms"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "new_hire",
      formType: "hr_form",
      applicableEmployeeTypes: [],
      isActive: true,
      isRequired: false,
      createdBy: "current-user",
    },
  });

  const workflowForm = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowFormSchema),
    defaultValues: {
      employeeId: 0,
      assignedTo: "",
      status: "started",
      workflowType: "new_hire",
      targetCompletionDate: "",
      notes: "",
    },
  });

  const createFormMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (selectedFile) {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('formData', JSON.stringify(data));
        
        const response = await fetch('/api/onboarding/forms/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`${response.status}: ${errorText}`);
        }
        
        return response.json();
      } else {
        return await apiRequest("POST", "/api/onboarding/forms", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/forms"] });
      setIsCreateFormDialogOpen(false);
      setSelectedFile(null);
      form.reset();
      toast({
        title: "Success",
        description: "Form created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFormMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/onboarding/forms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/forms"] });
      toast({
        title: "Success",
        description: "Form deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startWorkflowMutation = useMutation({
    mutationFn: async (data: WorkflowFormData) => {
      const workflowData = {
        ...data,
        startDate: new Date().toISOString(),
        targetCompletionDate: data.targetCompletionDate ? new Date(data.targetCompletionDate).toISOString() : null,
      };
      return await apiRequest("POST", "/api/onboarding", workflowData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
      setIsStartWorkflowDialogOpen(false);
      workflowForm.reset();
      toast({
        title: "Success",
        description: "Onboarding workflow started successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createFormMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'started':
        return 'bg-yellow-100 text-yellow-800';
      case 'stalled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'started':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'stalled':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees?.find((emp: any) => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
  };

  const calculateProgress = (workflow: any) => {
    if (!workflow.completedSteps || !workflow.requiredDocuments) return 0;
    const totalSteps = workflow.requiredDocuments.length;
    const completedSteps = workflow.completedSteps.length;
    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  };

  const filteredWorkflows = workflows?.filter((workflow: any) => {
    const employeeName = getEmployeeName(workflow.employeeId);
    const matchesSearch = !searchTerm || 
      employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.currentStep.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || workflow.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-300 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-300 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-16 bg-gray-300 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statusCounts = workflows?.reduce((acc: any, workflow: any) => {
    acc[workflow.status] = (acc[workflow.status] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Employee Onboarding</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setActiveTab("workflows")}
            variant={activeTab === "workflows" ? "default" : "outline"}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Workflows
          </Button>
          <Button
            onClick={() => setActiveTab("forms")}
            variant={activeTab === "forms" ? "default" : "outline"}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Forms
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {activeTab === "workflows" ? "Total Workflows" : "Form Library"}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeTab === "workflows" ? (workflows?.length || 0) : (onboardingForms?.length || 0)}
                </p>
              </div>
              <User className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {activeTab === "workflows" ? "In Progress" : "Active"}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {activeTab === "workflows" 
                    ? (statusCounts.in_progress || 0) 
                    : (onboardingForms?.filter((f: any) => f.isActive).length || 0)
                  }
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {activeTab === "workflows" ? "Completed" : "Required"}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {activeTab === "workflows" 
                    ? (statusCounts.completed || 0) 
                    : (onboardingForms?.filter((f: any) => f.isRequired).length || 0)
                  }
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {activeTab === "workflows" ? "Stalled" : "Inactive"}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {activeTab === "workflows" 
                    ? (statusCounts.stalled || 0) 
                    : (onboardingForms?.filter((f: any) => !f.isActive).length || 0)
                  }
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows Tab */}
      {activeTab === "workflows" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle>Onboarding Workflows</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search workflows..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="started">Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="stalled">Stalled</option>
                </select>
                <Button 
                  className="bg-primary hover:bg-blue-700"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Start Onboarding button clicked");
                    alert("Button clicked! Opening dialog...");
                    setIsStartWorkflowDialogOpen(true);
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Start Onboarding
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Step
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWorkflows?.map((workflow: any) => (
                    <tr key={workflow.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {getEmployeeName(workflow.employeeId)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {workflow.assignedTo && `Assigned to: ${workflow.assignedTo}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">
                          {workflow.currentStep.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>{calculateProgress(workflow)}%</span>
                            <span>{workflow.completedSteps?.length || 0}/{workflow.requiredDocuments?.length || 0}</span>
                          </div>
                          <Progress value={calculateProgress(workflow)} className="h-2" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(new Date(workflow.startDate), 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {workflow.targetCompletionDate 
                            ? format(new Date(workflow.targetCompletionDate), 'MMM dd, yyyy')
                            : 'Not set'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(workflow.status)}
                          <Badge className={getStatusColor(workflow.status)}>
                            {workflow.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <Button variant="link" className="text-indigo-600 hover:text-indigo-900 p-0">
                            View Details
                          </Button>
                          {workflow.status !== 'completed' && (
                            <Button variant="link" className="text-green-600 hover:text-green-900 p-0">
                              Update
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!filteredWorkflows || filteredWorkflows.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No onboarding workflows found matching your criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forms Tab */}
      {activeTab === "forms" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle>Onboarding Forms</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search forms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Dialog open={isCreateFormDialogOpen} onOpenChange={setIsCreateFormDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-blue-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Form
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add Onboarding Form</DialogTitle>
                    </DialogHeader>
                    
                    {/* Mode Selection */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <Button
                          type="button"
                          variant={createMode === "new" ? "default" : "outline"}
                          onClick={() => setCreateMode("new")}
                          className="flex-1"
                        >
                          Create New Form
                        </Button>
                        <Button
                          type="button"
                          variant={createMode === "existing" ? "default" : "outline"}
                          onClick={() => setCreateMode("existing")}
                          className="flex-1"
                        >
                          Use Existing Form
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600">
                        {createMode === "new" 
                          ? "Create a new form template that can be reused across multiple onboarding workflows"
                          : "Select from your existing form library to avoid re-uploading the same documents"
                        }
                      </p>
                    </div>

                    {createMode === "existing" && (
                      <div className="space-y-4">
                        <Label>Select Existing Form</Label>
                        <Select onValueChange={(value) => {
                          const formId = parseInt(value);
                          const selectedForm = onboardingForms?.find((f: any) => f.id === formId);
                          setSelectedExistingForm(selectedForm);
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a form from library" />
                          </SelectTrigger>
                          <SelectContent>
                            {onboardingForms?.filter((form: any) => form.isTemplate).map((form: any) => (
                              <SelectItem key={form.id} value={form.id.toString()}>
                                {form.title} {form.version && `(v${form.version})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {selectedExistingForm && (
                          <div className="p-3 bg-gray-50 rounded-md">
                            <h4 className="font-medium">{selectedExistingForm.title}</h4>
                            <p className="text-sm text-gray-600">{selectedExistingForm.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{selectedExistingForm.formType}</Badge>
                              <Badge variant="outline">{selectedExistingForm.category}</Badge>
                              {selectedExistingForm.fileName && (
                                <Badge variant="outline">📄 {selectedExistingForm.fileName}</Badge>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setIsCreateFormDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            type="button" 
                            onClick={() => {
                              if (selectedExistingForm) {
                                // Use the existing form
                                setIsCreateFormDialogOpen(false);
                                setSelectedExistingForm(null);
                                toast({
                                  title: "Success",
                                  description: `${selectedExistingForm.title} is now available for use`,
                                });
                              }
                            }}
                            disabled={!selectedExistingForm}
                          >
                            Use This Form
                          </Button>
                        </div>
                      </div>
                    )}

                    {createMode === "new" && (
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Form Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter form title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Enter form description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter category" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="formType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Form Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select form type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="hr_form">HR Form</SelectItem>
                                  <SelectItem value="tax_form">Tax Form</SelectItem>
                                  <SelectItem value="benefits_form">Benefits Form</SelectItem>
                                  <SelectItem value="certification">Certification</SelectItem>
                                  <SelectItem value="agreement">Agreement</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* File Upload Section */}
                        <div className="space-y-2">
                          <Label htmlFor="file-upload">Upload PDF Form (Optional)</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="file-upload"
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setSelectedFile(file);
                                }
                              }}
                              className="cursor-pointer"
                            />
                            {selectedFile && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedFile(null);
                                  const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                                  if (fileInput) fileInput.value = '';
                                }}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                          {selectedFile && (
                            <p className="text-sm text-gray-600">
                              Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            Upload W4 forms, I9 forms, or other onboarding documents in PDF format
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={form.watch("isActive")}
                            onCheckedChange={(checked) => form.setValue("isActive", checked)}
                          />
                          <Label htmlFor="isActive">Active</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={form.watch("isRequired")}
                            onCheckedChange={(checked) => form.setValue("isRequired", checked)}
                          />
                          <Label htmlFor="isRequired">Required</Label>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setIsCreateFormDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createFormMutation.isPending}>
                            {createFormMutation.isPending ? "Creating..." : "Create Form"}
                          </Button>
                        </div>
                        </form>
                      </Form>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Form Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {onboardingForms?.map((form: any) => (
                    <tr key={form.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {form.title}
                          {form.version && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              v{form.version}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {form.description}
                        </div>
                        {form.fileName && (
                          <div className="text-xs text-blue-600 mt-1">
                            📄 {form.fileName}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {form.category}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline">
                          {form.formType}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Badge className={form.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {form.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {form.isRequired && (
                            <Badge className="bg-red-100 text-red-800">
                              Required
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(new Date(form.createdAt), 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <Button variant="link" className="text-indigo-600 hover:text-indigo-900 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {form.fileUrl && (
                            <Button 
                              variant="link" 
                              className="text-blue-600 hover:text-blue-900 p-0"
                              onClick={() => window.open(form.fileUrl, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="link" className="text-green-600 hover:text-green-900 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="link" 
                            className="text-purple-600 hover:text-purple-900 p-0"
                            onClick={() => {
                              // Create new version functionality
                              toast({
                                title: "Feature Coming Soon",
                                description: "Form versioning will be available soon",
                              });
                            }}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="link" 
                            className="text-red-600 hover:text-red-900 p-0"
                            onClick={() => deleteFormMutation.mutate(form.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!onboardingForms || onboardingForms.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No onboarding forms found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start Workflow Dialog */}
      <Dialog open={isStartWorkflowDialogOpen} onOpenChange={setIsStartWorkflowDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Start Onboarding Workflow</DialogTitle>
          </DialogHeader>
          <Form {...workflowForm}>
            <form onSubmit={workflowForm.handleSubmit((data) => startWorkflowMutation.mutate(data))} className="space-y-4">
              <FormField
                control={workflowForm.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Employee</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.map((employee: any) => (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            {employee.firstName} {employee.lastName} - {employee.position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={workflowForm.control}
                name="workflowType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workflow Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select workflow type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new_hire">New Hire</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="promotion">Promotion</SelectItem>
                        <SelectItem value="substitute">Substitute</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={workflowForm.control}
                name="targetCompletionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Completion Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={workflowForm.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter assignee name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={workflowForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any additional notes or instructions..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 mt-6">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setIsStartWorkflowDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={startWorkflowMutation.isPending}
                >
                  {startWorkflowMutation.isPending ? "Starting..." : "Start Workflow"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
