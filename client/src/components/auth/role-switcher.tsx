import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

export default function RoleSwitcher() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>(user?.role || "employee");

  // Check if user can switch roles
  const { data: canSwitchData } = useQuery({
    queryKey: ['/api/auth/can-switch-roles'],
    enabled: !!user,
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const response = await apiRequest('/api/auth/switch-role', 'POST', { role });
      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: "Role Switched",
        description: `Successfully switched to ${selectedRole} role`,
      });
      
      // Refresh the page to update the sidebar
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "Role Switch Failed",
        description: error.message || "Failed to switch role",
        variant: "destructive",
      });
    },
  });

  const handleRoleSwitch = () => {
    if (selectedRole !== user?.role) {
      switchRoleMutation.mutate(selectedRole);
    }
  };

  // Don't show the switcher if user can't switch roles
  if (!canSwitchData?.canSwitch) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
      <span className="text-sm font-medium">Current Role: {user?.role}</span>
      <Select value={selectedRole} onValueChange={setSelectedRole}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="employee">Employee</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="hr">HR</SelectItem>
        </SelectContent>
      </Select>
      <Button 
        onClick={handleRoleSwitch}
        disabled={selectedRole === user?.role || switchRoleMutation.isPending}
        size="sm"
      >
        {switchRoleMutation.isPending ? "Switching..." : "Switch Role"}
      </Button>
    </div>
  );
}