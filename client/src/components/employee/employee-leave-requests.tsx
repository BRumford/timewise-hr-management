import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function EmployeeLeaveRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
    notes: ""
  });

  // Fetch employee's leave requests  
  const { data: leaveRequests, isLoading } = useQuery({
    queryKey: ["/api/leave-requests"],
    enabled: !!user?.id,
  });

  // Fetch leave types
  const { data: leaveTypes } = useQuery({
    queryKey: ["/api/leave-types"],
  });

  // Submit leave request mutation
  const submitMutation = useMutation({
    mutationFn: async (requestData: any) => {
      await apiRequest("/api/leave-requests", "POST", {
        ...requestData,
        employeeId: user?.employee?.id || user?.id,
        requestedBy: user?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      setShowNewRequest(false);
      setNewRequest({ leaveTypeId: "", startDate: "", endDate: "", reason: "", notes: "" });
      toast({
        title: "Leave Request Submitted",
        description: "Your leave request has been submitted for approval.",
      });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "Failed to submit leave request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitRequest = () => {
    if (!newRequest.leaveTypeId || !newRequest.startDate || !newRequest.endDate || !newRequest.reason) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate(newRequest);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending Review</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            My Leave Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Loading your leave requests...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              My Leave Requests
            </div>
            <Button
              onClick={() => setShowNewRequest(!showNewRequest)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Request
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* New Request Form */}
          {showNewRequest && (
            <div className="border rounded-lg p-4 mb-6 bg-blue-50">
              <h3 className="font-semibold text-lg mb-4">Submit New Leave Request</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="leaveType">Leave Type *</Label>
                  <Select value={newRequest.leaveTypeId} onValueChange={(value) => setNewRequest(prev => ({ ...prev, leaveTypeId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes?.map((type: any) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reason">Reason *</Label>
                  <Input
                    id="reason"
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Brief reason for leave"
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newRequest.startDate}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newRequest.endDate}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, endDate: e.target.value }))}
                    min={newRequest.startDate}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={newRequest.notes}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional information or details"
                    rows={3}
                  />
                </div>
                {newRequest.startDate && newRequest.endDate && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">
                      Total Days: {calculateDays(newRequest.startDate, newRequest.endDate)} days
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleSubmitRequest}
                  disabled={submitMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
                <Button
                  onClick={() => setShowNewRequest(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing Leave Requests */}
          <div className="space-y-4">
            {leaveRequests && leaveRequests.length > 0 ? (
              leaveRequests.map((request: any) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">
                      {request.leaveType?.name || 'Leave Request'}
                    </h4>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Dates:</span>
                      <p>{new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Duration:</span>
                      <p>{calculateDays(request.startDate, request.endDate)} days</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Submitted:</span>
                      <p>{new Date(request.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="font-medium text-gray-600">Reason:</span>
                    <p className="text-sm">{request.reason}</p>
                  </div>
                  {request.notes && (
                    <div className="mt-2">
                      <span className="font-medium text-gray-600">Notes:</span>
                      <p className="text-sm">{request.notes}</p>
                    </div>
                  )}
                  {request.adminNotes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <span className="font-medium text-gray-600">Admin Response:</span>
                      <p className="text-sm">{request.adminNotes}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No leave requests found.</p>
                <p className="text-sm">Click "New Request" to submit your first leave request.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}