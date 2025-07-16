import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Archive, 
  CheckCircle,
  Clock,
  Settings,
  Play,
  Mail,
  Database,
  Calendar,
  Shield,
  AlertTriangle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function ArchivingSetupGuide() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<ArchiveConfig>({
    enabled: false,
    scheduleType: 'monthly',
    retentionPolicies: {
      terminatedEmployees: 7,
      payrollRecords: 7,
      leaveRequests: 5,
      timeCards: 3,
      activityLogs: 2,
      documents: 10
    },
    archiveLocation: 'database',
    notificationEmail: ''
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<ArchiveConfig>) => {
      return await apiRequest('/api/system/archive-config', 'POST', newConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system/archive-config'] });
      toast({ title: "Archive configuration saved", description: "Your automatic archiving settings have been updated." });
    },
    onError: (error) => {
      toast({ title: "Configuration failed", description: error.message, variant: "destructive" });
    },
  });

  const testArchivingMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/system/run-archiving', 'POST', {});
    },
    onSuccess: (data) => {
      toast({ 
        title: "Test archiving completed", 
        description: `Found ${data.totalRecordsArchived} records eligible for archiving` 
      });
    },
    onError: (error) => {
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    },
  });

  const handleConfigUpdate = (updates: Partial<ArchiveConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    updateConfigMutation.mutate(updates);
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const steps = [
    {
      title: "Enable Automatic Archiving",
      description: "Turn on automatic data cleanup to save storage costs",
      icon: <Archive className="h-5 w-5" />
    },
    {
      title: "Set Retention Policies",
      description: "Configure how long to keep different types of records",
      icon: <Calendar className="h-5 w-5" />
    },
    {
      title: "Configure Schedule & Actions",
      description: "Choose when to run archiving and what to do with old data",
      icon: <Clock className="h-5 w-5" />
    },
    {
      title: "Test & Activate",
      description: "Run a test and activate automatic archiving",
      icon: <CheckCircle className="h-5 w-5" />
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Automatic Archiving Setup</h3>
        <p className="text-sm text-gray-600">
          Set up automatic data archiving to reduce storage costs and maintain compliance
        </p>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Setup Progress</span>
              <span className="text-sm text-gray-600">{currentStep} of {steps.length}</span>
            </div>
            <Progress value={(currentStep / steps.length) * 100} className="h-2" />
            <div className="grid grid-cols-4 gap-2">
              {steps.map((step, index) => (
                <div key={index} className={`text-center p-2 rounded-lg ${
                  index + 1 <= currentStep ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'
                }`}>
                  <div className="flex justify-center mb-1">{step.icon}</div>
                  <div className="text-xs font-medium">{step.title}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {steps[currentStep - 1].icon}
            <span>{steps[currentStep - 1].title}</span>
          </CardTitle>
          <CardDescription>{steps[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Automatic archiving helps you stay within storage limits by cleaning up old data based on legal retention requirements.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Enable Automatic Archiving</Label>
                    <p className="text-sm text-gray-600">
                      This will automatically archive or delete old records based on your retention policies
                    </p>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(enabled) => handleConfigUpdate({ enabled })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Shield className="h-8 w-8 mx-auto text-green-600 mb-2" />
                    <div className="font-medium">Compliance</div>
                    <div className="text-sm text-gray-600">Meets legal requirements</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Database className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                    <div className="font-medium">Storage Savings</div>
                    <div className="text-sm text-gray-600">Reduces database size</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Clock className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                    <div className="font-medium">Automatic</div>
                    <div className="text-sm text-gray-600">Runs without intervention</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  These retention periods are based on legal requirements and industry best practices.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <Label className="text-base font-medium">Data Retention Policies (Years)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Terminated Employee Records</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={config.retentionPolicies.terminatedEmployees}
                        onChange={(e) => handleConfigUpdate({
                          retentionPolicies: {
                            ...config.retentionPolicies,
                            terminatedEmployees: parseInt(e.target.value) || 7
                          }
                        })}
                        className="w-20"
                      />
                      <Badge variant="outline">Legal: 7 years</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Payroll Records</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={config.retentionPolicies.payrollRecords}
                        onChange={(e) => handleConfigUpdate({
                          retentionPolicies: {
                            ...config.retentionPolicies,
                            payrollRecords: parseInt(e.target.value) || 7
                          }
                        })}
                        className="w-20"
                      />
                      <Badge variant="outline">IRS: 7 years</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Leave Requests</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={config.retentionPolicies.leaveRequests}
                        onChange={(e) => handleConfigUpdate({
                          retentionPolicies: {
                            ...config.retentionPolicies,
                            leaveRequests: parseInt(e.target.value) || 5
                          }
                        })}
                        className="w-20"
                      />
                      <Badge variant="outline">FMLA: 5 years</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Time Cards</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={config.retentionPolicies.timeCards}
                        onChange={(e) => handleConfigUpdate({
                          retentionPolicies: {
                            ...config.retentionPolicies,
                            timeCards: parseInt(e.target.value) || 3
                          }
                        })}
                        className="w-20"
                      />
                      <Badge variant="outline">DOL: 3 years</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Activity Logs</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={config.retentionPolicies.activityLogs}
                        onChange={(e) => handleConfigUpdate({
                          retentionPolicies: {
                            ...config.retentionPolicies,
                            activityLogs: parseInt(e.target.value) || 2
                          }
                        })}
                        className="w-20"
                      />
                      <Badge variant="outline">Audit: 2 years</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Documents</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={config.retentionPolicies.documents}
                        onChange={(e) => handleConfigUpdate({
                          retentionPolicies: {
                            ...config.retentionPolicies,
                            documents: parseInt(e.target.value) || 10
                          }
                        })}
                        className="w-20"
                      />
                      <Badge variant="outline">Varies: 10 years</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label className="text-base font-medium">Archive Schedule</Label>
                  <Select 
                    value={config.scheduleType} 
                    onValueChange={(scheduleType: any) => handleConfigUpdate({ scheduleType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Only</SelectItem>
                      <SelectItem value="daily">Daily (3 AM)</SelectItem>
                      <SelectItem value="weekly">Weekly (Sunday 3 AM)</SelectItem>
                      <SelectItem value="monthly">Monthly (1st of month, 3 AM)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600">
                    Monthly scheduling is recommended for most districts
                  </p>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">Archive Action</Label>
                  <Select 
                    value={config.archiveLocation} 
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
                  <p className="text-sm text-gray-600">
                    Archive tables preserve data while reducing active database size
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Notification Email</Label>
                <Input
                  type="email"
                  value={config.notificationEmail}
                  onChange={(e) => handleConfigUpdate({ notificationEmail: e.target.value })}
                  placeholder="admin@school.edu"
                />
                <p className="text-sm text-gray-600">
                  You'll receive reports after each archiving run
                </p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Ready to activate! Run a test first to see what would be archived.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Configuration Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge variant={config.enabled ? "default" : "secondary"}>
                          {config.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Schedule:</span>
                        <span className="capitalize">{config.scheduleType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Action:</span>
                        <span>{config.archiveLocation === 'database' ? 'Archive' : config.archiveLocation === 'delete' ? 'Delete' : 'Export'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Notifications:</span>
                        <span>{config.notificationEmail ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Test Archiving</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Run a test to see what records would be archived without actually moving them.
                      </p>
                      <Button 
                        onClick={() => testArchivingMutation.mutate()}
                        disabled={testArchivingMutation.isPending}
                        className="w-full"
                      >
                        {testArchivingMutation.isPending ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Run Test
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={handlePreviousStep}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            <div className="flex space-x-2">
              {currentStep < 4 ? (
                <Button onClick={handleNextStep}>
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    handleConfigUpdate({ enabled: true });
                    toast({ title: "Automatic archiving activated!", description: "Your system will now automatically archive old records." });
                  }}
                  disabled={!config.enabled}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate Archiving
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}