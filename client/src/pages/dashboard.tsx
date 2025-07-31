import { useAuth } from "@/hooks/useAuth";
import QuickActions from "@/components/dashboard/quick-actions";
import RecentActivity from "@/components/dashboard/recent-activity";
import AIAssistant from "@/components/dashboard/ai-assistant";
import EmployeeOverview from "@/components/dashboard/employee-overview";
import PayrollSummary from "@/components/dashboard/payroll-summary";
import DocumentProcessing from "@/components/dashboard/document-processing";
import EmployeeTimecards from "@/components/employee/employee-timecards";
import EmployeeLeaveRequests from "@/components/employee/employee-leave-requests";

export default function Dashboard() {
  const { user } = useAuth();

  // If user is an employee, show only their personal timecard and leave request functionality
  if (user?.role === 'employee') {
    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Employee'}
          </h1>
          <p className="text-gray-600">Manage your timecards and leave requests</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EmployeeTimecards />
          <EmployeeLeaveRequests />
        </div>
      </div>
    );
  }

  // Admin and HR see the full dashboard
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Administrator'}
        </h1>
        <p className="text-gray-600">
          {user?.role === 'admin' ? 'Administrator Dashboard' : 'HR Management Dashboard'}
        </p>
      </div>
      
      <QuickActions />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        <AIAssistant />
      </div>

      <EmployeeOverview />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PayrollSummary />
        <DocumentProcessing />
      </div>
    </div>
  );
}
