import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Users, 
  Lock, 
  Key,
  FileText,
  Eye,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Download
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: number;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  success: boolean;
  errorMessage?: string;
}

interface SecurityDashboard {
  totalActionsToday: number;
  totalActionsThisWeek: number;
  failedLoginsToday: number;
  criticalEventsThisWeek: number;
  topUsers: Array<{user: string, actions: number}>;
  topActions: Array<{action: string, count: number}>;
  securityTrends: Array<{date: string, events: number, critical: number}>;
}

interface SecuritySettings {
  mfaRequired: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  accountLockoutTime: number;
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
  auditLogRetention: number;
  fileEncryption: boolean;
  ipWhitelist: string;
  dataRetentionPolicy: {
    employeeRecords: number;
    payrollRecords: number;
    auditLogs: number;
    securityEvents: number;
  };
}

export default function SecurityMonitoring() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [auditFilters, setAuditFilters] = useState({
    userId: '',
    action: '',
    resource: '',
    severity: ''
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch security dashboard data
  const { data: dashboard, isLoading: dashboardLoading } = useQuery<SecurityDashboard>({
    queryKey: ['/api/security/dashboard'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch audit logs
  const { data: auditLogs, isLoading: auditLoading } = useQuery<AuditLog[]>({
    queryKey: ['/api/security/audit-logs', auditFilters],
    enabled: true,
  });

  // Fetch security settings
  const { data: securitySettings, isLoading: settingsLoading } = useQuery<SecuritySettings>({
    queryKey: ['/api/security/settings'],
  });

  // Fetch encryption status
  const { data: encryptionStatus } = useQuery({
    queryKey: ['/api/security/encryption-status'],
  });

  // Update security settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<SecuritySettings>) => {
      const response = await fetch('/api/security/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Security settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/security/settings'] });
      setSettingsOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update security settings",
        variant: "destructive",
      });
    },
  });

  // Generate audit report mutation
  const generateReportMutation = useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      const response = await fetch('/api/security/audit-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });
      if (!response.ok) throw new Error('Failed to generate report');
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Security report generated and downloaded",
      });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN': return <Users className="h-4 w-4" />;
      case 'LOGOUT': return <Lock className="h-4 w-4" />;
      case 'CREATE': return <FileText className="h-4 w-4" />;
      case 'UPDATE': return <Settings className="h-4 w-4" />;
      case 'DELETE': return <XCircle className="h-4 w-4" />;
      case 'VIEW': return <Eye className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (dashboardLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Security Monitoring
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor system security, audit logs, and access controls
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => generateReportMutation.mutate({
              startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              endDate: new Date().toISOString()
            })}
            disabled={generateReportMutation.isPending}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Security Settings</DialogTitle>
              </DialogHeader>
              <SecuritySettingsForm 
                settings={securitySettings!} 
                onSave={(settings) => updateSettingsMutation.mutate(settings)}
                isLoading={updateSettingsMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="encryption">Encryption</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <SecurityDashboardView dashboard={dashboard!} />
        </TabsContent>

        <TabsContent value="audit-logs" className="space-y-6">
          <AuditLogsView 
            logs={auditLogs || []}
            isLoading={auditLoading}
            filters={auditFilters}
            onFiltersChange={setAuditFilters}
          />
        </TabsContent>

        <TabsContent value="encryption" className="space-y-6">
          <EncryptionStatusView status={encryptionStatus} />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <ComplianceView settings={securitySettings!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SecurityDashboardView({ dashboard }: { dashboard: SecurityDashboard }) {
  return (
    <div className="grid gap-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actions Today</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalActionsToday}</div>
            <p className="text-xs text-gray-500">System activities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Weekly Actions</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalActionsThisWeek}</div>
            <p className="text-xs text-gray-500">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.failedLoginsToday}</div>
            <p className="text-xs text-gray-500">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.criticalEventsThisWeek}</div>
            <p className="text-xs text-gray-500">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Users</CardTitle>
            <CardDescription>Most active users this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.topUsers.map((user, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{user.user}</span>
                  <Badge variant="outline">{user.actions} actions</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Actions</CardTitle>
            <CardDescription>Most frequent actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.topActions.map((action, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getActionIcon(action.action)}
                    <span className="text-sm font-medium">{action.action}</span>
                  </div>
                  <Badge variant="outline">{action.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AuditLogsView({ 
  logs, 
  isLoading, 
  filters, 
  onFiltersChange 
}: { 
  logs: AuditLog[];
  isLoading: boolean;
  filters: any;
  onFiltersChange: (filters: any) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Filter by user..."
                value={filters.userId}
                onChange={(e) => onFiltersChange({ ...filters, userId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="action">Action</Label>
              <Select value={filters.action} onValueChange={(value) => onFiltersChange({ ...filters, action: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="LOGOUT">Logout</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="VIEW">View</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="resource">Resource</Label>
              <Input
                id="resource"
                placeholder="Filter by resource..."
                value={filters.resource}
                onChange={(e) => onFiltersChange({ ...filters, resource: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="severity">Severity</Label>
              <Select value={filters.severity} onValueChange={(value) => onFiltersChange({ ...filters, severity: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All severities</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>System activity and security events</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getActionIcon(log.action)}
                    <div>
                      <p className="font-medium">{log.action} - {log.resource}</p>
                      <p className="text-sm text-gray-500">
                        {log.userId} • {log.ipAddress} • {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(log.severity)}>
                      {log.severity}
                    </Badge>
                    {log.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EncryptionStatusView({ status }: { status: any }) {
  if (!status) return null;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Encryption Status
          </CardTitle>
          <CardDescription>
            Current encryption status for all data types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(status).map(([key, value]) => {
              if (key === 'lastKeyRotation' || key === 'nextKeyRotation') return null;
              return (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <Badge variant={value === 'ENCRYPTED' ? 'default' : 'destructive'}>
                    {value as string}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Rotation Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Last Key Rotation</span>
              <span className="text-sm text-gray-500">
                {format(new Date(status.lastKeyRotation), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Next Key Rotation</span>
              <span className="text-sm text-gray-500">
                {format(new Date(status.nextKeyRotation), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComplianceView({ settings }: { settings: SecuritySettings }) {
  const complianceChecks = [
    { 
      name: 'Password Policy', 
      status: settings.passwordMinLength >= 8 && settings.passwordRequireSpecialChars,
      description: 'Minimum 8 characters with special characters required'
    },
    { 
      name: 'Session Security', 
      status: settings.sessionTimeout <= 8 * 60 * 60 * 1000,
      description: 'Session timeout set to 8 hours or less'
    },
    { 
      name: 'Account Lockout', 
      status: settings.maxLoginAttempts <= 5 && settings.accountLockoutTime >= 15 * 60 * 1000,
      description: 'Account lockout after 5 attempts for at least 15 minutes'
    },
    { 
      name: 'Audit Log Retention', 
      status: settings.auditLogRetention >= 2555,
      description: 'Audit logs retained for at least 7 years'
    },
    { 
      name: 'File Encryption', 
      status: settings.fileEncryption,
      description: 'All file uploads are encrypted'
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compliance Overview</CardTitle>
          <CardDescription>
            Security compliance status for regulatory requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {complianceChecks.map((check, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{check.name}</p>
                  <p className="text-sm text-gray-500">{check.description}</p>
                </div>
                <Badge variant={check.status ? 'default' : 'destructive'}>
                  {check.status ? 'Compliant' : 'Non-compliant'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Retention Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(settings.dataRetentionPolicy).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="text-sm text-gray-500">{value} days</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SecuritySettingsForm({ 
  settings, 
  onSave, 
  isLoading 
}: { 
  settings: SecuritySettings;
  onSave: (settings: Partial<SecuritySettings>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
          <Input
            id="sessionTimeout"
            type="number"
            value={formData.sessionTimeout / (60 * 60 * 1000)}
            onChange={(e) => setFormData({
              ...formData,
              sessionTimeout: parseInt(e.target.value) * 60 * 60 * 1000
            })}
          />
        </div>
        <div>
          <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
          <Input
            id="maxLoginAttempts"
            type="number"
            value={formData.maxLoginAttempts}
            onChange={(e) => setFormData({
              ...formData,
              maxLoginAttempts: parseInt(e.target.value)
            })}
          />
        </div>
        <div>
          <Label htmlFor="passwordMinLength">Password Min Length</Label>
          <Input
            id="passwordMinLength"
            type="number"
            value={formData.passwordMinLength}
            onChange={(e) => setFormData({
              ...formData,
              passwordMinLength: parseInt(e.target.value)
            })}
          />
        </div>
        <div>
          <Label htmlFor="auditLogRetention">Audit Log Retention (days)</Label>
          <Input
            id="auditLogRetention"
            type="number"
            value={formData.auditLogRetention}
            onChange={(e) => setFormData({
              ...formData,
              auditLogRetention: parseInt(e.target.value)
            })}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="mfaRequired"
          checked={formData.mfaRequired}
          onChange={(e) => setFormData({
            ...formData,
            mfaRequired: e.target.checked
          })}
        />
        <Label htmlFor="mfaRequired">Require Multi-Factor Authentication</Label>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="passwordRequireSpecialChars"
          checked={formData.passwordRequireSpecialChars}
          onChange={(e) => setFormData({
            ...formData,
            passwordRequireSpecialChars: e.target.checked
          })}
        />
        <Label htmlFor="passwordRequireSpecialChars">Require Special Characters in Passwords</Label>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="fileEncryption"
          checked={formData.fileEncryption}
          onChange={(e) => setFormData({
            ...formData,
            fileEncryption: e.target.checked
          })}
        />
        <Label htmlFor="fileEncryption">Enable File Encryption</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}

function getActionIcon(action: string) {
  switch (action) {
    case 'LOGIN': return <Users className="h-4 w-4" />;
    case 'LOGOUT': return <Lock className="h-4 w-4" />;
    case 'CREATE': return <FileText className="h-4 w-4" />;
    case 'UPDATE': return <Settings className="h-4 w-4" />;
    case 'DELETE': return <XCircle className="h-4 w-4" />;
    case 'VIEW': return <Eye className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
}