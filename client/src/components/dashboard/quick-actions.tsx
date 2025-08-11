import { UserPlus, CalendarCheck, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function QuickActions() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New Employee Onboarding</p>
              <p className="text-2xl font-bold text-gray-900">{(stats as any)?.pendingOnboarding || 0}</p>
              <p className="text-sm text-gray-500">Pending completion</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <UserPlus className="text-blue-600" size={20} />
            </div>
          </div>
          <Button 
            className="mt-4 w-full bg-primary hover:bg-blue-700"
            onClick={() => setLocation('/onboarding')}
          >
            View Pending
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Leave Requests</p>
              <p className="text-2xl font-bold text-gray-900">{(stats as any)?.pendingLeaveRequests || 0}</p>
              <p className="text-sm text-gray-500">Awaiting approval</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CalendarCheck className="text-green-600" size={20} />
            </div>
          </div>
          <Button 
            className="mt-4 w-full bg-accent hover:bg-green-700"
            onClick={() => setLocation('/leave-management')}
          >
            Review Requests
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Substitute Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{(stats as any)?.todaySubstituteAssignments || 0}</p>
              <p className="text-sm text-gray-500">Auto-assigned today</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <RefreshCw className="text-purple-600" size={20} />
            </div>
          </div>
          <Button 
            className="mt-4 w-full bg-purple-600 hover:bg-purple-700"
            onClick={() => setLocation('/substitute-time-cards')}
          >
            View Assignments
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
