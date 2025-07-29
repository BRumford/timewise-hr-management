import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  Key, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User,
  Lock,
  Unlock,
  RotateCcw,
  Eye,
  EyeOff
} from "lucide-react";
import { format } from "date-fns";

const createAccountSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm password"),
  tempPassword: z.boolean().default(true),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const grantAccessSchema = z.object({
  temporaryUntil: z.string().optional(),
  notes: z.string().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm password"),
  requirePasswordChange: z.boolean().default(true),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function EmployeeAccessManagement() {
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employee accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['/api/employee-accounts'],
  });

  // Fetch employees without accounts
  const { data: employees = [] } = useQuery({
    queryKey: ['/api/employees'],
  });

  const createAccountForm = useForm({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      employeeId: "",
      username: "",
      password: "",
      confirmPassword: "",
      tempPassword: true,
    },
  });

  const grantAccessForm = useForm({
    resolver: zodResolver(grantAccessSchema),
    defaultValues: {
      temporaryUntil: "",
      notes: "",
    },
  });

  const resetPasswordForm = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
      requirePasswordChange: true,
    },
  });

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createAccountSchema>) => {
      return apiRequest('/api/employee-accounts/create', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee account created successfully",
      });
      setShowCreateDialog(false);
      createAccountForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/employee-accounts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  // Grant access mutation
  const grantAccessMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof grantAccessSchema> }) => {
      return apiRequest(`/api/employee-accounts/${id}/grant-access`, 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Access granted successfully",
      });
      setShowGrantDialog(false);
      grantAccessForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/employee-accounts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to grant access",
        variant: "destructive",
      });
    },
  });

  // Revoke access mutation
  const revokeAccessMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      return apiRequest(`/api/employee-accounts/${id}/revoke-access`, 'POST', { notes });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Access revoked successfully",
      });
      setShowRevokeDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/employee-accounts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke access",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof resetPasswordSchema> }) => {
      return apiRequest(`/api/employee-accounts/${id}/reset-password`, 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
      setShowResetDialog(false);
      resetPasswordForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/employee-accounts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  // Toggle login enabled mutation
  const toggleLoginMutation = useMutation({
    mutationFn: async ({ id, loginEnabled }: { id: number; loginEnabled: boolean }) => {
      return apiRequest(`/api/employee-accounts/${id}`, 'PUT', { loginEnabled });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Login status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/employee-accounts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update login status",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (account: any) => {
    if (!account.hasAccess) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        No Access
      </Badge>;
    }
    if (!account.loginEnabled) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <Lock className="w-3 h-3" />
        Login Disabled
      </Badge>;
    }
    if (account.temporaryAccessUntil && new Date(account.temporaryAccessUntil) < new Date()) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Expired
      </Badge>;
    }
    if (account.accountLocked) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <ShieldX className="w-3 h-3" />
        Locked
      </Badge>;
    }
    return <Badge variant="default" className="flex items-center gap-1">
      <CheckCircle className="w-3 h-3" />
      Active
    </Badge>;
  };

  // Filter employees who don't have accounts yet
  const employeesWithoutAccounts = employees.filter((emp: any) => 
    !accounts.some((acc: any) => acc.employeeId === emp.id)
  );

  const activeAccounts = accounts.filter((acc: any) => acc.hasAccess && acc.loginEnabled);
  const inactiveAccounts = accounts.filter((acc: any) => !acc.hasAccess || !acc.loginEnabled);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading employee accounts...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Employee Access Management
          </h1>
          <p className="text-gray-600">
            Manage individual employee login accounts and access permissions
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Create Account
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeAccounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Accounts</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inactiveAccounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Without Accounts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{employeesWithoutAccounts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Employee Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Access Granted</TableHead>
                <TableHead>Login Enabled</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account: any) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {account.firstName} {account.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {account.employeeIdNumber} • {account.department}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {account.userEmail}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(account)}
                  </TableCell>
                  <TableCell>
                    {account.lastLoginAt ? (
                      <div className="text-sm">
                        {format(new Date(account.lastLoginAt), 'MMM dd, yyyy')}
                        <div className="text-xs text-gray-500">
                          {format(new Date(account.lastLoginAt), 'h:mm a')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {account.accessGrantedAt ? (
                      <div className="text-sm">
                        {format(new Date(account.accessGrantedAt), 'MMM dd, yyyy')}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={account.loginEnabled}
                      onCheckedChange={(checked) => 
                        toggleLoginMutation.mutate({ 
                          id: account.id, 
                          loginEnabled: checked 
                        })
                      }
                      disabled={toggleLoginMutation.isPending}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {account.hasAccess ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedAccount(account);
                            setShowRevokeDialog(true);
                          }}
                        >
                          <ShieldX className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setSelectedAccount(account);
                            setShowGrantDialog(true);
                          }}
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAccount(account);
                          setShowResetDialog(true);
                        }}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Account Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create Employee Account
            </DialogTitle>
          </DialogHeader>
          <Form {...createAccountForm}>
            <form
              onSubmit={createAccountForm.handleSubmit((data) =>
                createAccountMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <FormField
                control={createAccountForm.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employeesWithoutAccounts.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.firstName} {emp.lastName} - {emp.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createAccountForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username (Email)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="email"
                        placeholder="employee@district.edu"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createAccountForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          {...field} 
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createAccountForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createAccountForm.control}
                name="tempPassword"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Temporary Password</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Employee must change password on first login
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createAccountMutation.isPending}
                >
                  {createAccountMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Grant Access Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Grant Access
            </DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Grant login access to {selectedAccount.firstName} {selectedAccount.lastName}
              </p>
              <Form {...grantAccessForm}>
                <form
                  onSubmit={grantAccessForm.handleSubmit((data) =>
                    grantAccessMutation.mutate({ id: selectedAccount.id, data })
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={grantAccessForm.control}
                    name="temporaryUntil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temporary Access Until (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={grantAccessForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Reason for granting access..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowGrantDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={grantAccessMutation.isPending}
                    >
                      {grantAccessMutation.isPending ? "Granting..." : "Grant Access"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Access Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldX className="h-5 w-5" />
              Revoke Access
            </DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Revoke login access for {selectedAccount.firstName} {selectedAccount.lastName}?
                This will immediately prevent them from logging in.
              </p>
              <div className="space-y-4">
                <Textarea 
                  placeholder="Reason for revoking access (optional)..."
                  onChange={(e) => setSelectedAccount({...selectedAccount, revokeNotes: e.target.value})}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowRevokeDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => 
                      revokeAccessMutation.mutate({ 
                        id: selectedAccount.id, 
                        notes: selectedAccount.revokeNotes 
                      })
                    }
                    disabled={revokeAccessMutation.isPending}
                  >
                    {revokeAccessMutation.isPending ? "Revoking..." : "Revoke Access"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Reset Password
            </DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Reset password for {selectedAccount.firstName} {selectedAccount.lastName}
              </p>
              <Form {...resetPasswordForm}>
                <form
                  onSubmit={resetPasswordForm.handleSubmit((data) =>
                    resetPasswordMutation.mutate({ id: selectedAccount.id, data })
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={resetPasswordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter new password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={resetPasswordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type={showPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={resetPasswordForm.control}
                    name="requirePasswordChange"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Require Password Change</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Employee must change password on next login
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowResetDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={resetPasswordMutation.isPending}
                    >
                      {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}