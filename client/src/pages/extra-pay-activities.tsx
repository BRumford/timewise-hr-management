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
import { Plus, DollarSign, FileText, Calendar, User, Building, Clock, Edit } from "lucide-react";
import { format } from "date-fns";
import { 
  insertExtraPayContractSchema, 
  insertExtraPayRequestSchema,
  type ExtraPayContract,
  type ExtraPayRequest,
  type Employee
} from "@shared/schema";

export default function ExtraPayActivities() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ExtraPayContract | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
      requestDate: new Date().toISOString().split('T')[0],
      hoursWorked: "",
      description: "",
      amount: "",
      status: "pending"
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

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
  };

  const activeContracts = contracts.filter(c => c.status === 'active');

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
                              <SelectItem key={contract.id} value={contract.id}>
                                {contract.contractType} - {getEmployeeName(contract.employeeId)}
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
                    name="requestDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Request Date</FormLabel>
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="requests">Payment Requests</TabsTrigger>
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
                          <TableCell>{format(new Date(request.requestDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{contract?.contractType || 'Unknown'}</TableCell>
                          <TableCell>{contract ? getEmployeeName(contract.employeeId) : 'Unknown'}</TableCell>
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
                                  onClick={() => updateRequestStatusMutation.mutate({ id: request.id, status: 'approved' })}
                                >
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateRequestStatusMutation.mutate({ id: request.id, status: 'rejected' })}
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
      </Tabs>
    </div>
  );
}