import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { RolePermission } from "@shared/schema";

export function useRolePermissions() {
  const { user } = useAuth();
  const role = user?.role;
  
  const { data: permissions = [], isLoading } = useQuery<RolePermission[]>({
    queryKey: ['/api/role-permissions', role],
    enabled: !!role,
    retry: false,
  });

  const hasAccess = (pagePath: string): boolean => {
    // System owner has universal access to everything
    if (role === 'system_owner') {
      return true;
    }
    
    // Employee role has extremely limited access - only dashboard
    if (role === 'employee') {
      return pagePath === '/';
    }
    
    // Admin role has very limited access - only timecard approval
    if (role === 'admin') {
      const adminPages = [
        '/', '/time-cards'  // Only dashboard and Administrator Timecard Approval
      ];
      return adminPages.includes(pagePath);
    }
    
    // HR role has full access to all HR and system functions
    if (role === 'hr') {
      // HR gets access to everything except system owner features
      const restrictedPages = ['/workflow-management', '/system-owner-login'];
      return !restrictedPages.includes(pagePath);
    }
    
    // Payroll role has full access including employee access management
    if (role === 'payroll') {
      // Payroll gets access to everything except system owner features
      const restrictedPages = ['/workflow-management', '/system-owner-login'];
      return !restrictedPages.includes(pagePath);
    }
    
    // For any other roles, check database permissions
    const permission = permissions.find((p: RolePermission) => p.pagePath === pagePath);
    return permission ? Boolean(permission.canAccess) : false;
  };

  return {
    permissions,
    isLoading,
    hasAccess
  };
}

export function useRolePermissionsManagement() {
  const queryClient = useQueryClient();
  
  const { data: allPermissions = [] } = useQuery({
    queryKey: ['/api/role-permissions'],
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ role, pagePath, canAccess }: { role: string; pagePath: string; canAccess: boolean }) => {
      return await apiRequest(`/api/role-permissions/${role}/${encodeURIComponent(pagePath)}`, 'PUT', { canAccess });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/role-permissions'] });
    }
  });

  return {
    allPermissions,
    updatePermission: updatePermissionMutation.mutate,
    isUpdating: updatePermissionMutation.isPending
  };
}