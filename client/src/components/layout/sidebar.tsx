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
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import RoleSwitcher from "@/components/auth/role-switcher";
import { useState } from "react";

// Main navigation items
const mainMenuItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard", roles: ["admin", "hr"] },
  { path: "/employees", icon: Users, label: "Employee Management", roles: ["admin", "hr"] },
  { path: "/leave-management", icon: Calendar, label: "Leave Management", roles: ["admin", "hr", "employee"] },
  { path: "/time-cards", icon: Clock, label: "Admin Timecard Approval", roles: ["admin", "hr", "employee"] },
  { path: "/monthly-timecard", icon: Calendar, label: "Monthly Timecard", roles: ["admin", "hr"] },
  { path: "/substitute-time-cards", icon: UserCheck, label: "Substitute Time Cards", roles: ["admin", "hr"] },

  { path: "/payroll", icon: Calculator, label: "Payroll", roles: ["admin", "hr"] },
  { path: "/extra-pay-activities", icon: DollarSign, label: "Extra Pay Activities", roles: ["admin", "hr"] },

  { path: "/letters", icon: Mail, label: "Letters", roles: ["admin", "hr"] },
  { path: "/onboarding", icon: UserPlus, label: "Onboarding", roles: ["admin", "hr"] },
  { path: "/reports", icon: BarChart3, label: "Reports", roles: ["admin", "hr"] },
  { path: "/retirees", icon: Heart, label: "Retirees", roles: ["admin", "hr"] },
  { path: "/archived-employees", icon: Archive, label: "Archived Employees", roles: ["admin", "hr"] },
  { path: "/privacy-policies", icon: Shield, label: "Privacy Policies", roles: ["admin", "hr"] },
  { path: "/data-deletion-requests", icon: Trash2, label: "Data Deletion Requests", roles: ["admin", "hr"] },
  { path: "/performance-dashboard", icon: Activity, label: "Performance Dashboard", roles: ["admin", "hr"] },
  { path: "/compliance-dashboard", icon: ShieldAlert, label: "Compliance Dashboard", roles: ["admin", "hr"] },
  { path: "/employee-access-management", icon: UserCheck, label: "Employee Access Management", roles: ["admin", "hr"] },
];

// Administrative settings dropdown items
const adminDropdownItems = [
  { path: "/timecard-templates", icon: Layout, label: "Timecard Templates", roles: ["admin", "hr"] },
  { path: "/documents", icon: FileText, label: "Documents", roles: ["admin", "hr"] },
  { path: "/payroll-settings", icon: Settings, label: "Payroll Settings", roles: ["admin", "hr"] },
  { path: "/field-labels", icon: Tag, label: "Field Labels", roles: ["admin", "hr"] },
  { path: "/support-documentation", icon: BookOpen, label: "Support Documentation", roles: ["admin", "hr"] },
  { path: "/security-updates", icon: ShieldCheck, label: "Security Updates", roles: ["admin", "hr"] },
  { path: "/security-monitoring", icon: Shield, label: "Security Monitoring", roles: ["admin", "hr"] },
  { path: "/dropdown-settings", icon: Settings, label: "Dropdown Settings", roles: ["admin", "hr"] },
  { path: "/settings", icon: Settings, label: "Settings", roles: ["admin", "hr"] },
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
              <h1 className="text-xl font-bold text-gray-900">EduHR Pro</h1>
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
            <h1 className="text-xl font-bold text-gray-900">EduHR Pro</h1>
            <p className="text-sm text-gray-500">
              {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : "Lincoln School District"}
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
        <RoleSwitcher />
      </div>
    </div>
  );
}
