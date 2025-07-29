import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Database, 
  HardDrive, 
  Lock, 
  FileCheck, 
  RefreshCw, 
  Settings, 
  Download, 
  Eye, 
  PlayCircle,
  Calendar,
  Activity,
  TrendingUp,
  BarChart3,
  Clock,
  Users,
  FileText,
  AlertCircle,
  CheckSquare,
  Zap,
  Globe,
  Key
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ComplianceStandard {
  standard: string;
  compliance: number;
  status: 'compliant' | 'non_compliant' | 'partial';
  lastAudit: string;
}

interface ComplianceRule {
  id: string;
  standard: string;
  title: string;
  description: string;
  required: boolean;
  category: string;
  implementationStatus: 'compliant' | 'non_compliant' | 'partial';
  lastChecked: string;
  nextAuditDate: string;
  remediation?: string;
}

interface BackupStatus {
  enabled: boolean;
  lastBackup: string | null;
  totalBackups: number;
  totalSize: number;
  recentFailures: number;
}

interface EncryptionStatus {
  dataAtRest: {
    enabled: boolean;
    algorithm: string;
    encryptionCoverage: number;
  };
  dataInTransit: {
    enabled: boolean;
    protocol: string;
    sslScore: string;
  };
  backupEncryption: {
    enabled: boolean;
    encryptionCoverage: number;
  };
}

export default function ComplianceDashboard() {
  const { toast } = useToast();
  const [selectedStandard, setSelectedStandard] = useState<string>('FERPA');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Queries
  const { data: complianceSummary, isLoading: loadingSummary } = useQuery({
    queryKey: ['/api/compliance/reports/summary'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: standards, isLoading: loadingStandards } = useQuery({
    queryKey: ['/api/compliance/standards'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: standardDetail } = useQuery({
    queryKey: ['/api/compliance/standards', selectedStandard],
    enabled: !!selectedStandard,
  });

  const { data: backupStatus } = useQuery({
    queryKey: ['/api/compliance/backups/status'],
  });

  const { data: encryptionStatus } = useQuery({
    queryKey: ['/api/compliance/encryption/status'],
  });

  const { data: securityAuditStatus } = useQuery({
    queryKey: ['/api/compliance/security-audit/status'],
  });

  const { data: disasterRecoveryPlans } = useQuery({
    queryKey: ['/api/compliance/disaster-recovery/plans'],
  });

  // Mutations
  const runComplianceCheckMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/compliance/check', 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Compliance check completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createBackupMutation = useMutation({
    mutationFn: async (type: 'full' | 'incremental') => {
      return await apiRequest('/api/compliance/backups/create', 'POST', { type });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Backup created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/backups'] });
    },
  });

  const runSecurityAuditMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/compliance/security-audit/run', 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Security audit completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/security-audit'] });
    },
  });

  const getStatusColor = (status: string, value?: number) => {
    if (value !== undefined) {
      if (value >= 95) return 'text-green-600';
      if (value >= 80) return 'text-yellow-600';
      return 'text-red-600';
    }
    
    switch (status) {
      case 'compliant': return 'text-green-600';
      case 'partial': return 'text-yellow-600';
      case 'non_compliant': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string, value?: number) => {
    if (value !== undefined) {
      if (value >= 95) return <CheckCircle className="h-4 w-4" />;
      if (value >= 80) return <AlertTriangle className="h-4 w-4" />;
      return <XCircle className="h-4 w-4" />;
    }
    
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4" />;
      case 'partial': return <AlertTriangle className="h-4 w-4" />;
      case 'non_compliant': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loadingSummary) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor FERPA, HIPAA, SOX compliance and security posture
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button
            onClick={() => runComplianceCheckMutation.mutate()}
            disabled={runComplianceCheckMutation.isPending}
          >
            <Shield className="h-4 w-4 mr-2" />
            Run Compliance Check
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`flex items-center ${getStatusColor('', complianceSummary?.overallComplianceScore)}`}>
                {getStatusIcon('', complianceSummary?.overallComplianceScore)}
                <span className="text-2xl font-bold ml-2">
                  {complianceSummary?.overallComplianceScore?.toFixed(1)}%
                </span>
              </div>
            </div>
            <Progress 
              value={complianceSummary?.overallComplianceScore || 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-2xl font-bold">
                {complianceSummary?.criticalIssues || 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Immediate attention required
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Audits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">
                {complianceSummary?.upcomingAudits?.length || 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Next 90 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Data Encryption</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">
                {encryptionStatus?.dataAtRest?.encryptionCoverage?.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {encryptionStatus?.dataAtRest?.algorithm || 'AES-256'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="standards">Standards</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="encryption">Encryption</TabsTrigger>
          <TabsTrigger value="audits">Security Audits</TabsTrigger>
          <TabsTrigger value="recovery">Disaster Recovery</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Compliance Standards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Compliance Standards</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {complianceSummary?.standardsStatus && Object.entries(complianceSummary.standardsStatus).map(([standard, data]: [string, any]) => (
                  <div key={standard} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={getStatusColor('', data.compliance)}>
                        {getStatusIcon('', data.compliance)}
                      </div>
                      <span className="font-medium">{standard}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{data.compliance?.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">
                        Last audit: {new Date(data.lastAudit).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {complianceSummary?.recentActivity?.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2 p-2 rounded-lg bg-gray-50">
                      <div className={`h-2 w-2 rounded-full ${
                        activity.severity === 'critical' ? 'bg-red-500' :
                        activity.severity === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-muted-foreground">
                      No recent activity
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Standards Tab */}
        <TabsContent value="standards" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Standards List */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Standards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {['FERPA', 'HIPAA', 'SOX', 'GDPR', 'CCPA'].map((standard) => (
                  <Button
                    key={standard}
                    variant={selectedStandard === standard ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setSelectedStandard(standard)}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {standard}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Standard Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{selectedStandard} Compliance</CardTitle>
                <CardDescription>
                  Detailed compliance status and requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                {standardDetail ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Overall Compliance</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={standardDetail.overallCompliance} className="w-32" />
                        <span className="font-semibold">{standardDetail.overallCompliance?.toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Compliance Rules</h4>
                      {standardDetail.rules?.map((rule: ComplianceRule) => (
                        <div key={rule.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{rule.title}</span>
                            <Badge variant={
                              rule.implementationStatus === 'compliant' ? 'default' :
                              rule.implementationStatus === 'partial' ? 'secondary' : 'destructive'
                            }>
                              {rule.implementationStatus}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                          <div className="text-xs text-muted-foreground">
                            Last checked: {new Date(rule.lastChecked).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading compliance details...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Backup & Disaster Recovery</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {backupStatus?.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                  <div className="text-sm text-muted-foreground">Backup Status</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {backupStatus?.totalBackups || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Backups</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {backupStatus?.recentFailures || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Recent Failures</div>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <Button
                  onClick={() => createBackupMutation.mutate('full')}
                  disabled={createBackupMutation.isPending}
                >
                  <HardDrive className="h-4 w-4 mr-2" />
                  Create Full Backup
                </Button>
                <Button
                  variant="outline"
                  onClick={() => createBackupMutation.mutate('incremental')}
                  disabled={createBackupMutation.isPending}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Create Incremental Backup
                </Button>
              </div>

              {backupStatus?.lastBackup && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Last backup completed: {new Date(backupStatus.lastBackup).toLocaleString()}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Encryption Tab */}
        <TabsContent value="encryption" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Data at Rest</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-2">
                  <Lock className="h-4 w-4 text-green-600" />
                  <span className="font-semibold">
                    {encryptionStatus?.dataAtRest?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Algorithm: {encryptionStatus?.dataAtRest?.algorithm}
                </div>
                <Progress 
                  value={encryptionStatus?.dataAtRest?.encryptionCoverage || 0} 
                  className="mt-2" 
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {encryptionStatus?.dataAtRest?.encryptionCoverage?.toFixed(1)}% encrypted
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Data in Transit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-2">
                  <Globe className="h-4 w-4 text-green-600" />
                  <span className="font-semibold">
                    {encryptionStatus?.dataInTransit?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Protocol: {encryptionStatus?.dataInTransit?.protocol}
                </div>
                <Badge variant="default" className="mt-2">
                  SSL Score: {encryptionStatus?.dataInTransit?.sslScore}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Backup Encryption</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-2">
                  <Key className="h-4 w-4 text-green-600" />
                  <span className="font-semibold">
                    {encryptionStatus?.backupEncryption?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <Progress 
                  value={encryptionStatus?.backupEncryption?.encryptionCoverage || 0} 
                  className="mt-2" 
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {encryptionStatus?.backupEncryption?.encryptionCoverage}% encrypted
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Audits Tab */}
        <TabsContent value="audits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileCheck className="h-5 w-5" />
                <span>Regular Security Audits</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {securityAuditStatus?.overallRating || 'Good'}
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {securityAuditStatus?.criticalFindings || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {securityAuditStatus?.highFindings || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">High</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {securityAuditStatus?.complianceScore?.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Compliance Score</div>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <Button
                  onClick={() => runSecurityAuditMutation.mutate()}
                  disabled={runSecurityAuditMutation.isPending}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Run Security Audit
                </Button>
              </div>

              {securityAuditStatus?.lastAudit && (
                <Alert className="mb-4">
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Last audit: {new Date(securityAuditStatus.lastAudit).toLocaleString()}
                    <br />
                    Next audit: {new Date(securityAuditStatus.nextAudit).toLocaleString()}
                  </AlertDescription>
                </Alert>
              )}

              {securityAuditStatus?.recommendations && (
                <div>
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <div className="space-y-2">
                    {securityAuditStatus.recommendations.map((rec: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <span className="text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disaster Recovery Tab */}
        <TabsContent value="recovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Disaster Recovery Plans</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {disasterRecoveryPlans?.map((plan: any) => (
                  <div key={plan.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{plan.name}</h4>
                      <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                        {plan.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Priority:</span>
                        <Badge variant={plan.priority === 'high' ? 'destructive' : 'outline'} className="ml-1">
                          {plan.priority}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">RTO:</span>
                        <span className="ml-1">{plan.rto} min</span>
                      </div>
                      <div>
                        <span className="font-medium">RPO:</span>
                        <span className="ml-1">{plan.rpo} min</span>
                      </div>
                      <div>
                        <span className="font-medium">Last Tested:</span>
                        <span className="ml-1">{new Date(plan.lastTested).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <h5 className="font-medium text-sm mb-1">Procedures ({plan.procedures.length})</h5>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {plan.procedures.slice(0, 3).map((procedure: string, index: number) => (
                          <li key={index}>• {procedure}</li>
                        ))}
                        {plan.procedures.length > 3 && (
                          <li>• ... and {plan.procedures.length - 3} more steps</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    No disaster recovery plans configured
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}