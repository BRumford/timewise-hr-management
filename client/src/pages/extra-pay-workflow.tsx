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
import { AlertCircle, CheckCircle, Clock, FileText, User, Search, Send, Eye, Plus, Building, Calendar, Settings, ArrowRight, XCircle, RotateCcw, Workflow, Edit, Trash2, History, DollarSign, FileSignature } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { SignatureManagement } from "@/components/SignatureManagement";
import { 
  insertExtraPayContractSchema, 
  insertExtraPayRequestSchema,
  insertExtraPayWorkflowTemplateSchema,
  type ExtraPayContract,
  type ExtraPayRequest,
  type ExtraPayWorkflowTemplate,
  type Employee
} from "@shared/schema";

// Workflow Management Component for Extra Pay
function ExtraPayWorkflowManagementSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateWorkflowDialogOpen, setIsCreateWorkflowDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);

  // Workflow management form
  const [workflowFormData, setWorkflowFormData] = useState({
    name: "",
    description: "",
    isDefault: false,
    steps: [
      { stepName: "HR Review", roleRequired: "hr", isRequired: true, stepOrder: 1, description: "Initial HR review of extra pay request" },
      { stepName: "Budget Approval", roleRequired: "finance", isRequired: true, stepOrder: 2, description: "Budget verification and approval" },
      { stepName: "Administrator Approval", roleRequired: "admin", isRequired: true, stepOrder: 3, description: "Final administrator approval" },
      { stepName: "E-Signature", roleRequired: "employee", isRequired: true, stepOrder: 4, description: "Employee signature on contract" }
    ]
  });

  const { data: workflowTemplates, isLoading: workflowTemplatesLoading } = useQuery({
    queryKey: ["/api/extra-pay/workflow-templates"],
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async (workflowData: any) => {
      return apiRequest("/api/extra-pay/workflow-templates", "POST", workflowData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Extra pay workflow template created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/extra-pay/workflow-templates"] });
      setIsCreateWorkflowDialogOpen(false);
      setWorkflowFormData({
        name: "",
        description: "",
        isDefault: false,
        steps: [
          { stepName: "HR Review", roleRequired: "hr", isRequired: true, stepOrder: 1, description: "Initial HR review of extra pay request" },
          { stepName: "Budget Approval", roleRequired: "finance", isRequired: true, stepOrder: 2, description: "Budget verification and approval" },
          { stepName: "Administrator Approval", roleRequired: "admin", isRequired: true, stepOrder: 3, description: "Final administrator approval" },
          { stepName: "E-Signature", roleRequired: "employee", isRequired: true, stepOrder: 4, description: "Employee signature on contract" }
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
      return apiRequest(`/api/extra-pay/workflow-templates/${workflowId}`, "DELETE", {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Workflow template deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/extra-pay/workflow-templates"] });
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
      stepName: "",
      roleRequired: "",
      isRequired: true,
      stepOrder: workflowFormData.steps.length + 1,
      description: ""
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
      stepOrder: i + 1
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

  const handleCreateWorkflow = () => {
    createWorkflowMutation.mutate(workflowFormData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="w-5 h-5" />
          Extra Pay Workflow Management
        </CardTitle>
        <CardDescription>
          Create and manage approval workflows for extra pay contracts and requests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Workflow Templates</h3>
          <Dialog open={isCreateWorkflowDialogOpen} onOpenChange={setIsCreateWorkflowDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Extra Pay Workflow Template</DialogTitle>
                <DialogDescription>
                  Design the approval process for extra pay contracts and requests
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Workflow Name</label>
                    <Input
                      value={workflowFormData.name}
                      onChange={(e) => setWorkflowFormData({ ...workflowFormData, name: e.target.value })}
                      placeholder="e.g., Standard Extra Pay Approval"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={workflowFormData.isDefault}
                      onChange={(e) => setWorkflowFormData({ ...workflowFormData, isDefault: e.target.checked })}
                    />
                    <label htmlFor="isDefault" className="text-sm font-medium">Set as Default</label>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={workflowFormData.description}
                    onChange={(e) => setWorkflowFormData({ ...workflowFormData, description: e.target.value })}
                    placeholder="Describe this workflow..."
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold">Workflow Steps</h4>
                    <Button onClick={handleAddWorkflowStep} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Step
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {workflowFormData.steps.map((step, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <label className="text-sm font-medium">Step Name</label>
                            <Input
                              value={step.stepName}
                              onChange={(e) => handleUpdateWorkflowStep(index, 'stepName', e.target.value)}
                              placeholder="Step name"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Required Role</label>
                            <Select
                              value={step.roleRequired}
                              onValueChange={(value) => handleUpdateWorkflowStep(index, 'roleRequired', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hr">HR</SelectItem>
                                <SelectItem value="finance">Finance</SelectItem>
                                <SelectItem value="admin">Administrator</SelectItem>
                                <SelectItem value="employee">Employee</SelectItem>
                                <SelectItem value="superintendent">Superintendent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={step.isRequired}
                              onChange={(e) => handleUpdateWorkflowStep(index, 'isRequired', e.target.checked)}
                            />
                            <label className="text-sm">Required</label>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              onClick={() => handleRemoveWorkflowStep(index)}
                              variant="destructive"
                              size="sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <label className="text-sm font-medium">Description</label>
                          <Input
                            value={step.description}
                            onChange={(e) => handleUpdateWorkflowStep(index, 'description', e.target.value)}
                            placeholder="Step description"
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateWorkflowDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateWorkflow} disabled={createWorkflowMutation.isPending}>
                    {createWorkflowMutation.isPending ? "Creating..." : "Create Workflow"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {workflowTemplatesLoading ? (
          <div className="text-center py-8">Loading workflows...</div>
        ) : (
          <div className="grid gap-4">
            {(workflowTemplates as any[])?.map((template: any) => (
              <Card key={template.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{template.name}</h4>
                      <p className="text-sm text-gray-600">{template.description}</p>
                      <div className="mt-2">
                        <Badge variant={template.isDefault ? "default" : "secondary"}>
                          {template.isDefault ? "Default" : "Custom"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteWorkflowMutation.mutate(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <div className="text-center py-8 text-gray-500">
                No workflow templates found. Create your first workflow template.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Contract Details Component with Timeline
function ContractDetailsModal({ contract, isOpen, onClose }: { contract: ExtraPayContract | null; isOpen: boolean; onClose: () => void }) {
  const { data: contractDetails } = useQuery({
    queryKey: ["/api/extra-pay/contracts", contract?.id],
    enabled: !!contract?.id && isOpen,
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
  };

  if (!contract) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5" />
            {contract.title}
          </DialogTitle>
          <DialogDescription>Contract Details and Timeline</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Contract Details</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="signature">E-Signature</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Contract Information</h3>
                <div className="space-y-2">
                  <div><strong>Title:</strong> {contract.title}</div>
                  <div><strong>Type:</strong> {contract.contractType}</div>
                  <div><strong>Department:</strong> {contract.department}</div>
                  <div><strong>Amount:</strong> ${parseFloat(contract.amount).toLocaleString()}</div>
                  <div><strong>Status:</strong> 
                    <Badge className="ml-2" variant={contract.status === 'active' ? 'default' : 'secondary'}>
                      {contract.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Timeline</h3>
                <div className="space-y-2">
                  <div><strong>Start Date:</strong> {contract.startDate ? format(new Date(contract.startDate), 'PPP') : 'Not set'}</div>
                  <div><strong>End Date:</strong> {contract.endDate ? format(new Date(contract.endDate), 'PPP') : 'Not set'}</div>
                  <div><strong>Created:</strong> {format(new Date(contract.createdAt), 'PPP')}</div>
                  <div><strong>Created By:</strong> {contract.createdBy}</div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Description</h3>
              <p className="text-gray-700">{contract.description}</p>
            </div>
            {contract.requirements && (
              <div>
                <h3 className="font-semibold mb-3">Requirements</h3>
                <p className="text-gray-700">{contract.requirements}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <div className="space-y-4">
              {(contractDetails as any)?.timeline?.map((event: any, index: number) => (
                <div key={index} className="flex items-start gap-4 border-l-2 border-gray-200 pl-4 pb-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 -ml-5 border-2 border-white"></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{event.eventType}</h4>
                        <p className="text-sm text-gray-600">{event.description}</p>
                        <p className="text-xs text-gray-400 mt-1">By: {event.userId}</p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {format(new Date(event.timestamp), 'PPp')}
                      </span>
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  No timeline events found.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="signature" className="space-y-4">
            <SignatureManagement 
              entityId={contract.id.toString()}
              title={`Extra Pay Contract: ${contract.title}`}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Main Extra Pay Workflow Management Component
export default function ExtraPayWorkflowManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedContract, setSelectedContract] = useState<ExtraPayContract | null>(null);
  const [isContractDetailsOpen, setIsContractDetailsOpen] = useState(false);
  const [isCreateContractDialogOpen, setIsCreateContractDialogOpen] = useState(false);

  // Queries
  const { data: contracts = [], isLoading: contractsLoading } = useQuery<ExtraPayContract[]>({
    queryKey: ['/api/extra-pay/contracts'],
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery<ExtraPayRequest[]>({
    queryKey: ['/api/extra-pay/requests'],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/extra-pay/dashboard-stats'],
  });

  // Contract form
  const contractForm = useForm({
    resolver: zodResolver(insertExtraPayContractSchema),
    defaultValues: {
      title: "",
      description: "",
      amount: "",
      startDate: "",
      endDate: "",
      status: "active",
      contractType: "",
      department: "",
      requirements: "",
      documentUrl: "",
      createdBy: "demo_user"
    }
  });

  // Create contract mutation
  const createContractMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/extra-pay/contracts', 'POST', data),
    onSuccess: () => {
      toast({ title: "Contract created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/extra-pay/contracts'] });
      setIsCreateContractDialogOpen(false);
      contractForm.reset();
    },
    onError: (error) => {
      toast({ title: "Error creating contract", description: error.message, variant: "destructive" });
    }
  });

  // Status update mutations
  const updateContractStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiRequest(`/api/extra-pay/contracts/${id}`, 'PATCH', { status }),
    onSuccess: () => {
      toast({ title: "Contract status updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/extra-pay/contracts'] });
    },
    onError: (error) => {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    }
  });

  const updateRequestStatusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' | 'mark-paid' }) => 
      apiRequest(`/api/extra-pay/requests/${id}/${action}`, 'PATCH', {}),
    onSuccess: () => {
      toast({ title: "Request status updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/extra-pay/requests'] });
    },
    onError: (error) => {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    }
  });

  const onContractSubmit = (data: any) => {
    createContractMutation.mutate(data);
  };

  const handleViewContract = (contract: ExtraPayContract) => {
    setSelectedContract(contract);
    setIsContractDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      completed: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      paid: "bg-blue-100 text-blue-800"
    };
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
  };

  // Filter data
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contract.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    return matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Extra Pay Workflow Management</h1>
          <p className="text-gray-600 mt-1">Comprehensive management for extra pay contracts and approval workflows</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateContractDialogOpen} onOpenChange={setIsCreateContractDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Contract
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Extra Pay Contract</DialogTitle>
              </DialogHeader>
              <Form {...contractForm}>
                <form onSubmit={contractForm.handleSubmit(onContractSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={contractForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contract Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Boys Basketball Coach" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contractForm.control}
                      name="contractType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contract Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="coaching">Coaching</SelectItem>
                              <SelectItem value="tutoring">Tutoring</SelectItem>
                              <SelectItem value="supervision">Supervision</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={contractForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Describe the extra pay activity..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={contractForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ($)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="1000.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contractForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contractForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={contractForm.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Athletics, Maintenance, etc." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contractForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateContractDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createContractMutation.isPending}>
                      {createContractMutation.isPending ? "Creating..." : "Create Contract"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Contracts</p>
                <p className="text-2xl font-bold">{(dashboardStats as any)?.activeContracts || contracts.filter(c => c.status === 'active').length}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold">{(dashboardStats as any)?.pendingRequests || requests.filter(r => r.status === 'pending').length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold">${(dashboardStats as any)?.totalAmount || contracts.reduce((sum, c) => sum + parseFloat(c.amount), 0).toLocaleString()}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Signatures Pending</p>
                <p className="text-2xl font-bold">{(dashboardStats as any)?.pendingSignatures || 0}</p>
              </div>
              <FileSignature className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contracts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="requests">Payment Requests</TabsTrigger>
          <TabsTrigger value="workflows">Workflow Management</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search contracts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">Loading contracts...</TableCell>
                    </TableRow>
                  ) : filteredContracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">No contracts found</TableCell>
                    </TableRow>
                  ) : (
                    filteredContracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{contract.title}</div>
                            <div className="text-sm text-gray-500">{contract.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>{contract.contractType}</TableCell>
                        <TableCell>{contract.department}</TableCell>
                        <TableCell>${parseFloat(contract.amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{contract.startDate ? format(new Date(contract.startDate), 'MMM d, yyyy') : 'Not set'}</div>
                            <div className="text-gray-500">to {contract.endDate ? format(new Date(contract.endDate), 'MMM d, yyyy') : 'Not set'}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(contract.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewContract(contract)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateContractStatusMutation.mutate({ 
                                id: contract.id.toString(), 
                                status: contract.status === 'active' ? 'inactive' : 'active' 
                              })}
                            >
                              {contract.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">Loading requests...</TableCell>
                    </TableRow>
                  ) : filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">No payment requests found</TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{getEmployeeName(request.employeeId)}</TableCell>
                        <TableCell>
                          {contracts.find(c => c.id === request.contractId)?.title || 'Unknown Contract'}
                        </TableCell>
                        <TableCell>${parseFloat(request.amount).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{format(new Date(request.createdAt), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateRequestStatusMutation.mutate({ 
                                    id: request.id.toString(), 
                                    action: 'approve' 
                                  })}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateRequestStatusMutation.mutate({ 
                                    id: request.id.toString(), 
                                    action: 'reject' 
                                  })}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {request.status === 'approved' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateRequestStatusMutation.mutate({ 
                                  id: request.id.toString(), 
                                  action: 'mark-paid' 
                                })}
                              >
                                Mark Paid
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <ExtraPayWorkflowManagementSection />
        </TabsContent>
      </Tabs>

      <ContractDetailsModal
        contract={selectedContract}
        isOpen={isContractDetailsOpen}
        onClose={() => setIsContractDetailsOpen(false)}
      />
    </div>
  );
}