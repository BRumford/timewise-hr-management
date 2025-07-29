import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, FileText, Calendar, User, Building, Clock, Edit, Settings, Wrench, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { 
  insertExtraPayContractSchema, 
  insertExtraPayRequestSchema,
  insertExtraPayCustomFieldSchema,
  type ExtraPayContract,
  type ExtraPayRequest,
  type ExtraPayCustomField,
  type Employee
} from "@shared/schema";

export default function ExtraPayActivities() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ExtraPayContract | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCustomFieldsDialogOpen, setIsCustomFieldsDialogOpen] = useState(false);
  const [editingCustomField, setEditingCustomField] = useState<ExtraPayCustomField | null>(null);
  const [selectedSection, setSelectedSection] = useState("contract");

  // Queries
  const { data: contracts = [], isLoading: contractsLoading } = useQuery<ExtraPayContract[]>({
    queryKey: ['/api/extra-pay-contracts'],
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery<ExtraPayRequest[]>({
    queryKey: ['/api/extra-pay-requests'],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  // Custom fields query
  const { data: customFields = [], isLoading: customFieldsLoading } = useQuery<ExtraPayCustomField[]>({
    queryKey: ['/api/extra-pay-custom-fields'],
  });

  // Filter custom fields by section
  const contractFields = customFields.filter(field => field.section === 'contract' && field.isVisible);
  const requestFields = customFields.filter(field => field.section === 'request' && field.isVisible);
  const approvalFields = customFields.filter(field => field.section === 'approval' && field.isVisible);

  // Statistics  
  const activeContracts = contracts.filter(c => c.status === 'active');
  const pendingRequests = requests.filter(r => r.status === 'pending');

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

  // Edit form
  const editForm = useForm({
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

  // Request form
  const requestForm = useForm({
    resolver: zodResolver(insertExtraPayRequestSchema),
    defaultValues: {
      contractId: "",
      dateWorked: new Date().toISOString().split('T')[0],
      employeeId: "",
      hoursWorked: "",
      description: "",
      amount: "",
      status: "pending",
      customFieldsData: {}
    }
  });

  // Custom field form
  const customFieldForm = useForm({
    resolver: zodResolver(insertExtraPayCustomFieldSchema),
    defaultValues: {
      fieldName: "",
      displayLabel: "",
      fieldType: "text",
      section: "contract",
      category: "contracts",
      isRequired: false,
      isVisible: true,
      displayOrder: 0,
      fieldOptions: {},
      validationRules: {},
      helpText: "",
      defaultValue: ""
    }
  });

  // Mutations
  const createContractMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/extra-pay-contracts', 'POST', data),
    onSuccess: () => {
      toast({ title: "Contract created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/extra-pay-contracts'] });
      setIsContractDialogOpen(false);
      contractForm.reset();
    },
    onError: (error) => {
      toast({ title: "Error creating contract", description: error.message, variant: "destructive" });
    }
  });

  const createRequestMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/extra-pay-requests', 'POST', data),
    onSuccess: () => {
      toast({ title: "Payment request created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/extra-pay-requests'] });
      setIsRequestDialogOpen(false);
      requestForm.reset();
    },
    onError: (error) => {
      toast({ title: "Error creating payment request", description: error.message, variant: "destructive" });
    }
  });

  const updateContractStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiRequest(`/api/extra-pay-contracts/${id}/status`, 'PATCH', { status }),
    onSuccess: () => {
      toast({ title: "Contract status updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/extra-pay-contracts'] });
    },
    onError: (error) => {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    }
  });

  const updateRequestStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiRequest(`/api/extra-pay-requests/${id}/status`, 'PATCH', { status }),
    onSuccess: () => {
      toast({ title: "Request status updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/extra-pay-requests'] });
    },
    onError: (error) => {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    }
  });

  const updateContractMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/extra-pay-contracts/${id}`, 'PUT', data),
    onSuccess: () => {
      toast({ title: "Contract updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/extra-pay-contracts'] });
      setIsEditDialogOpen(false);
      setEditingContract(null);
      editForm.reset();
    },
    onError: (error) => {
      toast({ title: "Error updating contract", description: error.message, variant: "destructive" });
    }
  });

  // Custom field mutations
  const createCustomFieldMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/extra-pay-custom-fields', 'POST', data),
    onSuccess: () => {
      toast({ title: "Custom field created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/extra-pay-custom-fields'] });
      setIsCustomFieldsDialogOpen(false);
      customFieldForm.reset();
    },
    onError: (error) => {
      toast({ title: "Error creating custom field", description: error.message, variant: "destructive" });
    }
  });

  const updateCustomFieldMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/extra-pay-custom-fields/${id}`, 'PUT', data),
    onSuccess: () => {
      toast({ title: "Custom field updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/extra-pay-custom-fields'] });
      setEditingCustomField(null);
    },
    onError: (error) => {
      toast({ title: "Error updating custom field", description: error.message, variant: "destructive" });
    }
  });

  const deleteCustomFieldMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/extra-pay-custom-fields/${id}`, 'DELETE'),
    onSuccess: () => {
      toast({ title: "Custom field deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/extra-pay-custom-fields'] });
    },
    onError: (error) => {
      toast({ title: "Error deleting custom field", description: error.message, variant: "destructive" });
    }
  });

  const initializeCustomFieldsMutation = useMutation({
    mutationFn: () => apiRequest('/api/extra-pay-custom-fields/initialize', 'POST'),
    onSuccess: () => {
      toast({ title: "Default custom fields initialized successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/extra-pay-custom-fields'] });
    },
    onError: (error) => {
      toast({ title: "Error initializing custom fields", description: error.message, variant: "destructive" });
    }
  });

  const onContractSubmit = (data: any) => {
    createContractMutation.mutate(data);
  };

  const onRequestSubmit = (data: any) => {
    createRequestMutation.mutate(data);
  };

  const onEditSubmit = (data: any) => {
    if (editingContract) {
      updateContractMutation.mutate({ id: editingContract.id.toString(), data });
    }
  };

  const onCustomFieldSubmit = (data: any) => {
    if (editingCustomField) {
      updateCustomFieldMutation.mutate({ 
        id: editingCustomField.id, 
        data: { ...data, updatedAt: new Date() } 
      });
    } else {
      createCustomFieldMutation.mutate(data);
    }
  };

  const handleEditContract = (contract: ExtraPayContract) => {
    setEditingContract(contract);
    editForm.reset({
      title: contract.title,
      description: contract.description || "",
      amount: contract.amount,
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: contract.status,
      contractType: contract.contractType,
      department: contract.department || "",
      requirements: contract.requirements || "",
      documentUrl: contract.documentUrl || "",
      createdBy: contract.createdBy
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      completed: "bg-blue-100 text-blue-800"
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Extra Pay Activities</h1>
          <p className="text-gray-600 mt-1">Manage extra pay contracts and payment requests</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Contract
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={contractForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contract Amount ($)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="1000.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                  <FormField
                    control={contractForm.control}
                    name="requirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requirements</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="List any specific requirements or qualifications..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsContractDialogOpen(false)}>
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

          <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <DollarSign className="w-4 h-4 mr-2" />
                New Payment Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Create Payment Request</DialogTitle>
              </DialogHeader>
              <Form {...requestForm}>
                <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
                  <FormField
                    control={requestForm.control}
                    name="contractId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select contract" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeContracts.map((contract) => (
                              <SelectItem key={contract.id} value={contract.id.toString()}>
                                {contract.title} - {contract.contractType}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={requestForm.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id.toString()}>
                                {employee.firstName} {employee.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={requestForm.control}
                    name="dateWorked"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={requestForm.control}
                    name="hoursWorked"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours Worked</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.5" placeholder="8.0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={requestForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount ($)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="200.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={requestForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Details about the work performed..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createRequestMutation.isPending}>
                      {createRequestMutation.isPending ? "Creating..." : "Create Request"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Edit Contract Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Extra Pay Contract</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
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
                      control={editForm.control}
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
                              <SelectItem value="after_school">After School</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={editForm.control}
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contract Amount ($)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="1000.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
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
                      control={editForm.control}
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
                  <FormField
                    control={editForm.control}
                    name="requirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requirements</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="List any specific requirements or qualifications..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateContractMutation.isPending}>
                      {updateContractMutation.isPending ? "Updating..." : "Update Contract"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="contracts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="requests">Payment Requests</TabsTrigger>
          <TabsTrigger value="custom-fields">
            <Settings className="w-4 h-4 mr-2" />
            Custom Fields
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="contracts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contracts.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeContracts.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inactive Contracts</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {contracts.filter(c => c.status === 'inactive').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${contracts.reduce((sum, c) => sum + parseFloat(c.amount), 0).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Extra Pay Contracts</CardTitle>
            </CardHeader>
            <CardContent>
              {contractsLoading ? (
                <div className="text-center py-8">Loading contracts...</div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No contracts found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">{contract.title}</TableCell>
                        <TableCell>{contract.contractType}</TableCell>
                        <TableCell className="max-w-xs truncate">{contract.description}</TableCell>
                        <TableCell>${contract.amount}</TableCell>
                        <TableCell>
                          {format(new Date(contract.startDate), 'MMM dd')} - {format(new Date(contract.endDate), 'MMM dd')}
                        </TableCell>
                        <TableCell>{getStatusBadge(contract.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditContract(contract)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {contract.status === 'active' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateContractStatusMutation.mutate({ id: contract.id.toString(), status: 'inactive' })}
                              >
                                Deactivate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{requests.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {requests.filter(r => r.status === 'pending').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {requests.filter(r => r.status === 'approved').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${requests.reduce((sum, r) => sum + parseFloat(r.amount), 0).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="text-center py-8">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No payment requests found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => {
                      const contract = contracts.find(c => c.id === request.contractId);
                      return (
                        <TableRow key={request.id}>
                          <TableCell>{format(new Date(request.dateWorked), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{contract?.contractType || 'Unknown'}</TableCell>
                          <TableCell>{getEmployeeName(request.employeeId)}</TableCell>
                          <TableCell>{request.hoursWorked}</TableCell>
                          <TableCell>${request.amount}</TableCell>
                          <TableCell className="max-w-xs truncate">{request.description}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>
                            {request.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateRequestStatusMutation.mutate({ id: request.id.toString(), status: 'approved' })}
                                >
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateRequestStatusMutation.mutate({ id: request.id.toString(), status: 'rejected' })}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom-fields" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Custom Fields Management</h3>
              <p className="text-sm text-gray-600">Configure additional fields for contracts, requests, and approval workflows</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => initializeCustomFieldsMutation.mutate()}
                disabled={initializeCustomFieldsMutation.isPending || customFields.length > 0}
              >
                <Wrench className="w-4 h-4 mr-2" />
                Initialize Default Fields
              </Button>
              <Dialog open={isCustomFieldsDialogOpen} onOpenChange={setIsCustomFieldsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Field
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Custom Field</DialogTitle>
                  </DialogHeader>
                  <Form {...customFieldForm}>
                    <form onSubmit={customFieldForm.handleSubmit(onCustomFieldSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={customFieldForm.control}
                          name="fieldName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Field Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., specialEquipment" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={customFieldForm.control}
                          name="displayLabel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Display Label</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., Special Equipment Required" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={customFieldForm.control}
                          name="fieldType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Field Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="select">Select/Dropdown</SelectItem>
                                  <SelectItem value="checkbox">Checkbox</SelectItem>
                                  <SelectItem value="textarea">Textarea</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={customFieldForm.control}
                          name="section"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Section</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="contract">Contract Fields</SelectItem>
                                  <SelectItem value="request">Request Fields</SelectItem>
                                  <SelectItem value="approval">Approval Fields</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={customFieldForm.control}
                          name="displayOrder"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Display Order</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={customFieldForm.control}
                        name="helpText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Help Text</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Optional help text for users..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-center gap-4">
                        <FormField
                          control={customFieldForm.control}
                          name="isRequired"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="rounded border-gray-300"
                                />
                              </FormControl>
                              <FormLabel className="!mt-0">Required Field</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={customFieldForm.control}
                          name="isVisible"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="rounded border-gray-300"
                                />
                              </FormControl>
                              <FormLabel className="!mt-0">Visible in Forms</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsCustomFieldsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createCustomFieldMutation.isPending}>
                          {createCustomFieldMutation.isPending ? "Creating..." : "Create Field"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Tabs value={selectedSection} onValueChange={setSelectedSection} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="contract">Contract Fields ({contractFields.length})</TabsTrigger>
              <TabsTrigger value="request">Request Fields ({requestFields.length})</TabsTrigger>
              <TabsTrigger value="approval">Approval Fields ({approvalFields.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="contract" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Contract Custom Fields
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {customFieldsLoading ? (
                    <div className="text-center py-4">Loading custom fields...</div>
                  ) : contractFields.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Settings className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-lg font-medium">No Contract Fields</p>
                      <p className="text-sm">Create custom fields to enhance your contract forms</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contractFields.map((field) => (
                        <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{field.displayLabel}</h4>
                              <Badge variant={field.isRequired ? "default" : "secondary"}>
                                {field.isRequired ? "Required" : "Optional"}
                              </Badge>
                              <Badge variant="outline">{field.fieldType}</Badge>
                              {!field.isVisible && (
                                <Badge variant="secondary">
                                  <EyeOff className="w-3 h-3 mr-1" />
                                  Hidden
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Field Name: <code className="bg-gray-100 px-1 rounded">{field.fieldName}</code>
                              {field.helpText && ` • ${field.helpText}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCustomField(field);
                                customFieldForm.reset(field);
                                setIsCustomFieldsDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteCustomFieldMutation.mutate(field.id)}
                              disabled={deleteCustomFieldMutation.isPending}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="request" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Request Custom Fields
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {customFieldsLoading ? (
                    <div className="text-center py-4">Loading custom fields...</div>
                  ) : requestFields.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Settings className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-lg font-medium">No Request Fields</p>
                      <p className="text-sm">Create custom fields to enhance your payment request forms</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {requestFields.map((field) => (
                        <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{field.displayLabel}</h4>
                              <Badge variant={field.isRequired ? "default" : "secondary"}>
                                {field.isRequired ? "Required" : "Optional"}
                              </Badge>
                              <Badge variant="outline">{field.fieldType}</Badge>
                              {!field.isVisible && (
                                <Badge variant="secondary">
                                  <EyeOff className="w-3 h-3 mr-1" />
                                  Hidden
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Field Name: <code className="bg-gray-100 px-1 rounded">{field.fieldName}</code>
                              {field.helpText && ` • ${field.helpText}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCustomField(field);
                                customFieldForm.reset(field);
                                setIsCustomFieldsDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteCustomFieldMutation.mutate(field.id)}
                              disabled={deleteCustomFieldMutation.isPending}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approval" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Approval Custom Fields
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {customFieldsLoading ? (
                    <div className="text-center py-4">Loading custom fields...</div>
                  ) : approvalFields.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Settings className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-lg font-medium">No Approval Fields</p>
                      <p className="text-sm">Create custom fields to enhance your approval workflows</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {approvalFields.map((field) => (
                        <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{field.displayLabel}</h4>
                              <Badge variant={field.isRequired ? "default" : "secondary"}>
                                {field.isRequired ? "Required" : "Optional"}
                              </Badge>
                              <Badge variant="outline">{field.fieldType}</Badge>
                              {!field.isVisible && (
                                <Badge variant="secondary">
                                  <EyeOff className="w-3 h-3 mr-1" />
                                  Hidden
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Field Name: <code className="bg-gray-100 px-1 rounded">{field.fieldName}</code>
                              {field.helpText && ` • ${field.helpText}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCustomField(field);
                                customFieldForm.reset(field);
                                setIsCustomFieldsDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteCustomFieldMutation.mutate(field.id)}
                              disabled={deleteCustomFieldMutation.isPending}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}