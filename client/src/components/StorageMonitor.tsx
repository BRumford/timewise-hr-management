import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  HardDrive, 
  Archive, 
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Settings,
  Play,
  RefreshCw,
  Database,
  FileText,
  Calendar,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ArchivingSetupGuide from "./ArchivingSetupGuide";

interface StorageUsage {
  totalSize: string;
  tableBreakdown: {
    tableName: string;
    rowCount: number;
    sizeEstimate: string;
    percentage: number;
  }[];
  growthTrends: {
    period: string;
    size: string;
    growth: string;
  }[];
  recommendations: {
    action: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
    priority: 'low' | 'medium' | 'high';
  }[];
}

interface ArchiveCandidate {
  category: string;
  recordCount: number;
  estimatedSize: string;
  retentionPolicy: string;
  archiveEligible: number;
  potentialSavings: string;
}

interface ArchiveConfig {
  enabled: boolean;
  scheduleType: 'manual' | 'daily' | 'weekly' | 'monthly';
  retentionPolicies: {
    terminatedEmployees: number;
    payrollRecords: number;
    leaveRequests: number;
    timeCards: number;
    activityLogs: number;
    documents: number;
  };
  archiveLocation: 'database' | 'external' | 'delete';
  notificationEmail: string;
}

interface StorageAlert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  action: string;
}

export default function StorageMonitor() {
  const { toast } = useToast();
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [archiveConfig, setArchiveConfig] = useState<ArchiveConfig | null>(null);

  const { data: storageData, isLoading: storageLoading } = useQuery({
    queryKey: ['/api/system/storage-usage'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: candidatesData, isLoading: candidatesLoading } = useQuery({
    queryKey: ['/api/system/archive-candidates'],
  });

  const { data: alertsData } = useQuery({
    queryKey: ['/api/system/storage-alerts'],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: configData } = useQuery({
    queryKey: ['/api/system/archive-config'],
    onSuccess: (data) => setArchiveConfig(data),
  });

  const { data: estimatesData } = useQuery({
    queryKey: ['/api/system/archive-estimates'],
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (config: Partial<ArchiveConfig>) => {
      return await apiRequest('/api/system/archive-config', 'POST', config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system/archive-config'] });
      toast({ title: "Configuration updated", description: "Archive settings have been saved." });
    },
    onError: (error) => {
      toast({ title: "Failed to update configuration", description: error.message, variant: "destructive" });
    },
  });

  const archiveRecordsMutation = useMutation({
    mutationFn: async ({ category, recordIds }: { category: string; recordIds: number[] }) => {
      return await apiRequest('/api/system/archive-records', 'POST', { category, recordIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system/archive-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system/storage-usage'] });
      setSelectedCandidates([]);
      toast({ title: "Records archived", description: "Selected records have been archived successfully." });
    },
    onError: (error) => {
      toast({ title: "Failed to archive records", description: error.message, variant: "destructive" });
    },
  });

  const runArchivingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/system/run-archiving', 'POST', {});
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/system/archive-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system/storage-usage'] });
      toast({ 
        title: "Archiving completed", 
        description: `Archived ${data.totalRecordsArchived} records, saved ${data.spaceSaved}` 
      });
    },
    onError: (error) => {
      toast({ title: "Failed to run archiving", description: error.message, variant: "destructive" });
    },
  });

  const storage = storageData as StorageUsage;
  const candidates = candidatesData as ArchiveCandidate[];
  const alerts = alertsData as StorageAlert[];
  const estimates = estimatesData as any[];

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'info': return <CheckCircle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const handleConfigUpdate = (updates: Partial<ArchiveConfig>) => {
    if (archiveConfig) {
      const updatedConfig = { ...archiveConfig, ...updates };
      setArchiveConfig(updatedConfig);
      updateConfigMutation.mutate(updates);
    }
  };

  const handleArchiveRecords = (category: string) => {
    // In a real implementation, this would collect the actual record IDs
    const mockRecordIds = [1, 2, 3, 4, 5]; // This would be replaced with actual record IDs
    archiveRecordsMutation.mutate({ category, recordIds: mockRecordIds });
  };

  if (storageLoading || candidatesLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading storage monitoring data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Storage Monitoring & Cost Management</h3>
        <p className="text-sm text-gray-600">
          Monitor database usage, archive old data, and optimize storage costs
        </p>
      </div>

      {/* Storage Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} className={getAlertColor(alert.level)}>
              {getAlertIcon(alert.level)}
              <AlertDescription>
                <strong>{alert.message}</strong> - {alert.action}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs defaultValue="usage">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="candidates">Archive Candidates</TabsTrigger>
          <TabsTrigger value="setup">Setup Guide</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="estimates">Savings</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          {/* Current Storage Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HardDrive className="h-5 w-5" />
                <span>Current Storage Usage</span>
              </CardTitle>
              <CardDescription>
                Total database size: {storage?.totalSize || 'Loading...'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {storage?.tableBreakdown.map((table, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Database className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">{table.tableName}</div>
                        <div className="text-sm text-gray-500">{table.rowCount.toLocaleString()} records</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">{table.sizeEstimate}</div>
                        <div className="text-sm text-gray-500">{table.percentage}%</div>
                      </div>
                      <div className="w-20">
                        <Progress value={table.percentage} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Growth Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Growth Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {storage?.growthTrends.map((trend, index) => (
                  <div key={index} className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{trend.size}</div>
                    <div className="text-sm text-gray-600">{trend.period}</div>
                    <div className="text-sm font-medium text-green-600">{trend.growth}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Optimization Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {storage?.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{rec.action}</div>
                      <div className="text-sm text-gray-600">{rec.impact}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                        {rec.priority}
                      </Badge>
                      <Badge variant="outline">{rec.effort} effort</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Archive className="h-5 w-5" />
                <span>Archive Candidates</span>
              </CardTitle>
              <CardDescription>
                Records eligible for archiving based on retention policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {candidates && candidates.length > 0 ? (
                <div className="space-y-4">
                  {candidates.map((candidate, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{candidate.category}</h4>
                        <Badge variant="outline">{candidate.potentialSavings} savings</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Records:</span> {candidate.recordCount.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Size:</span> {candidate.estimatedSize}
                        </div>
                        <div>
                          <span className="font-medium">Policy:</span> {candidate.retentionPolicy}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {candidate.archiveEligible} records eligible for archiving
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleArchiveRecords(candidate.category)}
                          disabled={archiveRecordsMutation.isPending}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive Now
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={() => runArchivingMutation.mutate()}
                      disabled={runArchivingMutation.isPending}
                      className="w-full"
                    >
                      {runArchivingMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Running Automatic Archiving...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Run Automatic Archiving
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Archive className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No records currently eligible for archiving</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          <ArchivingSetupGuide />
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Archive Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {archiveConfig && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Automatic Archiving</Label>
                      <p className="text-sm text-gray-600">Automatically archive old records based on retention policies</p>
                    </div>
                    <Switch
                      checked={archiveConfig.enabled}
                      onCheckedChange={(enabled) => handleConfigUpdate({ enabled })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Archive Schedule</Label>
                    <Select 
                      value={archiveConfig.scheduleType} 
                      onValueChange={(scheduleType: any) => handleConfigUpdate({ scheduleType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual Only</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Archive Action</Label>
                    <Select 
                      value={archiveConfig.archiveLocation} 
                      onValueChange={(archiveLocation: any) => handleConfigUpdate({ archiveLocation })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="database">Move to Archive Tables</SelectItem>
                        <SelectItem value="external">Export to External Storage</SelectItem>
                        <SelectItem value="delete">Delete Permanently</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label>Retention Policies (Years)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(archiveConfig.retentionPolicies).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <Label className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                          <Input
                            type="number"
                            min="1"
                            max="50"
                            value={value}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value) || 1;
                              handleConfigUpdate({
                                retentionPolicies: {
                                  ...archiveConfig.retentionPolicies,
                                  [key]: newValue
                                }
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notification Email</Label>
                    <Input
                      type="email"
                      value={archiveConfig.notificationEmail}
                      onChange={(e) => handleConfigUpdate({ notificationEmail: e.target.value })}
                      placeholder="admin@school.edu"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estimates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Potential Storage Savings</CardTitle>
              <CardDescription>
                Estimated space savings from archiving eligible records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {estimates && estimates.length > 0 ? (
                <div className="space-y-4">
                  {estimates.map((estimate, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{estimate.category}</h4>
                        <Badge variant="secondary">{estimate.estimatedSavings}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Records:</span> {estimate.recordCount.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Savings:</span> {estimate.estimatedSavings}
                        </div>
                        <div>
                          <span className="font-medium">Timeframe:</span> {estimate.timeframe}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {estimates.reduce((sum, est) => sum + parseFloat(est.estimatedSavings), 0).toFixed(1)} MB
                      </div>
                      <div className="text-sm text-green-700">Total Potential Savings</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No archiving estimates available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}