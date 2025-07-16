import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Database, 
  Mail, 
  HardDrive, 
  Shield,
  Server,
  Clock,
  MemoryStick,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DataRetentionInfo from "./DataRetentionInfo";
import StorageMonitor from "./StorageMonitor";

interface SystemHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  components: {
    database: ComponentStatus;
    email: ComponentStatus;
    storage: ComponentStatus;
    authentication: ComponentStatus;
  };
  metrics: {
    uptime: number;
    memoryUsage: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    errorRate: number;
  };
}

interface ComponentStatus {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  lastChecked: string;
  responseTime?: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy': return 'bg-green-100 text-green-800 border-green-200';
    case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy': return <CheckCircle className="h-4 w-4" />;
    case 'warning': return <AlertTriangle className="h-4 w-4" />;
    case 'critical': return <XCircle className="h-4 w-4" />;
    default: return <CheckCircle className="h-4 w-4" />;
  }
};

const formatBytes = (bytes: number) => {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
};

const formatUptime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export default function SystemHealthMonitor() {
  const { toast } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [testAlertType, setTestAlertType] = useState("database");
  const [testMessage, setTestMessage] = useState("");

  const { data: healthData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/system/health'],
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds if auto-refresh is enabled
  });

  const { data: metricsData } = useQuery({
    queryKey: ['/api/system/metrics'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const testAlertMutation = useMutation({
    mutationFn: async (data: { alertType: string; message: string }) => {
      await apiRequest('/api/system/test-alert', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Test Alert Sent",
        description: "The test alert has been sent successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Test Alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestAlert = () => {
    testAlertMutation.mutate({
      alertType: testAlertType,
      message: testMessage || `Test ${testAlertType} alert from system dashboard`
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading system health...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load system health data. Please check your permissions and try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const healthStatus = healthData as SystemHealthStatus;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">System Health Monitor</h3>
          <p className="text-sm text-gray-600">
            Monitor system components and configure error alerts
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-blue-50 border-blue-300' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="retention">Data Retention</TabsTrigger>
          <TabsTrigger value="storage">Storage & Archiving</TabsTrigger>
          <TabsTrigger value="testing">Alert Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Overall Health Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="h-5 w-5" />
                <span>Overall System Health</span>
                <Badge className={getStatusColor(healthStatus.overall)}>
                  {getStatusIcon(healthStatus.overall)}
                  <span className="ml-1 capitalize">{healthStatus.overall}</span>
                </Badge>
              </CardTitle>
              <CardDescription>
                Last checked: {new Date(healthStatus.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Uptime: {formatUptime(healthStatus.metrics.uptime)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Error Rate: {healthStatus.metrics.errorRate.toFixed(2)}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <MemoryStick className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Memory Used: {formatBytes(healthStatus.metrics.memoryUsage.heapUsed)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MemoryStick className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Memory Total: {formatBytes(healthStatus.metrics.memoryUsage.heapTotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Metrics */}
          {metricsData && (
            <Card>
              <CardHeader>
                <CardTitle>System Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{metricsData.nodeVersion}</div>
                    <div className="text-sm text-gray-600">Node.js Version</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 capitalize">{metricsData.environment}</div>
                    <div className="text-sm text-gray-600">Environment</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{formatUptime(metricsData.uptime)}</div>
                    <div className="text-sm text-gray-600">System Uptime</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Database Component */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Database</span>
                  <Badge className={getStatusColor(healthStatus.components.database.status)}>
                    {getStatusIcon(healthStatus.components.database.status)}
                    <span className="ml-1 capitalize">{healthStatus.components.database.status}</span>
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">{healthStatus.components.database.message}</p>
                <div className="text-xs text-gray-500">
                  <p>Last checked: {new Date(healthStatus.components.database.lastChecked).toLocaleString()}</p>
                  {healthStatus.components.database.responseTime && (
                    <p>Response time: {healthStatus.components.database.responseTime}ms</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Email Component */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Email Alerts</span>
                  <Badge className={getStatusColor(healthStatus.components.email.status)}>
                    {getStatusIcon(healthStatus.components.email.status)}
                    <span className="ml-1 capitalize">{healthStatus.components.email.status}</span>
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">{healthStatus.components.email.message}</p>
                <div className="text-xs text-gray-500">
                  <p>Last checked: {new Date(healthStatus.components.email.lastChecked).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Storage Component */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HardDrive className="h-5 w-5" />
                  <span>Storage</span>
                  <Badge className={getStatusColor(healthStatus.components.storage.status)}>
                    {getStatusIcon(healthStatus.components.storage.status)}
                    <span className="ml-1 capitalize">{healthStatus.components.storage.status}</span>
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">{healthStatus.components.storage.message}</p>
                <div className="text-xs text-gray-500">
                  <p>Last checked: {new Date(healthStatus.components.storage.lastChecked).toLocaleString()}</p>
                  {healthStatus.components.storage.responseTime && (
                    <p>Response time: {healthStatus.components.storage.responseTime}ms</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Authentication Component */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Authentication</span>
                  <Badge className={getStatusColor(healthStatus.components.authentication.status)}>
                    {getStatusIcon(healthStatus.components.authentication.status)}
                    <span className="ml-1 capitalize">{healthStatus.components.authentication.status}</span>
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">{healthStatus.components.authentication.message}</p>
                <div className="text-xs text-gray-500">
                  <p>Last checked: {new Date(healthStatus.components.authentication.lastChecked).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <DataRetentionInfo />
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <StorageMonitor />
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Error Alerts</CardTitle>
              <CardDescription>
                Send test alerts to verify your email configuration is working correctly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alertType">Alert Type</Label>
                  <Select value={testAlertType} onValueChange={setTestAlertType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select alert type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="database">Database Error</SelectItem>
                      <SelectItem value="authentication">Authentication Error</SelectItem>
                      <SelectItem value="payroll">Payroll Error</SelectItem>
                      <SelectItem value="system">System Error</SelectItem>
                      <SelectItem value="api">API Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testMessage">Custom Message (Optional)</Label>
                  <Input
                    id="testMessage"
                    placeholder="Enter custom error message"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={handleTestAlert} 
                disabled={testAlertMutation.isPending}
                className="w-full"
              >
                {testAlertMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending Test Alert...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Test Alert
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}