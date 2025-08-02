import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Users, 
  CreditCard, 
  Settings, 
  Plus,
  BarChart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Lock
} from "lucide-react";
import { z } from "zod";
import { useLocation } from "wouter";

const createDistrictSchema = z.object({
  name: z.string().min(1, "District name is required"),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  subscriptionTier: z.enum(["basic", "professional", "enterprise"]),
  maxEmployees: z.number().min(1),
  maxAdmins: z.number().min(1),
});

type CreateDistrictForm = z.infer<typeof createDistrictSchema>;

// System Owner Access Control Component
function SystemOwnerGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: systemOwnerStatus, isLoading: statusLoading, error } = useQuery({
    queryKey: ["/api/system-owner/status"],
    retry: false,
  });

  useEffect(() => {
    if (!statusLoading && (error || !systemOwnerStatus?.isSystemOwner)) {
      toast({
        title: "Access Denied",
        description: "District Management is restricted to system owners only.",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [systemOwnerStatus, statusLoading, error, setLocation, toast]);

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Verifying access permissions...</p>
        </div>
      </div>
    );
  }

  if (error || !systemOwnerStatus?.isSystemOwner) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-red-600">Access Restricted</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            District Management is only accessible to system owners. 
            Individual school districts cannot access this page.
          </p>
          <Button onClick={() => setLocation("/")} variant="outline" className="w-full">
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

export default function DistrictManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: districts, isLoading } = useQuery({
    queryKey: ["/api/system-owner/districts"],
  });

  const createDistrictMutation = useMutation({
    mutationFn: async (data: CreateDistrictForm) => {
      return await apiRequest("/api/system-owner/districts", "POST", data);
    },
    onSuccess: () => {
      toast({ title: "District created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/system-owner/districts"] });
      setShowCreateForm(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to create district",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<CreateDistrictForm>({
    resolver: zodResolver(createDistrictSchema),
    defaultValues: {
      subscriptionTier: "basic",
      maxEmployees: 100,
      maxAdmins: 5,
    },
  });

  const onSubmit = (data: CreateDistrictForm) => {
    createDistrictMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case "trial":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><AlertTriangle className="w-3 h-3 mr-1" />Trial</Badge>;
      case "suspended":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Suspended</Badge>;
      case "cancelled":
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    const colors = {
      basic: "bg-gray-100 text-gray-800",
      professional: "bg-blue-100 text-blue-800", 
      enterprise: "bg-purple-100 text-purple-800"
    };
    return <Badge className={colors[tier as keyof typeof colors] || ""}>{tier}</Badge>;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading districts...</div>;
  }

  return (
    <SystemOwnerGuard>
      <div className="container mx-auto py-6 space-y-6">
        {/* System Owner Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">System Owner Dashboard</h1>
              <p className="text-blue-100 text-sm">Master control panel for all school districts</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">District Management</h2>
            <p className="text-gray-600 mt-1">Manage school districts and their configurations - System Owner Access Only</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add District
          </Button>
        </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Districts</p>
                <p className="text-2xl font-bold">{districts?.length || 0}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Districts</p>
                <p className="text-2xl font-bold">{districts?.filter((d: any) => d.subscriptionStatus === 'active').length || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Trial Districts</p>
                <p className="text-2xl font-bold">{districts?.filter((d: any) => d.subscriptionStatus === 'trial').length || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue (Est.)</p>
                <p className="text-2xl font-bold">$0</p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Districts List */}
      <Card>
        <CardHeader>
          <CardTitle>School Districts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {districts?.map((district: any) => (
              <div key={district.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{district.name}</h3>
                      {getStatusBadge(district.subscriptionStatus)}
                      {getTierBadge(district.subscriptionTier)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Contact:</span> {district.contactEmail}
                      </div>
                      <div>
                        <span className="font-medium">Slug:</span> {district.slug}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {new Date(district.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mt-2">
                      <div>
                        <span className="font-medium">Max Employees:</span> {district.maxEmployees}
                      </div>
                      <div>
                        <span className="font-medium">Max Admins:</span> {district.maxAdmins}
                      </div>
                      {district.trialEndsAt && (
                        <div>
                          <span className="font-medium">Trial Ends:</span> {new Date(district.trialEndsAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-1" />
                      Manage
                    </Button>
                    <Button variant="outline" size="sm">
                      <BarChart className="w-4 h-4 mr-1" />
                      Analytics
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {districts?.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No school districts found</p>
                <p className="text-sm">Create your first district to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create District Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle>Create New District</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>District Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Example School District" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@district.edu" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subscriptionTier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subscription Tier</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="basic">Basic - $29/month</SelectItem>
                            <SelectItem value="professional">Professional - $79/month</SelectItem>
                            <SelectItem value="enterprise">Enterprise - $199/month</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="maxEmployees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Employees</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxAdmins"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Admins</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createDistrictMutation.isPending}
                      className="flex-1"
                    >
                      {createDistrictMutation.isPending ? "Creating..." : "Create District"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </SystemOwnerGuard>
  );
}