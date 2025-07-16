import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface DataDeletionRequest {
  id: number;
  requesterId: string;
  employeeId: number;
  requestType: string;
  requestReason: string;
  dataCategories: string[];
  requestDate: string;
  reviewedBy?: string;
  reviewDate?: string;
  status: string;
  completionDate?: string;
  rejectionReason?: string;
  deletionDetails?: any;
  legalBasis?: string;
  retentionOverride: boolean;
  overrideReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  department: string;
  position: string;
}

const DATA_CATEGORIES = [
  { id: 'personal', label: 'Personal Information' },
  { id: 'payroll', label: 'Payroll Records' },
  { id: 'medical', label: 'Medical Information' },
  { id: 'performance', label: 'Performance Reviews' },
  { id: 'leave', label: 'Leave Records' },
  { id: 'timecards', label: 'Time Cards' },
  { id: 'documents', label: 'Document Records' },
  { id: 'benefits', label: 'Benefits Information' },
];

const REQUEST_TYPES = [
  { value: 'full_deletion', label: 'Full Data Deletion' },
  { value: 'partial_deletion', label: 'Partial Data Deletion' },
  { value: 'anonymization', label: 'Data Anonymization' },
];

const LEGAL_BASIS = [
  { value: 'gdpr_art_17', label: 'GDPR Article 17 (Right to Erasure)' },
  { value: 'ccpa', label: 'CCPA Right to Delete' },
  { value: 'employment_termination', label: 'Employment Termination' },
  { value: 'consent_withdrawal', label: 'Consent Withdrawal' },
];

export default function DataDeletionRequestsPage() {
  const [selectedRequest, setSelectedRequest] = useState<DataDeletionRequest | null>(null);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch data deletion requests
  const { data: deletionRequests, isLoading } = useQuery({
    queryKey: ['/api/privacy/data-deletion-requests'],
    retry: false,
  });

  // Fetch employees for dropdown
  const { data: employees } = useQuery({
    queryKey: ['/api/employees'],
    retry: false,
  });

  // Create request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: Partial<DataDeletionRequest>) => {
      return await apiRequest('/api/privacy/data-deletion-requests', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/privacy/data-deletion-requests'] });
      setIsCreatingRequest(false);
      setSelectedCategories([]);
      toast({
        title: "Success",
        description: "Data deletion request created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create data deletion request",
        variant: "destructive",
      });
    },
  });

  // Approve request mutation
  const approveRequestMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/privacy/data-deletion-requests/${id}/approve`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/privacy/data-deletion-requests'] });
      toast({
        title: "Success",
        description: "Data deletion request approved",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive",
      });
    },
  });

  // Reject request mutation
  const rejectRequestMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return await apiRequest(`/api/privacy/data-deletion-requests/${id}/reject`, 'POST', { rejectionReason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/privacy/data-deletion-requests'] });
      toast({
        title: "Success",
        description: "Data deletion request rejected",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    },
  });

  // Process deletion mutation
  const processDeletionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/privacy/data-deletion-requests/${id}/process`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/privacy/data-deletion-requests'] });
      setIsProcessing(false);
      toast({
        title: "Success",
        description: "Data deletion processed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process data deletion",
        variant: "destructive",
      });
    },
  });

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      employeeId: parseInt(formData.get('employeeId') as string),
      requestType: formData.get('requestType') as string,
      requestReason: formData.get('requestReason') as string,
      dataCategories: selectedCategories,
      legalBasis: formData.get('legalBasis') as string,
      retentionOverride: formData.get('retentionOverride') === 'on',
      overrideReason: formData.get('overrideReason') as string || undefined,
    };
    createRequestMutation.mutate(data);
  };

  const handleApproveRequest = (id: number) => {
    approveRequestMutation.mutate(id);
  };

  const handleRejectRequest = (id: number, reason: string) => {
    rejectRequestMutation.mutate({ id, reason });
  };

  const handleProcessDeletion = (id: number) => {
    setIsProcessing(true);
    processDeletionMutation.mutate(id);
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, categoryId]);
    } else {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'completed':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees?.find((emp: Employee) => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getRequestTypeLabel = (type: string) => {
    const requestType = REQUEST_TYPES.find(rt => rt.value === type);
    return requestType ? requestType.label : type;
  };

  const getLegalBasisLabel = (basis: string) => {
    const legalBasis = LEGAL_BASIS.find(lb => lb.value === basis);
    return legalBasis ? legalBasis.label : basis;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Deletion Requests</h1>
          <p className="text-gray-600">Manage "Right to be Forgotten" requests and data deletion processes</p>
        </div>
        <Dialog open={isCreatingRequest} onOpenChange={setIsCreatingRequest}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Data Deletion Request</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <Label htmlFor="employeeId">Employee</Label>
                <Select name="employeeId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((employee: Employee) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.firstName} {employee.lastName} - {employee.employeeId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="requestType">Request Type</Label>
                <Select name="requestType" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select request type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="requestReason">Request Reason</Label>
                <Textarea 
                  id="requestReason" 
                  name="requestReason" 
                  placeholder="Please provide a reason for this data deletion request..." 
                  rows={3}
                  required 
                />
              </div>

              <div>
                <Label>Data Categories to Delete</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {DATA_CATEGORIES.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={category.id}
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
                      />
                      <Label htmlFor={category.id} className="text-sm">
                        {category.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="legalBasis">Legal Basis</Label>
                <Select name="legalBasis" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select legal basis" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEGAL_BASIS.map((basis) => (
                      <SelectItem key={basis.value} value={basis.value}>
                        {basis.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="retentionOverride" name="retentionOverride" />
                <Label htmlFor="retentionOverride">Override Retention Requirements</Label>
              </div>

              <div>
                <Label htmlFor="overrideReason">Override Reason (if applicable)</Label>
                <Textarea 
                  id="overrideReason" 
                  name="overrideReason" 
                  placeholder="Provide justification for overriding retention requirements..." 
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreatingRequest(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createRequestMutation.isPending}>
                  {createRequestMutation.isPending ? 'Creating...' : 'Create Request'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Deletion Requests</CardTitle>
          <CardDescription>
            Monitor and manage all data deletion requests across the organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading data deletion requests...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Request Type</TableHead>
                  <TableHead>Data Categories</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Legal Basis</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletionRequests?.map((request: DataDeletionRequest) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>{getEmployeeName(request.employeeId)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getRequestTypeLabel(request.requestType)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {request.dataCategories?.slice(0, 3).map((category) => (
                          <Badge key={category} variant="outline" className="text-xs">
                            {DATA_CATEGORIES.find(c => c.id === category)?.label || category}
                          </Badge>
                        ))}
                        {request.dataCategories?.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{request.dataCategories.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{getLegalBasisLabel(request.legalBasis || '')}</TableCell>
                    <TableCell>{formatDate(request.requestDate)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {request.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveRequest(request.id)}
                              disabled={approveRequestMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const reason = prompt('Enter rejection reason:');
                                if (reason) handleRejectRequest(request.id, reason);
                              }}
                              disabled={rejectRequestMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {request.status === 'approved' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleProcessDeletion(request.id)}
                            disabled={processDeletionMutation.isPending || isProcessing}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Process Deletion
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {deletionRequests?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No data deletion requests found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Alert for GDPR Compliance */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>GDPR Compliance:</strong> Data deletion requests must be processed within 30 days of approval. 
          Ensure all retention requirements are reviewed before processing permanent deletions.
        </AlertDescription>
      </Alert>
    </div>
  );
}