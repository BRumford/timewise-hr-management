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
    // Employee role has extremely limited access - only dashboard
    if (role === 'employee') {
      return pagePath === '/';
    }
    
    // For all other roles (admin, hr, secretary), check database permissions
    const permission = permissions.find((p: RolePermission) => p.pagePath === pagePath);
    return permission ? permission.canAccess : false;
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