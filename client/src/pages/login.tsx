import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Building2, Users, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function Login() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  
  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });
  
  // Registration form state
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    organizationName: "",
    organizationType: "school_district"
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulate login API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Login Successful",
        description: "Welcome back to your HR management system"
      });
      
      // Redirect to dashboard
      setLocation("/");
      
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid email or password",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (registerForm.password !== registerForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }
    
    try {
      // Simulate registration API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Registration Successful",
        description: "Account created! Setting up your organization..."
      });
      
      // Redirect to district setup
      setLocation("/district-setup");
      
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: "Unable to create account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Timewise K-12</h1>
                <p className="text-sm text-gray-500">Complete All-In-System for HR and Payroll</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4">
        <div className="w-full max-w-md space-y-6">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl mx-auto flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Welcome to Timewise K-12</h2>
              <p className="text-gray-600 mt-2">
                Complete All-In-System for HR and Payroll
              </p>
            </div>
          </div>

          {/* Login/Register Tabs */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Create Account</TabsTrigger>
                </TabsList>
                
                {/* Login Tab */}
                <TabsContent value="login" className="space-y-4 mt-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@schooldistrict.edu"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                  
                  <div className="text-center">
                    <a href="#" className="text-sm text-blue-600 hover:underline">
                      Forgot your password?
                    </a>
                  </div>
                </TabsContent>
                
                {/* Register Tab */}
                <TabsContent value="register" className="space-y-4 mt-6">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          value={registerForm.firstName}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, firstName: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Smith"
                          value={registerForm.lastName}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, lastName: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="registerEmail">Email Address</Label>
                      <Input
                        id="registerEmail"
                        type="email"
                        placeholder="admin@schooldistrict.edu"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="organizationName">School District Name</Label>
                      <Input
                        id="organizationName"
                        placeholder="Lincoln Unified School District"
                        value={registerForm.organizationName}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, organizationName: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="registerPassword">Password</Label>
                      <Input
                        id="registerPassword"
                        type="password"
                        placeholder="Create a strong password"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading}
                    >
                      {loading ? "Creating Account..." : "Create Account & Setup District"}
                    </Button>
                  </form>
                  
                  <div className="text-center text-xs text-gray-500">
                    By creating an account, you agree to our Terms of Service and Privacy Policy
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <Users className="w-8 h-8 text-blue-600 mx-auto" />
              <h3 className="font-semibold text-sm">Employee Management</h3>
              <p className="text-xs text-gray-600">Complete HR workflows</p>
            </div>
            <div className="space-y-2">
              <Shield className="w-8 h-8 text-green-600 mx-auto" />
              <h3 className="font-semibold text-sm">Secure & Compliant</h3>
              <p className="text-xs text-gray-600">FERPA & HIPAA ready</p>
            </div>
            <div className="space-y-2">
              <Building2 className="w-8 h-8 text-purple-600 mx-auto" />
              <h3 className="font-semibold text-sm">Multi-District</h3>
              <p className="text-xs text-gray-600">Scalable SaaS platform</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}