import QuickActions from "@/components/dashboard/quick-actions";
import RecentActivity from "@/components/dashboard/recent-activity";
import AIAssistant from "@/components/dashboard/ai-assistant";
import EmployeeOverview from "@/components/dashboard/employee-overview";
import PayrollSummary from "@/components/dashboard/payroll-summary";
import DocumentProcessing from "@/components/dashboard/document-processing";

export default function Dashboard() {
  return (
    <div className="space-y-6">
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
