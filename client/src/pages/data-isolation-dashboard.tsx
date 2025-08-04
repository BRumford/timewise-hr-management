import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, CheckCircle, Shield, Users, Database, Server } from "lucide-react";

interface DistrictValidation {
  districtId: number;
  districtName: string;
  validation: {
    isIsolated: boolean;
    violations: Array<{
      table: string;
      issue: string;
      affectedRecords: number;
    }>;
    summary: string;
  };
}

interface ValidationResults {
  overallStatus: {
    totalDistricts: number;
    fullyIsolated: number;
    withViolations: number;
    totalViolations: number;
  };
  results: DistrictValidation[];
}

export default function DataIsolationDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [newDistrictData, setNewDistrictData] = useState({
    name: '',
    slug: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    subscriptionTier: 'basic'
  });

  // Query all district validation results
  const { data: validationResults, isLoading: validationLoading, refetch: refetchValidation } = useQuery<ValidationResults>({
    queryKey: ['/api/data-isolation/validate-all'],
    retry: false,
  });

  // Query specific district status
  const { data: districtStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/data-isolation/status', selectedDistrictId],
    enabled: !!selectedDistrictId,
    retry: false,
  });

  // Mutation for district cleanup
  const cleanupMutation = useMutation({
    mutationFn: async ({ districtId, options }: { districtId: number; options: any }) => {
      const response = await fetch(`/api/data-isolation/cleanup/${districtId}`, {
        method: 'POST',
        body: JSON.stringify(options),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Cleanup failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cleanup Complete",
        description: "District data cleanup completed successfully",
      });
      refetchValidation();
      queryClient.invalidateQueries({ queryKey: ['/api/data-isolation/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to clean up district data",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating new district
  const createDistrictMutation = useMutation({
    mutationFn: async (districtData: typeof newDistrictData) => {
      const response = await fetch('/api/data-isolation/setup-district', {
        method: 'POST',
        body: JSON.stringify(districtData),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('District creation failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "District Created",
        description: "New district created with proper data isolation",
      });
      setNewDistrictData({
        name: '',
        slug: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        subscriptionTier: 'basic'
      });
      refetchValidation();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create new district",
        variant: "destructive",
      });
    },
  });

  const handleCleanup = (districtId: number, dryRun: boolean = true) => {
    cleanupMutation.mutate({
      districtId,
      options: {
        removeOrphanedRecords: true,
        fixUserAssignments: true,
        dryRun
      }
    });
  };

  const handleCreateDistrict = () => {
    if (!newDistrictData.name || !newDistrictData.slug || !newDistrictData.contactEmail) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createDistrictMutation.mutate(newDistrictData);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Isolation Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Ensure complete data separation between school districts
          </p>
        </div>
        <Button 
          onClick={() => refetchValidation()} 
          disabled={validationLoading}
          variant="outline"
        >
          {validationLoading ? "Validating..." : "Refresh Validation"}
        </Button>
      </div>

      {/* Overall Status Card */}
      {validationResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System-Wide Data Isolation Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {validationResults.overallStatus.totalDistricts}
                </div>
                <div className="text-sm text-gray-600">Total Districts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {validationResults.overallStatus.fullyIsolated}
                </div>
                <div className="text-sm text-gray-600">Fully Isolated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {validationResults.overallStatus.withViolations}
                </div>
                <div className="text-sm text-gray-600">With Violations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {validationResults.overallStatus.totalViolations}
                </div>
                <div className="text-sm text-gray-600">Total Violations</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="validation" className="space-y-6">
        <TabsList>
          <TabsTrigger value="validation">District Validation</TabsTrigger>
          <TabsTrigger value="setup">Setup New District</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="validation" className="space-y-4">
          {validationLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Database className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Validating district data isolation...</p>
                </div>
              </CardContent>
            </Card>
          ) : validationResults?.results?.length ? (
            <div className="grid gap-4">
              {validationResults.results.map((result) => (
                <Card key={result.districtId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {result.validation.isIsolated ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                          )}
                          {result.districtName}
                        </CardTitle>
                        <CardDescription>District ID: {result.districtId}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={result.validation.isIsolated ? "default" : "destructive"}
                        >
                          {result.validation.isIsolated ? "Isolated" : "Has Violations"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDistrictId(result.districtId)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-4">{result.validation.summary}</p>
                    
                    {result.validation.violations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-red-700">Data Isolation Violations:</h4>
                        {result.validation.violations.map((violation, index) => (
                          <Alert key={index} variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>{violation.table}:</strong> {violation.issue}
                              {violation.affectedRecords > 0 && (
                                <span className="ml-2 font-semibold">
                                  ({violation.affectedRecords} records)
                                </span>
                              )}
                            </AlertDescription>
                          </Alert>
                        ))}
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCleanup(result.districtId, true)}
                            disabled={cleanupMutation.isPending}
                          >
                            Dry Run Cleanup
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCleanup(result.districtId, false)}
                            disabled={cleanupMutation.isPending}
                          >
                            Execute Cleanup
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No districts found or validation pending</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New District with Data Isolation</CardTitle>
              <CardDescription>
                Set up a new school district with guaranteed data separation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">District Name *</Label>
                  <Input
                    id="name"
                    value={newDistrictData.name}
                    onChange={(e) => setNewDistrictData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Springfield School District"
                  />
                </div>
                <div>
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    value={newDistrictData.slug}
                    onChange={(e) => setNewDistrictData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g., springfield-sd"
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Contact Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={newDistrictData.contactEmail}
                    onChange={(e) => setNewDistrictData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="admin@springfieldsd.edu"
                  />
                </div>
                <div>
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={newDistrictData.contactPhone}
                    onChange={(e) => setNewDistrictData(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={newDistrictData.address}
                    onChange={(e) => setNewDistrictData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Education Ave, Springfield, ST 12345"
                  />
                </div>
                <div>
                  <Label htmlFor="subscriptionTier">Subscription Tier</Label>
                  <Select 
                    value={newDistrictData.subscriptionTier} 
                    onValueChange={(value) => setNewDistrictData(prev => ({ ...prev, subscriptionTier: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  This will create a new district with complete data isolation, default settings, 
                  and proper multi-tenant configuration. The district will start with a 30-day trial period.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleCreateDistrict}
                disabled={createDistrictMutation.isPending}
                className="w-full"
              >
                {createDistrictMutation.isPending ? "Creating District..." : "Create Isolated District"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          {selectedDistrictId && districtStatus && (
            <Card>
              <CardHeader>
                <CardTitle>District {selectedDistrictId} - Detailed Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{(districtStatus as any)?.status?.dataStats?.employees || 0}</div>
                    <div className="text-sm text-gray-600">Employees</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{(districtStatus as any)?.status?.dataStats?.users || 0}</div>
                    <div className="text-sm text-gray-600">Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{(districtStatus as any)?.status?.dataStats?.documents || 0}</div>
                    <div className="text-sm text-gray-600">Documents</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{(districtStatus as any)?.status?.dataStats?.leaveRequests || 0}</div>
                    <div className="text-sm text-gray-600">Leave Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{(districtStatus as any)?.status?.dataStats?.timeCards || 0}</div>
                    <div className="text-sm text-gray-600">Time Cards</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{(districtStatus as any)?.status?.dataStats?.pafSubmissions || 0}</div>
                    <div className="text-sm text-gray-600">PAF Submissions</div>
                  </div>
                </div>
                
                {(districtStatus as any)?.status?.isolation?.violations?.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This district has data isolation violations that need attention.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Data Isolation Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Critical Security Measures:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>All district data must include a valid districtId field</li>
                  <li>Users must be assigned to the correct district context</li>
                  <li>Database queries must always filter by district</li>
                  <li>No cross-district data access is permitted</li>
                  <li>Regular validation prevents data contamination</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">When Setting Up New Districts:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>Use the automated setup process above</li>
                  <li>Validate isolation immediately after creation</li>
                  <li>Monitor for any cross-district data leakage</li>
                  <li>Run cleanup procedures if violations are detected</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}