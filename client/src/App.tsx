import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Employees from "@/pages/employees";
import LeaveManagement from "@/pages/leave-management";
import TimeCards from "@/pages/time-cards";
import MonthlyTimecard from "@/pages/monthly-timecard";
import SubstituteTimeCards from "@/pages/substitute-time-cards";
import Payroll from "@/pages/payroll";
import PayrollSettings from "@/pages/payroll-settings";
import Documents from "@/pages/documents";
import Onboarding from "@/pages/onboarding";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import ExtraPayActivities from "@/pages/extra-pay-activities";
import ExtraPayWorkflow from "@/pages/extra-pay-workflow";
import Letters from "@/pages/letters";
import TimecardTemplates from "@/pages/timecard-templates";
import FieldLabels from "@/pages/field-labels";
import DistrictCustomization from "@/pages/district-customization";
import Login from "@/pages/login";
import EmployeeLogin from "@/pages/employee-login";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Retirees from "@/pages/retirees";
import ArchivedEmployees from "@/pages/archived-employees";
import SupportDocumentation from "@/pages/support-documentation";
import DropdownSettings from "@/pages/dropdown-settings";
import PrivacyPolicies from "@/pages/privacy-policies";
import DataDeletionRequests from "@/pages/data-deletion-requests";

import EmployeeAccessManagement from "@/pages/employee-access-management";
import Benefits from "@/pages/benefits";
import DistrictManagement from "@/pages/district-management";
import DistrictLogin from "@/pages/district-login";
import MultiTenantDemo from "@/pages/multi-tenant-demo";
import DataIsolationDemo from "@/pages/data-isolation-demo";
import SystemOwnerLogin from "@/pages/system-owner-login";
import SystemOwnerDashboard from "@/pages/system-owner-dashboard";
import WorkflowManagement from "@/pages/workflow-management";
import PafManagement from "@/pages/paf-management";
import PafTimeline from "@/pages/paf-timeline";
import SystemOwnerPafOverview from "@/pages/system-owner-paf-overview";
import TimecardAutomation from "@/pages/timecard-automation";
import PayrollCalendar from "@/pages/payroll-calendar";
import AIDashboard from "@/pages/ai-dashboard";
import DataIsolationDashboard from "@/pages/data-isolation-dashboard";

import DistrictSetup from "@/pages/district-setup";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

function Router() {
  return (
    <Switch>
      {/* Authentication routes (no sidebar/header) */}
      <Route path="/login" component={Login} />
      <Route path="/district-setup" component={DistrictSetup} />
      <Route path="/employee-login" component={EmployeeLogin} />
      <Route path="/district-login" component={DistrictLogin} />
      <Route path="/system-owner-login" component={SystemOwnerLogin} />
      <Route path="/system-owner/dashboard" component={SystemOwnerDashboard} />
      <Route path="/system-owner/workflows" component={WorkflowManagement} />
      <Route path="/system-owner/paf-overview" component={SystemOwnerPafOverview} />
      <Route path="/system-owner/data-isolation" component={DataIsolationDashboard} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      
      {/* Main application routes (with sidebar/header) */}
      <Route>
        <div className="min-h-screen flex">
          <Sidebar />
          <div className="flex-1 ml-64">
            <Header />
            <main className="p-6">
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/employees" component={Employees} />
                <Route path="/benefits" component={Benefits} />
                <Route path="/leave-management" component={LeaveManagement} />
                <Route path="/time-cards" component={TimeCards} />
                <Route path="/monthly-timecard" component={MonthlyTimecard} />
                <Route path="/substitute-time-cards" component={SubstituteTimeCards} />
                <Route path="/timecard-templates" component={TimecardTemplates} />
                <Route path="/timecard-automation" component={TimecardAutomation} />
                <Route path="/payroll" component={Payroll} />
                <Route path="/payroll-settings" component={PayrollSettings} />
                <Route path="/documents" component={Documents} />
                <Route path="/onboarding" component={Onboarding} />
                <Route path="/extra-pay-activities" component={ExtraPayActivities} />
                <Route path="/extra-pay-workflow" component={ExtraPayWorkflow} />
                <Route path="/letters" component={Letters} />
                <Route path="/reports" component={Reports} />
                <Route path="/settings" component={Settings} />
                <Route path="/payroll-calendar" component={PayrollCalendar} />
                <Route path="/field-labels" component={FieldLabels} />
                <Route path="/district-customization" component={DistrictCustomization} />
                <Route path="/retirees" component={Retirees} />
                <Route path="/archived-employees" component={ArchivedEmployees} />
                <Route path="/support-documentation" component={SupportDocumentation} />
                <Route path="/dropdown-settings" component={DropdownSettings} />
                <Route path="/privacy-policies" component={PrivacyPolicies} />
                <Route path="/data-deletion-requests" component={DataDeletionRequests} />
                <Route path="/workflow-management" component={WorkflowManagement} />
                <Route path="/paf-management" component={PafManagement} />
                <Route path="/paf/:id/timeline" component={PafTimeline} />
                <Route path="/employee-access-management" component={EmployeeAccessManagement} />
                <Route path="/district-management" component={DistrictManagement} />
                <Route path="/data-isolation-demo" component={DataIsolationDemo} />
                <Route path="/ai-dashboard" component={AIDashboard} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
