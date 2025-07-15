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
  UserCheck
} from "lucide-react";

const menuItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/employees", icon: Users, label: "Employee Management" },
  { path: "/leave-management", icon: Calendar, label: "Leave Management" },
  { path: "/time-cards", icon: Clock, label: "Time Cards" },
  { path: "/substitute-time-cards", icon: UserCheck, label: "Substitute Time Cards" },
  { path: "/payroll", icon: Calculator, label: "Payroll" },
  { path: "/documents", icon: FileText, label: "Documents" },
  { path: "/onboarding", icon: UserPlus, label: "Onboarding" },
  { path: "/reports", icon: BarChart3, label: "Reports" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 fixed left-0 top-0 h-full overflow-y-auto scrollbar-hide">
      {/* Logo and Brand */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">EduHR Pro</h1>
            <p className="text-sm text-gray-500">Lincoln School District</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <a className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-primary text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}>
                <Icon className="text-sm" size={16} />
                <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
              </a>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
