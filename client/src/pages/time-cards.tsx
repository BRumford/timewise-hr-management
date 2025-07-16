import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Calendar, 
  Clock, 
  User, 
  Filter, 
  Check, 
  X, 
  Eye, 
  Building, 
  FileText, 
  Users, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  Lock,
  Unlock
} from "lucide-react";
import { format } from "date-fns";
import { useLocation, Link } from "wouter";

interface MonthlyTimecard {
  id: number;
  employeeId: number;
  employeeName: string;
  employeePosition: string;
  templateId: number;
  month: number;
  year: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: string;
  entries: any[];
  customFieldsData: any;
  notes: string;
  submittedBy?: string;
  submittedAt?: string;
  isLocked?: boolean;
  lockedBy?: string;
  lockedAt?: string;
  lockReason?: string;
  totalHours?: number;
  site?: string;
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  employeeType: string;
}

// Employee Timecard Approval Component
function EmployeeTimecardApproval() {
  const [selectedTimecard, setSelectedTimecard] = useState<MonthlyTimecard | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch employee's own timecards only
  const { data: timeCards = [] } = useQuery({
    queryKey: ["/api/time-cards"],
  });

  // Filter to only timecards awaiting employee approval
  const pendingTimecards = timeCards.filter((timecard: any) => 
    timecard.status === 'submitted_to_employee' || timecard.currentApprovalStage === 'employee'
  );

  // Employee approve timecard mutation
  const employeeApproveTimecard = useMutation({
    mutationFn: async (data: { id: number; notes: string }) => {
      return await apiRequest(`/api/time-cards/${data.id}/approve-employee`, "POST", { 
        employeeId: user?.employee?.id, 
        notes: data.notes 
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timecard approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards"] });
      setApprovalDialogOpen(false);
      setApprovalNotes('');
      setSelectedTimecard(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve timecard",
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    if (!selectedTimecard) return;
    employeeApproveTimecard.mutate({
      id: selectedTimecard.id,
      notes: approvalNotes
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Employee Timecard Approval</h1>
        <p className="text-gray-600">Review and approve your own timecards</p>
      </div>

      {/* Statistics Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{pendingTimecards.length}</div>
              <div className="text-sm text-gray-500">Pending Approval</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{timeCards.filter((t: any) => t.status === 'employee_approved').length}</div>
              <div className="text-sm text-gray-500">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{timeCards.length}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Timecards */}
      <div className="space-y-4">
        {pendingTimecards.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Timecards</h3>
              <p className="text-gray-500">You have no timecards awaiting your approval.</p>
            </CardContent>
          </Card>
        ) : (
          pendingTimecards.map((timecard: any) => (
            <Card key={timecard.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      Timecard for {format(new Date(timecard.date), "MMMM dd, yyyy")}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {timecard.totalHours} hours
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(timecard.date), "MMM dd, yyyy")}
                      </div>
                      {timecard.leaveRequestId && (
                        <div className="flex items-center text-blue-600 font-medium">
                          <Calendar className="h-4 w-4 mr-1" />
                          {timecard.leaveType || 'Leave'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pending Approval
                    </Badge>
                    {timecard.leaveRequestId && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Calendar className="h-3 w-3 mr-1" />
                        Leave Request
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Clock In:</span>
                    <span className="ml-2">{timecard.clockIn ? format(new Date(timecard.clockIn), "HH:mm") : "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Clock Out:</span>
                    <span className="ml-2">{timecard.clockOut ? format(new Date(timecard.clockOut), "HH:mm") : "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Break Start:</span>
                    <span className="ml-2">{timecard.breakStart ? format(new Date(timecard.breakStart), "HH:mm") : "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Break End:</span>
                    <span className="ml-2">{timecard.breakEnd ? format(new Date(timecard.breakEnd), "HH:mm") : "N/A"}</span>
                  </div>
                </div>

                {timecard.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Notes:</span>
                    <p className="text-sm text-gray-600 mt-1">{timecard.notes}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTimecard(timecard)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedTimecard(timecard);
                      setApprovalDialogOpen(true);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Timecard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
              <Textarea
                id="approval-notes"
                placeholder="Add any notes about this timecard approval..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                disabled={employeeApproveTimecard.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {employeeApproveTimecard.isPending ? "Approving..." : "Approve"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Admin Timecard Approval Component
function AdminTimecardApproval() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const filterParam = searchParams.get('filter');
  
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>(
    filterParam === 'payroll_processing' ? 'submitted_to_payroll' : 'all'
  );
  const [selectedTimecard, setSelectedTimecard] = useState<MonthlyTimecard | null>(null);
  const [selectedTimecardIds, setSelectedTimecardIds] = useState<number[]>([]);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  
  const { toast } = useToast();

  // Fetch employees for site filtering
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  // Fetch all monthly timecards
  const { data: allTimecards = [] } = useQuery({
    queryKey: ["/api/monthly-timecards"],
  });

  // Fetch regular timecards (including leave request timecards)
  const { data: regularTimecards = [] } = useQuery({
    queryKey: ["/api/time-cards"],
  });

  // Get unique sites from employees
  const uniqueSites = [...new Set(employees.map((emp: Employee) => emp.department).filter(Boolean))];

  // Transform regular timecards to match monthly timecard interface
  const transformedRegularTimecards = regularTimecards.map((timecard: any) => {
    const employee = employees.find((emp: Employee) => emp.id === timecard.employeeId);
    return {
      ...timecard,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
      employeePosition: employee?.position || 'Unknown',
      templateId: null,
      month: new Date(timecard.date).getMonth() + 1,
      year: new Date(timecard.date).getFullYear(),
      payPeriodStart: timecard.date,
      payPeriodEnd: timecard.date,
      entries: [],
      customFieldsData: timecard.customFieldsData || {},
      notes: timecard.notes || '',
      totalHours: parseFloat(timecard.totalHours || '0'),
      site: employee?.department || 'Unknown',
      isLeaveRequest: !!timecard.leaveRequestId,
      leaveType: timecard.leaveType || null,
      type: 'regular'
    };
  });

  // Debug logging
  console.log('Regular timecards:', regularTimecards.length);
  console.log('Leave request timecards:', regularTimecards.filter((t: any) => t.leaveRequestId).length);
  console.log('Draft timecards:', regularTimecards.filter((t: any) => t.status === 'draft').length);

  // Add type identifier to monthly timecards
  const monthlyTimecardsWithType = allTimecards.map((timecard: MonthlyTimecard) => ({
    ...timecard,
    type: 'monthly',
    isLeaveRequest: false
  }));

  // Combine both types of timecards
  const combinedTimecards = [...transformedRegularTimecards, ...monthlyTimecardsWithType];

  // Filter timecards based on selected site and status
  const filteredTimecards = combinedTimecards.filter((timecard: any) => {
    const employee = employees.find((emp: Employee) => emp.id === timecard.employeeId);
    const siteMatch = selectedSite === 'all' || employee?.department === selectedSite;
    const statusMatch = selectedStatus === 'all' || timecard.status === selectedStatus;
    
    return siteMatch && statusMatch;
  });

  // Calculate statistics
  const stats = {
    pending: filteredTimecards.filter(t => ['submitted_to_employee', 'employee_approved', 'submitted_to_admin', 'submitted_to_payroll'].includes(t.status)).length,
    approved: filteredTimecards.filter(t => t.status === 'payroll_processed').length,
    rejected: filteredTimecards.filter(t => t.status === 'rejected').length,
    total: filteredTimecards.length
  };

  // Admin approve timecard mutation
  const adminApproveTimecard = useMutation({
    mutationFn: async (data: { id: number; notes: string }) => {
      return await apiRequest(`/api/monthly-timecards/${data.id}/admin-approve`, "POST", { notes: data.notes });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timecard approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-timecards"] });
      setApprovalDialogOpen(false);
      setApprovalNotes('');
      setSelectedTimecard(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve timecard",
        variant: "destructive",
      });
    },
  });

  // Batch submit to admin mutation
  const batchSubmitToAdmin = useMutation({
    mutationFn: async (timecardIds: number[]) => {
      return await apiRequest(`/api/monthly-timecards/batch-submit-to-admin`, "POST", { timecardIds });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${selectedTimecardIds.length} timecards submitted to admin successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-timecards"] });
      setSelectedTimecardIds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit timecards to admin",
        variant: "destructive",
      });
    },
  });

  // Batch submit to payroll mutation
  const batchSubmitToPayroll = useMutation({
    mutationFn: async (timecardIds: number[]) => {
      return await apiRequest(`/api/monthly-timecards/batch-submit-to-payroll`, "POST", { timecardIds });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${selectedTimecardIds.length} timecards submitted to payroll successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-timecards"] });
      setSelectedTimecardIds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit timecards to payroll",
        variant: "destructive",
      });
    },
  });

  // Payroll process timecard mutation
  const payrollProcessTimecard = useMutation({
    mutationFn: async (data: { id: number; notes: string }) => {
      return await apiRequest(`/api/monthly-timecards/${data.id}/payroll-process`, "POST", { notes: data.notes });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timecard processed by payroll successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-timecards"] });
      setApprovalDialogOpen(false);
      setApprovalNotes('');
      setSelectedTimecard(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process timecard",
        variant: "destructive",
      });
    },
  });

  // Reject timecard mutation
  const rejectTimecard = useMutation({
    mutationFn: async (data: { id: number; reason: string }) => {
      return await apiRequest(`/api/monthly-timecards/${data.id}/reject`, "POST", { reason: data.reason });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Timecard rejected successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-timecards"] });
      setRejectionDialogOpen(false);
      setRejectionReason('');
      setSelectedTimecard(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject timecard",
        variant: "destructive",
      });
    },
  });

  // Handle approval
  const handleApprove = () => {
    if (!selectedTimecard) return;
    
    if (selectedTimecard.status === 'submitted_to_payroll') {
      payrollProcessTimecard.mutate({ id: selectedTimecard.id, notes: approvalNotes });
    } else {
      adminApproveTimecard.mutate({ id: selectedTimecard.id, notes: approvalNotes });
    }
  };

  // Handle batch submission
  const handleBatchSubmitToAdmin = () => {
    if (selectedTimecardIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select timecards to submit",
        variant: "destructive",
      });
      return;
    }
    batchSubmitToAdmin.mutate(selectedTimecardIds);
  };

  const handleBatchSubmitToPayroll = () => {
    if (selectedTimecardIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select timecards to submit to payroll",
        variant: "destructive",
      });
      return;
    }
    batchSubmitToPayroll.mutate(selectedTimecardIds);
  };

  // Handle checkbox selection
  const handleTimecardSelection = (timecardId: number, checked: boolean) => {
    if (checked) {
      setSelectedTimecardIds([...selectedTimecardIds, timecardId]);
    } else {
      setSelectedTimecardIds(selectedTimecardIds.filter(id => id !== timecardId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const employeeApprovedTimecards = filteredTimecards
        .filter(t => t.status === 'employee_approved')
        .map(t => t.id);
      setSelectedTimecardIds(employeeApprovedTimecards);
    } else {
      setSelectedTimecardIds([]);
    }
  };

  // Handle rejection
  const handleReject = () => {
    if (!selectedTimecard) return;
    rejectTimecard.mutate({ id: selectedTimecard.id, reason: rejectionReason });
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'submitted_to_employee':
        return 'bg-blue-100 text-blue-800';
      case 'employee_approved':
        return 'bg-purple-100 text-purple-800';
      case 'submitted_to_admin':
        return 'bg-orange-100 text-orange-800';
      case 'submitted_to_payroll':
        return 'bg-indigo-100 text-indigo-800';
      case 'payroll_processed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4" />;
      case 'submitted_to_employee':
        return <Clock className="h-4 w-4" />;
      case 'employee_approved':
        return <User className="h-4 w-4" />;
      case 'submitted_to_admin':
        return <Building className="h-4 w-4" />;
      case 'submitted_to_payroll':
        return <User className="h-4 w-4" />;
      case 'payroll_processed':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Timecard Approval</h1>
            <p className="text-gray-600">Review and approve monthly timecards submitted by employees</p>
          </div>
          {filterParam === 'payroll_processing' && (
            <Link href="/payroll">
              <Button variant="outline" size="sm">
                <Building className="mr-2" size={16} />
                Back to Payroll
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Payroll Processing Alert */}
      {filterParam === 'payroll_processing' && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center">
            <Building className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="font-semibold text-indigo-900">Payroll Processing View</h3>
          </div>
          <p className="text-sm text-indigo-700 mt-1">
            Viewing timecards ready for payroll processing. These timecards have been approved by administrators and are ready for final payroll calculations.
          </p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-full">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="site-filter">Site/Location</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger id="site-filter">
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {uniqueSites.map((site) => (
                    <SelectItem key={site} value={site}>
                      {site}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted_to_employee">Submitted to Employee</SelectItem>
                  <SelectItem value="employee_approved">Employee Approved</SelectItem>
                  <SelectItem value="submitted_to_admin">Submitted to Admin</SelectItem>
                  <SelectItem value="submitted_to_payroll">Submitted to Payroll</SelectItem>
                  <SelectItem value="payroll_processed">Payroll Processed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Submission Section - Show for employee_approved and submitted_to_payroll status */}
      {(selectedStatus === 'employee_approved' || selectedStatus === 'submitted_to_payroll') && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Check className="h-5 w-5" />
              <span>
                {selectedStatus === 'employee_approved' && 'Batch Submit to Admin'}
                {selectedStatus === 'submitted_to_payroll' && 'Batch Process Payroll'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => handleSelectAll(true)}
                  size="sm"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSelectAll(false)}
                  size="sm"
                >
                  Clear Selection
                </Button>
                <span className="text-sm text-gray-600">
                  {selectedTimecardIds.length} of {filteredTimecards.filter(t => t.status === selectedStatus).length} selected
                </span>
              </div>
              <Button
                onClick={selectedStatus === 'employee_approved' ? handleBatchSubmitToAdmin : handleBatchSubmitToPayroll}
                disabled={selectedTimecardIds.length === 0 || batchSubmitToAdmin.isPending || batchSubmitToPayroll.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {(batchSubmitToAdmin.isPending || batchSubmitToPayroll.isPending) ? 'Processing...' : 
                  selectedStatus === 'employee_approved' ? `Submit ${selectedTimecardIds.length} to Admin` : 
                  `Submit ${selectedTimecardIds.length} to Payroll`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timecards List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Timecards for Review</span>
            {selectedSite !== 'all' && (
              <Badge variant="secondary" className="ml-2">
                <Building className="h-4 w-4 mr-1" />
                {selectedSite}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTimecards.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No timecards found for the selected filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTimecards.map((timecard) => {
                const employee = employees.find((emp: Employee) => emp.id === timecard.employeeId);
                const totalHours = timecard.entries?.reduce((sum: number, entry: any) => sum + (parseFloat(entry.hours) || 0), 0) || 0;
                
                return (
                  <div
                    key={timecard.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      {/* Checkbox for employee_approved timecards */}
                      {timecard.status === 'employee_approved' && (
                        <div className="flex items-center mr-4">
                          <input
                            type="checkbox"
                            checked={selectedTimecardIds.includes(timecard.id)}
                            onChange={(e) => handleTimecardSelection(timecard.id, e.target.checked)}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-lg">
                                {employee?.firstName} {employee?.lastName}
                              </h3>
                              {timecard.isLeaveRequest && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <User className="h-3 w-3 mr-1" />
                                  Leave Request
                                </Badge>
                              )}
                              {timecard.type === 'regular' && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Daily
                                </Badge>
                              )}
                              {timecard.type === 'monthly' && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                  Monthly
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {employee?.position} • {employee?.department}
                            </p>
                            {timecard.isLeaveRequest && timecard.leaveType && (
                              <p className="text-sm text-blue-600 font-medium">
                                {timecard.leaveType}
                              </p>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {timecard.type === 'regular' ? 
                                  format(new Date(timecard.date), 'MMM d, yyyy') : 
                                  `${timecard.month}/${timecard.year}`
                                }
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 mt-1">
                              <Clock className="h-4 w-4" />
                              <span>{timecard.totalHours || totalHours} hours</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          {timecard.type === 'regular' ? 
                            `Date: ${format(new Date(timecard.date), 'MMM d, yyyy')}` :
                            `Pay Period: ${format(new Date(timecard.payPeriodStart), 'MMM d')} - ${format(new Date(timecard.payPeriodEnd), 'MMM d, yyyy')}`
                          }
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {timecard.isLocked && (
                            <div className="flex items-center space-x-1 bg-red-100 text-red-700 px-2 py-1 rounded-md">
                              <Lock className="h-4 w-4" />
                              <span className="text-sm">Locked</span>
                            </div>
                          )}
                          <Badge className={`${getStatusBadgeColor(timecard.status)} flex items-center space-x-1`}>
                            {getStatusIcon(timecard.status)}
                            <span className="capitalize">{timecard.status}</span>
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>
                                  Timecard Details - {employee?.firstName} {employee?.lastName}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Employee</Label>
                                    <p className="text-sm">{employee?.firstName} {employee?.lastName}</p>
                                  </div>
                                  <div>
                                    <Label>Position</Label>
                                    <p className="text-sm">{employee?.position}</p>
                                  </div>
                                  <div>
                                    <Label>Department</Label>
                                    <p className="text-sm">{employee?.department}</p>
                                  </div>
                                  <div>
                                    <Label>Period</Label>
                                    <p className="text-sm">{timecard.month}/{timecard.year}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <Label>Time Entries</Label>
                                  <div className="mt-2 border rounded">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-3 py-2 text-left">Date</th>
                                          <th className="px-3 py-2 text-left">Code</th>
                                          <th className="px-3 py-2 text-left">Hours</th>
                                          <th className="px-3 py-2 text-left">Description</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {timecard.entries?.filter((entry: any) => entry.hours && parseFloat(entry.hours) > 0).map((entry: any, index: number) => (
                                          <tr key={index} className="border-t">
                                            <td className="px-3 py-2">{entry.date}</td>
                                            <td className="px-3 py-2">{entry.code}</td>
                                            <td className="px-3 py-2">{entry.hours}</td>
                                            <td className="px-3 py-2">{entry.description}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                
                                <div>
                                  <Label>Total Hours</Label>
                                  <p className="text-lg font-semibold">{totalHours}</p>
                                </div>
                                
                                {timecard.notes && (
                                  <div>
                                    <Label>Notes</Label>
                                    <p className="text-sm bg-gray-50 p-3 rounded">{timecard.notes}</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>

                          {timecard.status === 'submitted' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:bg-green-50"
                                onClick={() => {
                                  setSelectedTimecard(timecard);
                                  setApprovalDialogOpen(true);
                                }}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedTimecard(timecard);
                                  setRejectionDialogOpen(true);
                                }}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}

                          {timecard.status === 'submitted_to_payroll' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setSelectedTimecard(timecard);
                                setApprovalDialogOpen(true);
                              }}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Process Payroll
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTimecard?.status === 'submitted_to_payroll' ? 'Process Payroll' : 'Approve Timecard'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <p className="text-sm">
                {selectedTimecard && employees.find(emp => emp.id === selectedTimecard.employeeId)?.firstName} {selectedTimecard && employees.find(emp => emp.id === selectedTimecard.employeeId)?.lastName}
              </p>
            </div>
            <div>
              <Label>Period</Label>
              <p className="text-sm">{selectedTimecard?.month}/{selectedTimecard?.year}</p>
            </div>
            <div>
              <Label htmlFor="approval-notes">
                {selectedTimecard?.status === 'submitted_to_payroll' ? 'Processing Notes (Optional)' : 'Approval Notes (Optional)'}
              </Label>
              <Textarea
                id="approval-notes"
                placeholder={selectedTimecard?.status === 'submitted_to_payroll' ? 'Add any notes about this payroll processing...' : 'Add any notes about this approval...'}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={adminApproveTimecard.isPending || payrollProcessTimecard.isPending}>
                {(adminApproveTimecard.isPending || payrollProcessTimecard.isPending) ? 'Processing...' : 
                  selectedTimecard?.status === 'submitted_to_payroll' ? 'Process Payroll' : 'Approve'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timecard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <p className="text-sm">
                {selectedTimecard && employees.find(emp => emp.id === selectedTimecard.employeeId)?.firstName} {selectedTimecard && employees.find(emp => emp.id === selectedTimecard.employeeId)?.lastName}
              </p>
            </div>
            <div>
              <Label>Period</Label>
              <p className="text-sm">{selectedTimecard?.month}/{selectedTimecard?.year}</p>
            </div>
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject} 
                disabled={rejectTimecard.isPending || !rejectionReason.trim()}
              >
                {rejectTimecard.isPending ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// Main component that switches between employee and admin views
export default function TimeCards() {
  const { user } = useAuth();
  
  // Show employee view for employee role, admin view for admin/hr roles
  if (user?.role === "employee") {
    return <EmployeeTimecardApproval />;
  } else {
    return <AdminTimecardApproval />;
  }
}
