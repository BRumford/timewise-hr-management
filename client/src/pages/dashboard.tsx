import { useAuth } from "@/hooks/useAuth";
import QuickActions from "@/components/dashboard/quick-actions";
import RecentActivity from "@/components/dashboard/recent-activity";
import AIAssistant from "@/components/dashboard/ai-assistant";
import EmployeeOverview from "@/components/dashboard/employee-overview";
import PayrollSummary from "@/components/dashboard/payroll-summary";
import DocumentProcessing from "@/components/dashboard/document-processing";

export default function Dashboard() {
  const { user } = useAuth();

  // If user is an employee, show only their personal overview
  if (user?.role === 'employee') {
    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.firstName || 'Employee'}</h1>
          <p className="text-gray-600">Your personal dashboard</p>
        </div>
        <EmployeeOverview />
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
