import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  targetAudience: string;
  isActive: boolean;
  isDismissible: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export default function Header() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Fetch active notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/security/notifications'],
    enabled: !!user,
  });

  // Filter notifications based on user role and target audience
  const userNotifications = notifications.filter(notification => {
    const targetAudience = notification.targetAudience.toLowerCase();
    const userRole = user?.role?.toLowerCase() || '';
    
    return targetAudience === 'all' || 
           targetAudience === userRole || 
           (targetAudience === 'admins' && userRole === 'admin') ||
           (targetAudience === 'employees' && userRole === 'employee');
  });

  // Dismiss notification mutation
  const dismissNotificationMutation = useMutation({
    mutationFn: (notificationId: number) => apiRequest(`/api/security/notifications/${notificationId}/dismiss`, 'PATCH'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/security/notifications'] });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };
  
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
          <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative z-10 hover:bg-gray-100 focus:bg-gray-100"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              >
                <Bell className="h-5 w-5" />
                {userNotifications.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center pointer-events-none">
                    {userNotifications.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">Notifications</h3>
                <p className="text-sm text-gray-600">
                  {userNotifications.length} active notifications
                </p>
              </div>
              <ScrollArea className="max-h-80">
                <div className="p-2">
                  {userNotifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {userNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            "p-3 rounded-lg border border-l-4",
                            getSeverityColor(notification.severity)
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm text-gray-900">
                                  {notification.title}
                                </h4>
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-xs text-white font-medium",
                                    getSeverityBadgeColor(notification.severity)
                                  )}
                                >
                                  {notification.severity.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                            {notification.isDismissible && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-gray-200"
                                onClick={() => {
                                  dismissNotificationMutation.mutate(notification.id);
                                }}
                                disabled={dismissNotificationMutation.isPending}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
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
