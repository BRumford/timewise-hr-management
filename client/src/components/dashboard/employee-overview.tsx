import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, FileText, User } from "lucide-react";
import { formatDate } from "date-fns";

export default function EmployeeOverview() {
  const { user } = useAuth();
  
  // Get employee's own information
  const { data: employee } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
  });

  // Get employee's own leave requests
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['/api/leave-requests'],
    enabled: !!user,
  });

  // Get employee's own time cards
  const { data: timeCards = [] } = useQuery({
    queryKey: ['/api/time-cards'],
    enabled: !!user,
  });

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading your information...</p>
      </div>
    );
  }

  const pendingLeaveRequests = leaveRequests.filter((req: any) => req.status === 'pending');
  const approvedLeaveRequests = leaveRequests.filter((req: any) => req.status === 'approved');
  const pendingTimeCards = timeCards.filter((card: any) => card.status === 'submitted' || card.status === 'draft');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Personal Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Profile</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm font-medium">{employee.firstName} {employee.lastName}</p>
              <p className="text-xs text-muted-foreground">{employee.email}</p>
              <Badge variant="outline" className="text-xs">
                {employee.role}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Leave Requests Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{pendingLeaveRequests.length}</p>
              <p className="text-xs text-muted-foreground">Pending approval</p>
              <p className="text-xs text-green-600">{approvedLeaveRequests.length} approved</p>
            </div>
          </CardContent>
        </Card>

        {/* Time Cards Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Cards</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{pendingTimeCards.length}</p>
              <p className="text-xs text-muted-foreground">Pending review</p>
              <p className="text-xs text-green-600">{timeCards.length - pendingTimeCards.length} processed</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <CalendarDays className="mr-2 h-4 w-4" />
                Request Leave
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Clock className="mr-2 h-4 w-4" />
                Submit Time Card
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Your Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leaveRequests.slice(0, 5).map((request: any) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Leave Request</p>
                    <p className="text-xs text-muted-foreground">
                      {request.startDate && request.endDate ? 
                        `${formatDate(new Date(request.startDate), 'MMM dd')} - ${formatDate(new Date(request.endDate), 'MMM dd')}` : 
                        'Date not available'
                      }
                    </p>
                  </div>
                </div>
                <Badge variant={request.status === 'approved' ? 'default' : request.status === 'pending' ? 'secondary' : 'destructive'}>
                  {request.status}
                </Badge>
              </div>
            ))}
            
            {timeCards.slice(0, 3).map((card: any) => (
              <div key={card.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Time Card</p>
                    <p className="text-xs text-muted-foreground">
                      {card.date ? formatDate(new Date(card.date), 'MMM dd, yyyy') : 'Date not available'}
                    </p>
                  </div>
                </div>
                <Badge variant={card.status === 'approved' ? 'default' : card.status === 'submitted' ? 'secondary' : 'outline'}>
                  {card.status}
                </Badge>
              </div>
            ))}

            {leaveRequests.length === 0 && timeCards.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No recent activity to display</p>
                <p className="text-sm mt-2">Submit a leave request or time card to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}