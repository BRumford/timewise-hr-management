import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Shield, Settings, Users, Workflow } from "lucide-react";

export default function SystemOwnerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/system-owner/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        toast({
          title: "Login Successful",
          description: "Welcome to the system owner dashboard",
        });
        setLocation('/system-owner/dashboard');
      } else {
        const error = await response.json();
        toast({
          title: "Login Failed",
          description: error.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Branding and Features Section */}
        <div className="space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
              <Shield className="h-10 w-10 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Timewise K-12
              </h1>
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              System Owner Portal
            </h2>
            <p className="text-gray-600">
              Advanced multi-district management and workflow administration platform
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-white/50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900">Multi-District Access</h3>
                <p className="text-sm text-gray-600">
                  Manage and impersonate any district account
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white/50 rounded-lg">
              <Workflow className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900">Workflow Management</h3>
                <p className="text-sm text-gray-600">
                  Create and customize district workflows
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white/50 rounded-lg">
              <Settings className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900">System Administration</h3>
                <p className="text-sm text-gray-600">
                  Full platform configuration and monitoring
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white/50 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900">Security Oversight</h3>
                <p className="text-sm text-gray-600">
                  Monitor access logs and security events
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">System Owner Login</CardTitle>
            <CardDescription className="text-center">
              Enter your system owner credentials to access the management dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="system@timewise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>
                System owner access required. Contact technical support
                <br />
                if you need assistance with your credentials.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}