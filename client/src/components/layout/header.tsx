import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const { user } = useAuth();
  
  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return 'Administrator';
  };

  const getRoleDisplay = () => {
    switch (user?.role) {
      case 'admin':
        return 'Administrator';
      case 'hr':
        return 'HR Administrator';
      case 'employee':
        return 'Employee';
      case 'secretary':
        return 'Secretary';
      default:
        return 'User';
    }
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return 'AD';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">Welcome back, {getDisplayName()} ({getRoleDisplay()})</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
              3
            </Badge>
          </Button>
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-medium text-gray-900">{getDisplayName()}</p>
              <p className="text-gray-600">{getRoleDisplay()}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
