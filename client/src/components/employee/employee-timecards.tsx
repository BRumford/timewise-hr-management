import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function EmployeeTimecards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employee's timecards
  const { data: timecards, isLoading } = useQuery({
    queryKey: ["/api/time-cards/employee-user", user?.id],
    enabled: !!user?.id,
  });

  // Approve timecard mutation
  const approveMutation = useMutation({
    mutationFn: async (timecardId: number) => {
      await apiRequest(`/api/time-cards/${timecardId}/approve`, "POST", {
        approvedBy: user?.id,
        approverRole: 'employee'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards/employee-user"] });
      toast({
        title: "Timecard Approved",
        description: "Your timecard has been approved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Approval Failed",
        description: "Failed to approve timecard. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending Approval</Badge>;
      case 'employee_approved':
        return <Badge variant="default" className="bg-blue-600">Employee Approved</Badge>;
      case 'secretary_approved':
        return <Badge variant="default" className="bg-green-600">Secretary Approved</Badge>;
      case 'admin_approved':
        return <Badge variant="default" className="bg-green-700">Admin Approved</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-800">Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            My Timecards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Loading your timecards...</div>
        </CardContent>
      </Card>
    );
  }

  const pendingTimecards = timecards?.filter((tc: any) => tc.status === 'pending') || [];
  const approvedTimecards = timecards?.filter((tc: any) => tc.status !== 'pending') || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            My Timecards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Pending Approval Section */}
            {pendingTimecards.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  Pending Your Approval ({pendingTimecards.length})
                </h3>
                <div className="space-y-3">
                  {pendingTimecards.map((timecard: any) => (
                    <div key={timecard.id} className="border rounded-lg p-4 bg-yellow-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            Pay Period: {new Date(timecard.payPeriodStart).toLocaleDateString()} - {new Date(timecard.payPeriodEnd).toLocaleDateString()}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Total Hours: {timecard.totalHours || 'Not calculated'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Submitted: {new Date(timecard.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(timecard.status)}
                          <Button
                            onClick={() => approveMutation.mutate(timecard.id)}
                            disabled={approveMutation.isPending}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Previously Approved Section */}
            {approvedTimecards.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Previously Approved ({approvedTimecards.length})
                </h3>
                <div className="space-y-3">
                  {approvedTimecards.slice(0, 5).map((timecard: any) => (
                    <div key={timecard.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            Pay Period: {new Date(timecard.payPeriodStart).toLocaleDateString()} - {new Date(timecard.payPeriodEnd).toLocaleDateString()}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Total Hours: {timecard.totalHours || 'Not calculated'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Approved: {timecard.employeeApprovedDate ? new Date(timecard.employeeApprovedDate).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        <div>
                          {getStatusBadge(timecard.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Timecards */}
            {(!timecards || timecards.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No timecards found.</p>
                <p className="text-sm">Your timecards will appear here when they are submitted by HR or administration.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}