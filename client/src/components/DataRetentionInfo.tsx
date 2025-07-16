import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Database, 
  HardDrive, 
  Users, 
  FileText, 
  Calendar, 
  Clock,
  Calculator,
  Shield,
  TrendingUp,
  Info,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

interface DataRetentionInfo {
  currentCapacity: {
    employees: number;
    payrollRecords: number;
    leaveRequests: number;
    timeCards: number;
    documents: number;
    activityLogs: number;
  };
  storageMetrics: {
    totalDatabaseSize: string;
    estimatedSizePerEmployee: string;
    projectedCapacity: {
      small: { employees: number; description: string };
      medium: { employees: number; description: string };
      large: { employees: number; description: string };
      enterprise: { employees: number; description: string };
    };
  };
  retentionPolicies: {
    employees: string;
    payrollRecords: string;
    leaveRequests: string;
    timeCards: string;
    documents: string;
    activityLogs: string;
    sessions: string;
  };
  databaseProvider: {
    provider: string;
    tier: string;
    storageLimit: string;
    connectionLimit: string;
    features: string[];
  };
}

interface StorageEstimate {
  estimatedSize: string;
  recommendedTier: string;
  monthlyRecords: number;
  yearlyGrowth: string;
}

interface RetentionPolicy {
  category: string;
  currentPolicy: string;
  recommendedPolicy: string;
  compliance: string;
  reason: string;
}

export default function DataRetentionInfo() {
  const [estimateEmployeeCount, setEstimateEmployeeCount] = useState(100);

  const { data: retentionData, isLoading, error } = useQuery({
    queryKey: ['/api/system/retention'],
  });

  const { data: policiesData } = useQuery({
    queryKey: ['/api/system/retention-policies'],
  });

  const estimateStorageMutation = useMutation({
    mutationFn: async (employeeCount: number) => {
      return await apiRequest('/api/system/estimate-storage', 'POST', { employeeCount });
    },
  });

  const handleEstimateStorage = () => {
    estimateStorageMutation.mutate(estimateEmployeeCount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6 animate-pulse" />
            <span>Loading data retention information...</span>
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
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load data retention information. Please check your permissions and try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const data = retentionData as DataRetentionInfo;
  const policies = policiesData as RetentionPolicy[];
  const storageEstimate = estimateStorageMutation.data as StorageEstimate;

  const getCapacityTier = (employees: number) => {
    if (employees <= 500) return { tier: 'Small', color: 'bg-green-100 text-green-800' };
    if (employees <= 2000) return { tier: 'Medium', color: 'bg-blue-100 text-blue-800' };
    if (employees <= 10000) return { tier: 'Large', color: 'bg-orange-100 text-orange-800' };
    return { tier: 'Enterprise', color: 'bg-purple-100 text-purple-800' };
  };

  const currentTier = getCapacityTier(data.currentCapacity.employees);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Data Retention & Storage Capacity</h3>
        <p className="text-sm text-gray-600">
          Current storage usage, retention policies, and capacity planning
        </p>
      </div>

      <Tabs defaultValue="current">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current">Current Usage</TabsTrigger>
          <TabsTrigger value="policies">Retention Policies</TabsTrigger>
          <TabsTrigger value="capacity">Capacity Planning</TabsTrigger>
          <TabsTrigger value="provider">Database Info</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {/* Current Storage Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HardDrive className="h-5 w-5" />
                <span>Current Storage Usage</span>
                <Badge className={currentTier.color}>
                  {currentTier.tier} District
                </Badge>
              </CardTitle>
              <CardDescription>
                Total database size: {data.storageMetrics.totalDatabaseSize}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Employees</span>
                  </div>
                  <div className="text-2xl font-bold">{data.currentCapacity.employees.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Active employee records</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Payroll Records</span>
                  </div>
                  <div className="text-2xl font-bold">{data.currentCapacity.payrollRecords.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Historical payroll entries</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Leave Requests</span>
                  </div>
                  <div className="text-2xl font-bold">{data.currentCapacity.leaveRequests.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Leave request history</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Time Cards</span>
                  </div>
                  <div className="text-2xl font-bold">{data.currentCapacity.timeCards.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Time tracking records</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Documents</span>
                  </div>
                  <div className="text-2xl font-bold">{data.currentCapacity.documents.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Stored documents</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Activity Logs</span>
                  </div>
                  <div className="text-2xl font-bold">{data.currentCapacity.activityLogs.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Audit trail entries</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Storage Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estimated Size per Employee</Label>
                  <div className="text-lg font-semibold">{data.storageMetrics.estimatedSizePerEmployee}</div>
                  <div className="text-sm text-gray-600">
                    Includes all related records (payroll, leave, time cards, documents)
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Current Utilization</Label>
                  <div className="text-lg font-semibold">{data.storageMetrics.totalDatabaseSize}</div>
                  <div className="text-sm text-gray-600">
                    Total database size including indexes and metadata
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Retention Policies</CardTitle>
              <CardDescription>
                Current retention policies and compliance requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.retentionPolicies).map(([key, policy]) => (
                  <div key={key} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                      <Badge variant="outline">{policy}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {policies && (
            <Card>
              <CardHeader>
                <CardTitle>Compliance Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {policies.map((policy, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{policy.category}</h4>
                        <Badge variant="outline">{policy.compliance}</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Current:</span> {policy.currentPolicy}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Recommended:</span> {policy.recommendedPolicy}
                        </div>
                        <div className="text-xs text-gray-600">{policy.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="capacity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>District Size Projections</CardTitle>
              <CardDescription>
                Estimated capacity for different district sizes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(data.storageMetrics.projectedCapacity).map(([key, capacity]) => (
                  <div key={key} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">{key} District</h4>
                      <Badge variant="outline">{capacity.employees.toLocaleString()} employees</Badge>
                    </div>
                    <div className="text-sm text-gray-600">{capacity.description}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storage Calculator</CardTitle>
              <CardDescription>
                Estimate storage requirements for your district size
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label htmlFor="employeeCount">Number of Employees</Label>
                  <Input
                    id="employeeCount"
                    type="number"
                    value={estimateEmployeeCount}
                    onChange={(e) => setEstimateEmployeeCount(parseInt(e.target.value) || 0)}
                    min="1"
                    max="100000"
                  />
                </div>
                <Button onClick={handleEstimateStorage} disabled={estimateStorageMutation.isPending}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate
                </Button>
              </div>

              {storageEstimate && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Estimated Storage</Label>
                      <div className="text-lg font-semibold">{storageEstimate.estimatedSize}</div>
                    </div>
                    <div>
                      <Label>Recommended Tier</Label>
                      <div className="text-lg font-semibold">{storageEstimate.recommendedTier}</div>
                    </div>
                    <div>
                      <Label>Monthly Records</Label>
                      <div className="text-lg font-semibold">{storageEstimate.monthlyRecords.toLocaleString()}</div>
                    </div>
                    <div>
                      <Label>Yearly Growth</Label>
                      <div className="text-lg font-semibold">{storageEstimate.yearlyGrowth}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="provider" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Provider Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Provider</Label>
                    <div className="text-lg font-semibold">{data.databaseProvider.provider}</div>
                  </div>
                  <div>
                    <Label>Tier</Label>
                    <div className="text-lg font-semibold">{data.databaseProvider.tier}</div>
                  </div>
                  <div>
                    <Label>Storage Limit</Label>
                    <div className="text-lg font-semibold">{data.databaseProvider.storageLimit}</div>
                  </div>
                  <div>
                    <Label>Connection Limit</Label>
                    <div className="text-lg font-semibold">{data.databaseProvider.connectionLimit}</div>
                  </div>
                </div>

                <div>
                  <Label>Features</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {data.databaseProvider.features.map((feature, index) => (
                      <Badge key={index} variant="secondary">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}