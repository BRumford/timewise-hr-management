import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Users, 
  Activity,
  Lock,
  Key,
  Eye,
  Bell,
  Database,
  Mail,
  Settings,
  TrendingUp,
  FileText,
  Download
} from "lucide-react";

interface SecurityDashboard {
  totalEvents: number;
  totalAlerts: number;
  unresolvedAlerts: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  recentEvents: any[];
  recentAlerts: any[];
}

interface SecurityAuditResult {
  timestamp: string;
  findings: any[];
  recommendations: string[];
  score: number;
}

interface ComplianceReport {
  framework: string;
  period: { startDate: string; endDate: string };
  totalAccess: number;
  accessDenied: number;
  criticalEvents: number;
  highSeverityEvents: number;
  complianceScore: number;
}

export default function SecurityMonitoring() {
  const { toast } = useToast();
  const [selectedTimeRange, setSelectedTimeRange] = useState("30");
  const [selectedFramework, setSelectedFramework] = useState("FERPA");
  const [securitySettings, setSecuritySettings] = useState({
    mfaRequired: false,
    passwordExpiration: 90,
    sessionTimeout: 30,
    autoLockout: true,
    emailAlerts: true,
    auditLogging: true
  });

  // Fetch security dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['/api/security/dashboard', selectedTimeRange],
  });

  // Fetch security audit results
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['/api/security/audit'],
  });

  // Fetch compliance report
  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ['/api/security/compliance', selectedFramework],
  });

  // Fetch security settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/security/settings'],
  });

  // Update local state when settings data is loaded
  useEffect(() => {
    if (settingsData) {
      setSecuritySettings(settingsData);
    }
  }, [settingsData]);

  // Save security settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: typeof securitySettings) => {
      return await apiRequest('/api/security/settings', 'PUT', settings);
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Security settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving settings",
        description: "Failed to save security settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(securitySettings);
  };

  // Use real data from API or fallback to mock data
  const currentDashboard = dashboardData || {
    totalEvents: 1247,
    totalAlerts: 23,
    unresolvedAlerts: 5,
    eventsByType: {
      failed_login: 156,
      suspicious_activity: 42,
      unauthorized_access: 18,
      data_breach_attempt: 3
    },
    eventsBySeverity: {
      low: 890,
      medium: 267,
      high: 78,
      critical: 12
    },
    recentEvents: [
      { id: 1, type: "failed_login", severity: "medium", description: "Multiple failed login attempts", timestamp: "2025-01-16T19:30:00Z" },
      { id: 2, type: "suspicious_activity", severity: "high", description: "Unusual data access pattern", timestamp: "2025-01-16T18:45:00Z" },
      { id: 3, type: "unauthorized_access", severity: "high", description: "Access attempt from blocked IP", timestamp: "2025-01-16T17:20:00Z" }
    ],
    recentAlerts: [
      { id: 1, type: "critical", message: "Critical security event detected", isResolved: false, createdAt: "2025-01-16T19:30:00Z" },
      { id: 2, type: "high", message: "Account lockout threshold exceeded", isResolved: true, createdAt: "2025-01-16T18:45:00Z" }
    ]
  };

  const currentAudit = auditData || {
    timestamp: "2025-01-16T20:00:00Z",
    findings: [
      { type: "weak_passwords", severity: "medium", count: 12, description: "Users with weak passwords" },
      { type: "inactive_users", severity: "low", count: 8, description: "Inactive users with active sessions" },
      { type: "unresolved_alerts", severity: "high", count: 5, description: "Unresolved security alerts" }
    ],
    recommendations: [
      "Enforce stronger password policies",
      "Implement automatic session cleanup",
      "Review and resolve pending security alerts"
    ],
    score: 78
  };

  const currentCompliance = complianceData || {
    framework: "FERPA",
    period: { startDate: "2024-12-16", endDate: "2025-01-16" },
    totalAccess: 2847,
    accessDenied: 23,
    criticalEvents: 2,
    highSeverityEvents: 15,
    complianceScore: 94
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Monitoring</h1>
          <p className="text-gray-600">Monitor system security, compliance, and audit trails</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="audit">Security Audit</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Security Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentDashboard.totalEvents}</div>
                <p className="text-xs text-muted-foreground">Last {selectedTimeRange} days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentDashboard.totalAlerts}</div>
                <p className="text-xs text-muted-foreground">
                  {currentDashboard.unresolvedAlerts} unresolved
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentDashboard.eventsBySeverity.critical}</div>
                <p className="text-xs text-muted-foreground">Requires immediate attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Score</CardTitle>
                <Shield className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentAudit.score}%</div>
                <Progress value={currentAudit.score} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Event Types Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Security Events by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(currentDashboard.eventsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor('medium')}`} />
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Events and Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Security Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentDashboard.recentEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant={getSeverityBadgeVariant(event.severity)}>
                          {event.severity}
                        </Badge>
                        <div>
                          <p className="font-medium">{event.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentDashboard.recentAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        {alert.isResolved ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {!alert.isResolved && (
                        <Button size="sm" variant="outline">
                          Resolve
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Audit Results</CardTitle>
              <CardDescription>
                Latest security audit performed on {new Date(currentAudit.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Overall Security Score</h3>
                    <p className="text-muted-foreground">Based on current security posture</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{currentAudit.score}%</div>
                    <Progress value={currentAudit.score} className="w-32 mt-2" />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Security Findings</h4>
                  <div className="space-y-3">
                    {currentAudit.findings.map((finding, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant={getSeverityBadgeVariant(finding.severity)}>
                            {finding.severity}
                          </Badge>
                          <div>
                            <p className="font-medium">{finding.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {finding.count} instances found
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Recommendations</h4>
                  <div className="space-y-2">
                    {currentAudit.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Monitoring</CardTitle>
              <CardDescription>
                Track compliance with regulatory frameworks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label htmlFor="framework">Framework</Label>
                  <Select value={selectedFramework} onValueChange={setSelectedFramework}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select framework" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FERPA">FERPA</SelectItem>
                      <SelectItem value="HIPAA">HIPAA</SelectItem>
                      <SelectItem value="SOX">SOX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Access</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{currentCompliance.totalAccess}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{currentCompliance.accessDenied}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Critical Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{currentCompliance.criticalEvents}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Compliance Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{currentCompliance.complianceScore}%</div>
                    </CardContent>
                  </Card>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    {selectedFramework} compliance is at {currentCompliance.complianceScore}%. 
                    {currentCompliance.complianceScore >= 90 ? " Your system meets compliance requirements." : " Review critical events to improve compliance."}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security policies and monitoring settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="mfa">Multi-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Require MFA for all admin accounts</p>
                  </div>
                  <Switch 
                    id="mfa"
                    checked={securitySettings.mfaRequired}
                    onCheckedChange={(checked) => 
                      setSecuritySettings(prev => ({ ...prev, mfaRequired: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autolock">Auto Account Lockout</Label>
                    <p className="text-sm text-muted-foreground">Lock accounts after failed login attempts</p>
                  </div>
                  <Switch 
                    id="autolock"
                    checked={securitySettings.autoLockout}
                    onCheckedChange={(checked) => 
                      setSecuritySettings(prev => ({ ...prev, autoLockout: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-alerts">Email Alerts</Label>
                    <p className="text-sm text-muted-foreground">Send email notifications for security events</p>
                  </div>
                  <Switch 
                    id="email-alerts"
                    checked={securitySettings.emailAlerts}
                    onCheckedChange={(checked) => 
                      setSecuritySettings(prev => ({ ...prev, emailAlerts: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="audit-logging">Audit Logging</Label>
                    <p className="text-sm text-muted-foreground">Enable comprehensive audit logging</p>
                  </div>
                  <Switch 
                    id="audit-logging"
                    checked={securitySettings.auditLogging}
                    onCheckedChange={(checked) => 
                      setSecuritySettings(prev => ({ ...prev, auditLogging: checked }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password-expiry">Password Expiration (days)</Label>
                    <Input 
                      id="password-expiry"
                      type="number"
                      value={securitySettings.passwordExpiration}
                      onChange={(e) => 
                        setSecuritySettings(prev => ({ ...prev, passwordExpiration: parseInt(e.target.value) || 90 }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                    <Input 
                      id="session-timeout"
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => 
                        setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 30 }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveSettings}
                    disabled={saveSettingsMutation.isPending}
                  >
                    {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}