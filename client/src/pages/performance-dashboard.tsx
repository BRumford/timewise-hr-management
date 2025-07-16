import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  Server, 
  Database, 
  Cloud, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  BarChart3,
  Globe,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Timer,
  Users,
  RefreshCw,
  Settings,
  Download,
  Trash2,
  Scale,
  Shield,
  Gauge
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    responseTime: number;
    errorRate: number;
    activeUsers: number;
    requestsPerMinute: number;
  };
  components: {
    database: { healthy: boolean };
    loadBalancer: { status: string };
    cdn: { status: string };
    cache: { healthy: boolean };
  };
  alerts: Array<{
    id: string;
    type: 'warning' | 'critical';
    message: string;
    timestamp: Date;
    resolved: boolean;
  }>;
  uptime: string;
}

export default function PerformanceDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week'>('day');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch system status
  const { data: systemStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/performance/status'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch performance metrics
  const { data: metrics } = useQuery({
    queryKey: ['/api/performance/metrics', timeRange],
    queryFn: () => apiRequest(`/api/performance/metrics?timeRange=${timeRange}`, 'GET'),
    refetchInterval: autoRefresh ? 60000 : false,
  });

  // Fetch database health
  const { data: dbHealth } = useQuery({
    queryKey: ['/api/performance/database/health'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch cache stats
  const { data: cacheStats } = useQuery({
    queryKey: ['/api/performance/cache/stats'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch CDN analytics
  const { data: cdnAnalytics } = useQuery({
    queryKey: ['/api/performance/cdn/analytics'],
    refetchInterval: autoRefresh ? 60000 : false,
  });

  // Fetch auto-scaling status
  const { data: autoScalingStatus } = useQuery({
    queryKey: ['/api/performance/autoscaling/status'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Cache flush mutation
  const flushCacheMutation = useMutation({
    mutationFn: () => apiRequest('/api/performance/cache/flush', 'POST'),
    onSuccess: () => {
      toast({ title: 'Cache flushed successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/performance/cache/stats'] });
    },
    onError: () => {
      toast({ title: 'Failed to flush cache', variant: 'destructive' });
    },
  });

  // Manual scaling mutation
  const scalingMutation = useMutation({
    mutationFn: (data: { targetInstances: number; reason: string }) =>
      apiRequest('/api/performance/autoscaling/scale', 'POST', data),
    onSuccess: () => {
      toast({ title: 'Scaling operation completed' });
      queryClient.invalidateQueries({ queryKey: ['/api/performance/autoscaling/status'] });
    },
    onError: () => {
      toast({ title: 'Scaling operation failed', variant: 'destructive' });
    },
  });

  // Database maintenance mutation
  const maintenanceMutation = useMutation({
    mutationFn: () => apiRequest('/api/performance/database/maintenance', 'POST'),
    onSuccess: () => {
      toast({ title: 'Database maintenance completed' });
      queryClient.invalidateQueries({ queryKey: ['/api/performance/database/health'] });
    },
    onError: () => {
      toast({ title: 'Database maintenance failed', variant: 'destructive' });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy': return <XCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatMetricValue = (value: number, type: string) => {
    switch (type) {
      case 'percentage':
        return `${value?.toFixed(1)}%`;
      case 'time':
        return `${value?.toFixed(0)}ms`;
      case 'rate':
        return `${(value * 100)?.toFixed(2)}%`;
      default:
        return value?.toFixed(0) || '0';
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-gray-600">System performance monitoring and optimization</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="auto-refresh">Auto Refresh</Label>
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </div>
          <Select value={timeRange} onValueChange={(value: 'hour' | 'day' | 'week') => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">Last Hour</SelectItem>
              <SelectItem value="day">Last Day</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* System Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>System Status</span>
            <Badge variant={systemStatus?.overall === 'healthy' ? 'default' : 'destructive'}>
              {systemStatus?.overall || 'unknown'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Overall system health and uptime: {systemStatus?.uptime || 'unknown'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${getStatusColor(systemStatus?.components?.database?.healthy ? 'healthy' : 'unhealthy')}`}>
                <Database className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Database</p>
                <p className="text-xs text-gray-600">
                  {systemStatus?.components?.database?.healthy ? 'Healthy' : 'Degraded'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${getStatusColor(systemStatus?.components?.loadBalancer?.status || 'unknown')}`}>
                <Server className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Load Balancer</p>
                <p className="text-xs text-gray-600">
                  {systemStatus?.components?.loadBalancer?.status || 'Unknown'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${getStatusColor(systemStatus?.components?.cdn?.status || 'unknown')}`}>
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">CDN</p>
                <p className="text-xs text-gray-600">
                  {systemStatus?.components?.cdn?.status || 'Unknown'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${getStatusColor(systemStatus?.components?.cache?.healthy ? 'healthy' : 'unhealthy')}`}>
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Cache</p>
                <p className="text-xs text-gray-600">
                  {systemStatus?.components?.cache?.healthy ? 'Healthy' : 'Degraded'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <Cpu className="h-4 w-4" />
              <span>CPU Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMetricValue(systemStatus?.metrics?.cpuUsage || 0, 'percentage')}
            </div>
            <Progress value={systemStatus?.metrics?.cpuUsage || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <MemoryStick className="h-4 w-4" />
              <span>Memory Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMetricValue(systemStatus?.metrics?.memoryUsage || 0, 'percentage')}
            </div>
            <Progress value={systemStatus?.metrics?.memoryUsage || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <Timer className="h-4 w-4" />
              <span>Response Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMetricValue(systemStatus?.metrics?.responseTime || 0, 'time')}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Average response time
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Active Users</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStatus?.metrics?.activeUsers || 0}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {systemStatus?.metrics?.requestsPerMinute || 0} requests/min
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {systemStatus?.alerts && systemStatus.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Active Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {systemStatus.alerts.filter(alert => !alert.resolved).map(alert => (
                <Alert key={alert.id} variant={alert.type === 'critical' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-medium">{alert.type.toUpperCase()}</span>: {alert.message}
                    <span className="text-xs text-gray-600 ml-2">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="cdn">CDN</TabsTrigger>
          <TabsTrigger value="scaling">Auto-Scaling</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Request Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.requestVolume?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-gray-600">
                  Total requests in {timeRange}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatMetricValue(metrics?.errorRate || 0, 'rate')}
                </div>
                <div className="text-xs text-gray-600">
                  Error rate in {timeRange}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Database Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(dbHealth?.healthy ? 'healthy' : 'unhealthy')}
                  <span className={getStatusColor(dbHealth?.healthy ? 'healthy' : 'unhealthy')}>
                    {dbHealth?.healthy ? 'Healthy' : 'Degraded'}
                  </span>
                </div>
                <Button
                  className="mt-4"
                  onClick={() => maintenanceMutation.mutate()}
                  disabled={maintenanceMutation.isPending}
                >
                  {maintenanceMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Settings className="h-4 w-4 mr-2" />
                  )}
                  Run Maintenance
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Query Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Average Query Time</span>
                    <span>{formatMetricValue(metrics?.averageResponseTime || 0, 'time')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Slow Queries</span>
                    <span>{dbHealth?.queryStats?.totalSlowQueries || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cache Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Hit Rate</span>
                    <span>{formatMetricValue(cacheStats?.hitRate * 100 || 0, 'percentage')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Requests</span>
                    <span>{cacheStats?.totalRequests?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Hits</span>
                    <span>{cacheStats?.cacheHits?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Misses</span>
                    <span>{cacheStats?.cacheMisses?.toLocaleString() || '0'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cache Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Memory Usage</span>
                    <span>{formatMetricValue(cacheStats?.memoryUsage || 0, 'percentage')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Key Count</span>
                    <span>{cacheStats?.keyCount?.toLocaleString() || '0'}</span>
                  </div>
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => flushCacheMutation.mutate()}
                    disabled={flushCacheMutation.isPending}
                  >
                    {flushCacheMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Flush Cache
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cdn" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>CDN Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Hit Rate</span>
                    <span>{formatMetricValue(cdnAnalytics?.cacheHitRate * 100 || 0, 'percentage')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bandwidth Saved</span>
                    <span>{cdnAnalytics?.bandwidthSaved?.toFixed(1) || '0'} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Response Time</span>
                    <span>{formatMetricValue(cdnAnalytics?.avgResponseTime || 0, 'time')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cdnAnalytics?.topAssets?.map((asset, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="truncate">{asset.asset}</span>
                      <span>{asset.requests} requests</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scaling" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Auto-Scaling Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Status</span>
                    <Badge variant={autoScalingStatus?.enabled ? 'default' : 'secondary'}>
                      {autoScalingStatus?.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Instances</span>
                    <span>{autoScalingStatus?.currentInstances || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Action</span>
                    <span className="text-sm text-gray-600">
                      {autoScalingStatus?.lastScalingAction 
                        ? new Date(autoScalingStatus.lastScalingAction).toLocaleString()
                        : 'None'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Manual Scaling</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="target-instances">Target Instances</Label>
                    <Input
                      id="target-instances"
                      type="number"
                      min="1"
                      max="10"
                      defaultValue="2"
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      const input = document.getElementById('target-instances') as HTMLInputElement;
                      const targetInstances = parseInt(input.value);
                      if (targetInstances >= 1 && targetInstances <= 10) {
                        scalingMutation.mutate({
                          targetInstances,
                          reason: 'Manual scaling via dashboard'
                        });
                      }
                    }}
                    disabled={scalingMutation.isPending}
                  >
                    {scalingMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Scale className="h-4 w-4 mr-2" />
                    )}
                    Scale Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Reports</CardTitle>
              <CardDescription>
                Generate comprehensive performance reports for analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    System Health Report
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Performance Metrics
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Scaling History
                  </Button>
                </div>
                <Separator />
                <div className="text-sm text-gray-600">
                  <p>Reports include comprehensive system metrics, performance analytics, and optimization recommendations.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}