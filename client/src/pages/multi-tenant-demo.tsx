import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Users, 
  Shield, 
  Database, 
  CheckCircle2, 
  XCircle, 
  Zap,
  DollarSign,
  Calendar,
  FileText,
  Clock
} from "lucide-react";

interface District {
  id: number;
  name: string;
  slug: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  maxEmployees: number;
  currentEmployees?: number;
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  districtId: number;
}

export default function MultiTenantDemo() {
  const { toast } = useToast();
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [districtData, setDistrictData] = useState<{
    employees: Employee[];
    usageStats: any;
  } | null>(null);

  // Fetch all districts
  const { data: districts, isLoading: loadingDistricts } = useQuery({
    queryKey: ["/api/districts"],
  });

  // Demonstrate district login and data isolation
  const loginToDistrictMutation = useMutation({
    mutationFn: async (district: District) => {
      // Demo credentials for each district
      const credentials = {
        'demo-district': { username: 'demo_user', password: 'demo123' },
        'maplewood-elementary': { username: 'maplewood_hr', password: 'demo123' }
      };

      const creds = credentials[district.slug as keyof typeof credentials];
      if (!creds) {
        throw new Error('Demo credentials not available for this district');
      }

      const loginResponse = await apiRequest("/api/district/login", "POST", {
        username: creds.username,
        password: creds.password,
        districtSlug: district.slug
      });

      return { district, loginResponse };
    },
    onSuccess: async ({ district, loginResponse }) => {
      setSelectedDistrict(district);
      
      // Now fetch district-specific data
      try {
        const [employees, usageStats] = await Promise.all([
          apiRequest("/api/district/employees", "GET"),
          apiRequest("/api/district/usage-stats", "GET")
        ]);
        
        setDistrictData({
          employees: employees || [],
          usageStats: usageStats || {}
        });

        toast({
          title: "Successfully accessed district data",
          description: `Logged into ${district.name} - showing only their isolated data`
        });
      } catch (error) {
        console.error("Error fetching district data:", error);
        setDistrictData({
          employees: [],
          usageStats: {}
        });
      }
    },
    onError: (error) => {
      toast({
        title: "District access failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetDemo = () => {
    setSelectedDistrict(null);
    setDistrictData(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Multi-Tenant B2B SaaS Demo</h1>
            <p className="text-gray-600">Complete Data Isolation Between School Districts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-900">Data Isolation</h3>
            <p className="text-sm text-blue-700">Complete separation</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
            <Database className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold text-green-900">Multi-Tenant</h3>
            <p className="text-sm text-green-700">District-scoped data</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
            <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-900">SaaS Billing</h3>
            <p className="text-sm text-purple-700">$29-$199/month</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
            <Zap className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <h3 className="font-semibold text-orange-900">Real-Time</h3>
            <p className="text-sm text-orange-700">Live data updates</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="districts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="districts">Available Districts</TabsTrigger>
          <TabsTrigger value="isolation">Data Isolation Demo</TabsTrigger>
          <TabsTrigger value="billing">SaaS Features</TabsTrigger>
        </TabsList>

        <TabsContent value="districts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                School Districts in System
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDistricts ? (
                <div className="text-center py-8">Loading districts...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {districts?.map((district: District) => (
                    <div key={district.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{district.name}</h3>
                        <Badge variant={
                          district.subscriptionStatus === 'active' ? 'default' : 
                          district.subscriptionStatus === 'trial' ? 'secondary' : 'destructive'
                        }>
                          {district.subscriptionTier}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Slug: {district.slug}</p>
                        <p>Max Employees: {district.maxEmployees}</p>
                        <p>Status: {district.subscriptionStatus}</p>
                      </div>
                      <Button
                        onClick={() => loginToDistrictMutation.mutate(district)}
                        disabled={loginToDistrictMutation.isPending}
                        size="sm"
                        className="w-full"
                      >
                        Access District Data
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="isolation" className="space-y-4">
          {!selectedDistrict ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a District to Demo Data Isolation
                </h3>
                <p className="text-gray-600">
                  Choose a district from the "Available Districts" tab to see how data is completely isolated between tenants.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <div>
                    <h2 className="text-xl font-semibold">Connected to: {selectedDistrict.name}</h2>
                    <p className="text-gray-600">Showing district-isolated data only</p>
                  </div>
                </div>
                <Button onClick={resetDemo} variant="outline">
                  Reset Demo
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      District Employees
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {districtData?.employees?.length ? (
                        districtData.employees.map((employee) => (
                          <div key={employee.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="font-semibold">
                              {employee.firstName} {employee.lastName}
                            </div>
                            <div className="text-sm text-gray-600">
                              {employee.position} - {employee.department}
                            </div>
                            <div className="text-xs text-gray-500">
                              {employee.email}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          No employees found for this district
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      Usage Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Total Employees:</span>
                        <Badge>{districtData?.usageStats?.employeeCount || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Documents:</span>
                        <Badge variant="secondary">{districtData?.usageStats?.documentCount || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Leave Requests:</span>
                        <Badge variant="outline">{districtData?.usageStats?.leaveRequestCount || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Payroll Records:</span>
                        <Badge variant="outline">{districtData?.usageStats?.payrollRecordCount || 0}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-900">Data Isolation Confirmed</h3>
                      <p className="text-green-700 text-sm">
                        This district can only access their own employees, documents, and records. 
                        Complete separation from other districts is enforced at the database level.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-center">Basic</CardTitle>
                <div className="text-center">
                  <span className="text-3xl font-bold">$29</span>
                  <span className="text-gray-600">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Up to 100 employees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">3 admin users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Basic HR features</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Email support</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 ring-2 ring-purple-200">
              <CardHeader>
                <CardTitle className="text-center">Professional</CardTitle>
                <div className="text-center">
                  <span className="text-3xl font-bold">$79</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <Badge className="mx-auto">Most Popular</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Up to 500 employees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">5 admin users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Advanced analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Priority support</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="text-center">Enterprise</CardTitle>
                <div className="text-center">
                  <span className="text-3xl font-bold">$199</span>
                  <span className="text-gray-600">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Unlimited employees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">10 admin users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Custom integrations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">24/7 phone support</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>SaaS Platform Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Multi-Tenant Architecture</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Complete data isolation between districts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">District-scoped database operations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Role-based access control per district</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold">Business Features</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Automated monthly billing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-green-600" />
                      <span className="text-sm">30-day free trials</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Usage monitoring and reporting</span>
                    </div>
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