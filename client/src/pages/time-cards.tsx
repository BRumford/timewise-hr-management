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

export default function AdminTimecardApproval() {
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('submitted');
  const [selectedTimecard, setSelectedTimecard] = useState<MonthlyTimecard | null>(null);
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

  // Get unique sites from employees
  const uniqueSites = [...new Set(employees.map((emp: Employee) => emp.department).filter(Boolean))];

  // Filter timecards based on selected site and status
  const filteredTimecards = allTimecards.filter((timecard: MonthlyTimecard) => {
    const employee = employees.find((emp: Employee) => emp.id === timecard.employeeId);
    const siteMatch = selectedSite === 'all' || employee?.department === selectedSite;
    const statusMatch = selectedStatus === 'all' || timecard.status === selectedStatus;
    
    return siteMatch && statusMatch;
  });

  // Calculate statistics
  const stats = {
    pending: filteredTimecards.filter(t => t.status === 'submitted').length,
    approved: filteredTimecards.filter(t => t.status === 'approved').length,
    rejected: filteredTimecards.filter(t => t.status === 'rejected').length,
    total: filteredTimecards.length
  };

  // Approve timecard mutation
  const approveTimecard = useMutation({
    mutationFn: async (data: { id: number; notes: string }) => {
      return await apiRequest(`/api/monthly-timecards/${data.id}/approve`, "POST", { notes: data.notes });
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
    approveTimecard.mutate({ id: selectedTimecard.id, notes: approvalNotes });
  };

  // Handle rejection
  const handleReject = () => {
    if (!selectedTimecard) return;
    rejectTimecard.mutate({ id: selectedTimecard.id, reason: rejectionReason });
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'draft':
        return <FileText className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Timecard Approval</h1>
        <p className="text-gray-600">Review and approve monthly timecards submitted by employees</p>
      </div>

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
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {employee?.firstName} {employee?.lastName}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {employee?.position} • {employee?.department}
                            </p>
                          </div>
                          <div className="text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{timecard.month}/{timecard.year}</span>
                            </div>
                            <div className="flex items-center space-x-1 mt-1">
                              <Clock className="h-4 w-4" />
                              <span>{totalHours} hours</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          Pay Period: {format(new Date(timecard.payPeriodStart), 'MMM d')} - {format(new Date(timecard.payPeriodEnd), 'MMM d, yyyy')}
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
            <DialogTitle>Approve Timecard</DialogTitle>
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
              <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
              <Textarea
                id="approval-notes"
                placeholder="Add any notes about this approval..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={approveTimecard.isPending}>
                {approveTimecard.isPending ? 'Approving...' : 'Approve'}
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