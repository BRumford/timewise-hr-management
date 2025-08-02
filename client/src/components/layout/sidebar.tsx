import { Link, useLocation } from "wouter";
import { 
  GraduationCap, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Calculator, 
  FileText, 
  UserPlus, 
  BarChart3, 
  Settings,
  Clock,
  UserCheck,
  DollarSign,
  Mail,
  Layout,
  Tag,
  Archive,
  Heart,
  Shield,
  BookOpen,
  ShieldCheck,
  Trash2,
  Activity,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Building2,
  ClipboardList
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import RoleSwitcher from "@/components/auth/role-switcher";
import { useState } from "react";

// Main navigation items - Role-based access control
const mainMenuItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard", roles: ["admin", "hr", "payroll", "employee"] },
  
  // Admin has very limited access - only timecard approval
  { path: "/time-cards", icon: Clock, label: "Administrator Timecard Approval", roles: ["admin"] },
  
  // HR has full access to all HR and system functions
  { path: "/district-management", icon: Building2, label: "District Management", roles: ["hr"] },
  { path: "/onboarding", icon: UserPlus, label: "Onboarding", roles: ["hr", "payroll"] },
  { path: "/employees", icon: Users, label: "Employee Management", roles: ["hr", "payroll"] },
  { path: "/leave-management", icon: Calendar, label: "Leave Management", roles: ["hr", "payroll"] },
  { path: "/benefits", icon: FileSpreadsheet, label: "Benefits", roles: ["hr", "payroll"] },
  { path: "/retirees", icon: Heart, label: "Retirees", roles: ["hr", "payroll"] },
  { path: "/archived-employees", icon: Archive, label: "Archived Employees", roles: ["hr", "payroll"] },
  
  // Payroll-specific features (HR and Payroll both have full access)
  { path: "/monthly-timecard", icon: Calendar, label: "Monthly Timecard", roles: ["hr", "payroll"] },
  { path: "/substitute-time-cards", icon: UserCheck, label: "Substitute Time Cards", roles: ["hr", "payroll"] },
  { path: "/payroll", icon: Calculator, label: "Payroll", roles: ["hr", "payroll"] },
  { path: "/payroll-calendar", icon: Calendar, label: "Payroll Calendar", roles: ["hr", "payroll"] },
  { path: "/extra-pay-activities", icon: DollarSign, label: "Extra Pay Activities", roles: ["hr", "payroll"] },

  // Shared features (HR and Payroll have full access)
  { path: "/letters", icon: Mail, label: "Letters", roles: ["hr", "payroll"] },
  { path: "/paf-management", icon: ClipboardList, label: "Personnel Action Forms", roles: ["hr", "payroll", "admin"] },
  { path: "/timecard-automation", icon: Clock, label: "Timecard Automation", roles: ["hr", "admin"] },
  { path: "/reports", icon: BarChart3, label: "Reports", roles: ["hr", "payroll"] },
];

// Administrative settings dropdown items
const adminDropdownItems = [
  { path: "/timecard-templates", icon: Layout, label: "Timecard Templates", roles: ["hr", "payroll", "system_owner"] },
  { path: "/documents", icon: FileText, label: "Documents", roles: ["hr", "payroll", "system_owner"] },
  { path: "/payroll-settings", icon: Settings, label: "Payroll Settings", roles: ["hr", "payroll", "system_owner"] },
  { path: "/field-labels", icon: Tag, label: "Field Labels", roles: ["hr", "payroll", "system_owner"] },
  { path: "/support-documentation", icon: BookOpen, label: "Support Documentation", roles: ["hr", "payroll", "system_owner"] },
  { path: "/workflow-management", icon: Activity, label: "Workflow Management", roles: ["system_owner"] },
  { path: "/dropdown-settings", icon: Settings, label: "Dropdown Settings", roles: ["hr", "payroll", "system_owner"] },
  { path: "/employee-access-management", icon: UserCheck, label: "Employee Access Management", roles: ["payroll", "system_owner"] },
  { path: "/privacy-policies", icon: Shield, label: "Privacy Policies", roles: ["hr", "payroll", "system_owner"] },
  { path: "/data-deletion-requests", icon: Trash2, label: "Data Deletion Requests", roles: ["hr", "payroll", "system_owner"] },
  { path: "/settings", icon: Settings, label: "Settings", roles: ["hr", "payroll", "system_owner"] },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();
  const { hasAccess } = useRolePermissions();

  // Check if any admin dropdown item is currently active
  const visibleAdminDropdownItems = adminDropdownItems.filter(item => hasAccess(item.path));
  const isAdminDropdownActive = visibleAdminDropdownItems.some(item => location === item.path);
  
  // Auto-open dropdown if on an admin page, otherwise use state
  const [manualDropdownOpen, setManualDropdownOpen] = useState(false);
  const adminDropdownOpen = isAdminDropdownActive || manualDropdownOpen;

  if (isLoading) {
    return (
      <div className="w-64 bg-white shadow-lg border-r border-gray-200 fixed left-0 top-0 h-full overflow-y-auto scrollbar-hide">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Timewise K-12</h1>
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter main menu items based on user role and permissions
  const visibleMainMenuItems = mainMenuItems.filter(item => {
    return hasAccess(item.path);
  }).map(item => {
    // Customize the time-cards label based on user role
    if (item.path === '/time-cards') {
      return {
        ...item,
        label: user?.role === 'employee' ? 'Employee Timecard Approval' : 'Admin Timecard Approval'
      };
    }
    return item;
  });

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 fixed left-0 top-0 h-full overflow-y-auto scrollbar-hide flex flex-col">
      {/* Logo and Brand */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Timewise K-12</h1>
            <p className="text-sm text-gray-500">
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "Lincoln School District"}
            </p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4 space-y-2 flex-1">
        {/* Main Menu Items */}
        {visibleMainMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <div className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                isActive 
                  ? 'bg-primary text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}>
                <Icon className="text-sm" size={16} />
                <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
              </div>
            </Link>
          );
        })}

        {/* Administrative Settings Dropdown */}
        {visibleAdminDropdownItems.length > 0 && (
          <div className="space-y-1">
            <div 
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                isAdminDropdownActive || adminDropdownOpen
                  ? 'bg-primary text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setManualDropdownOpen(!manualDropdownOpen)}
            >
              <Settings className="text-sm" size={16} />
              <span className="flex-1">Settings</span>
              {adminDropdownOpen ? (
                <ChevronDown className="text-sm" size={16} />
              ) : (
                <ChevronRight className="text-sm" size={16} />
              )}
            </div>

            {/* Dropdown Items */}
            {adminDropdownOpen && (
              <div className="ml-6 space-y-1">
                {visibleAdminDropdownItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  
                  return (
                    <Link key={item.path} href={item.path}>
                      <div className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        isActive 
                          ? 'bg-primary text-white' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}>
                        <Icon className="text-sm" size={14} />
                        <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Role Switcher */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-2">
          Logged in as {user?.role}
        </div>
        <RoleSwitcher />
        <button 
          onClick={() => window.location.href = '/api/auth/logout'}
          className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline w-full text-left"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
