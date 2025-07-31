import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { z } from "zod";
import { Building2, Users, Shield, ArrowRight } from "lucide-react";

const districtLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  districtSlug: z.string().min(1, "Please select your district")
});

type DistrictLoginForm = z.infer<typeof districtLoginSchema>;

export default function DistrictLogin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch available districts
  const { data: districts, isLoading: loadingDistricts } = useQuery({
    queryKey: ["/api/districts"],
  });

  const form = useForm<DistrictLoginForm>({
    resolver: zodResolver(districtLoginSchema),
    defaultValues: {
      username: "",
      password: "",
      districtSlug: ""
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (data: DistrictLoginForm) => {
      return await apiRequest("/api/district/login", "POST", data);
    },
    onSuccess: (response) => {
      toast({
        title: "Login successful",
        description: `Welcome to ${response.district.name}!`
      });
      
      // Store district context
      localStorage.setItem('currentDistrict', JSON.stringify(response.district));
      localStorage.setItem('currentUser', JSON.stringify(response.user));
      
      // Redirect to district dashboard
      setLocation('/');
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: DistrictLoginForm) => {
    loginMutation.mutate(data);
  };

  const demoLogin = (districtSlug: string, userType: string) => {
    const credentials = {
      'demo-district': {
        admin: { username: 'admin_user', password: 'admin123' },
        hr: { username: 'demo_user', password: 'demo123' },
        employee: { username: 'employee_user', password: 'emp123' }
      }
    };

    const creds = credentials[districtSlug as keyof typeof credentials]?.[userType as keyof typeof credentials['demo-district']];
    if (creds) {
      form.setValue('username', creds.username);
      form.setValue('password', creds.password);
      form.setValue('districtSlug', districtSlug);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left side - Branding and Features */}
        <div className="text-center lg:text-left space-y-6">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TimeWise HR</h1>
              <p className="text-sm text-gray-600">Multi-District Management</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-gray-900">
              Secure District Access
            </h2>
            <p className="text-lg text-gray-600">
              Complete HR management system with multi-tenant architecture. 
              Each district's data is completely isolated and secure.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Multi-District</h3>
              <p className="text-sm text-gray-600">Serve multiple school districts</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Data Isolation</h3>
              <p className="text-sm text-gray-600">Complete security between districts</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">Role-Based</h3>
              <p className="text-sm text-gray-600">Admin, HR, and Employee access</p>
            </div>
          </div>

          {/* District Stats */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Active Districts</h3>
            <div className="space-y-2">
              {districts?.slice(0, 4).map((district: any) => (
                <div key={district.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{district.name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    district.subscriptionStatus === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {district.subscriptionTier}
                  </span>
                </div>
              ))}
              {districts?.length > 4 && (
                <p className="text-xs text-gray-500">+{districts.length - 4} more districts</p>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">District Login</CardTitle>
            <p className="text-gray-600">Select your district and sign in</p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="districtSlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School District</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your district" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingDistricts ? (
                            <SelectItem value="loading" disabled>Loading districts...</SelectItem>
                          ) : (
                            districts?.map((district: any) => (
                              <SelectItem key={district.slug} value={district.slug}>
                                {district.name} ({district.subscriptionTier})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </Form>

            {/* Demo Login Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Demo Access</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? "Hide" : "Show"} Demo Options
                </Button>
              </div>
              
              {showAdvanced && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => demoLogin('demo-district', 'admin')}
                    >
                      Admin
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => demoLogin('demo-district', 'hr')}
                    >
                      HR
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => demoLogin('demo-district', 'employee')}
                    >
                      Employee
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Click any role to auto-fill demo credentials
                  </p>
                </div>
              )}
            </div>

            {/* B2B SaaS Information */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 text-sm mb-2">Multi-Tenant B2B SaaS</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Complete data isolation between districts</li>
                <li>• Subscription-based billing ($29-$199/month)</li>
                <li>• Role-based access control</li>
                <li>• Usage monitoring and analytics</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}