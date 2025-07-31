import { useQuery } from "@tanstack/react-query";

export interface User {
  id: string;
  role: 'admin' | 'hr' | 'employee';
  email?: string;
  firstName?: string;
  lastName?: string;
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    position: string;
  } | null;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isHR: user?.role === 'hr',
    isEmployee: user?.role === 'employee',
    canViewAllRecords: user?.role === 'admin' || user?.role === 'hr',
  };
}