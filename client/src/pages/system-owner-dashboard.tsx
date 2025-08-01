import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Building2, 
  Users, 
  Workflow, 
  Activity, 
  Eye, 
  LogOut,
  Shield,
  Settings,
  BarChart3,
  Clock,
  ClipboardList
} from "lucide-react";

interface District {
  id: number;
  name: string;
  slug: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  employeeCount?: number;
  contactEmail: string;
}

interface SystemOwnerUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSystemOwner: boolean;
}

interface ImpersonationState {
  systemOwnerId: string;
  districtId: number;
  districtName: string;
  startedAt: string;
}

export default function SystemOwnerDashboard() {
  const [user, setUser] = useState<SystemOwnerUser | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    checkSession();
    fetchDistricts();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/system-owner/session');
      const data = await response.json();
      
      if (data.isAuthenticated) {
        setUser(data.user);
        setImpersonation(data.impersonation);
      } else {
        setLocation('/system-owner/login');
      }
    } catch (error) {
      console.error('Session check error:', error);
      setLocation('/system-owner/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchDistricts = async () => {
    try {
      const response = await fetch('/api/system-owner/districts');
      const data = await response.json();
      setDistricts(data);
    } catch (error) {
      console.error('Error fetching districts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch districts",
        variant: "destructive",
      });
    }
  };

  const handleImpersonate = async (districtId: number) => {
    try {
      const response = await fetch(`/api/system-owner/impersonate/${districtId}`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setImpersonation({
          systemOwnerId: user!.id,
          districtId: data.district.id,
          districtName: data.district.name,
          startedAt: new Date().toISOString()
        });
        
        toast({
          title: "Impersonation Started",
          description: `Now viewing ${data.district.name}`,
        });

        // Redirect to district dashboard
        setLocation('/dashboard');
      } else {
        const error = await response.json();
        toast({
          title: "Impersonation Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to impersonate district",
        variant: "destructive",
      });
    }
  };

  const handleEndImpersonation = async () => {
    try {
      const response = await fetch('/api/system-owner/end-impersonation', {
        method: 'POST',
      });

      if (response.ok) {
        setImpersonation(null);
        toast({
          title: "Impersonation Ended",
          description: "Returned to system owner dashboard",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end impersonation",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/system-owner/logout', { method: 'POST' });
      setLocation('/system-owner/login');
    } catch (error) {
      console.error('Logout error:', error);
      setLocation('/system-owner/login');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'trial': return 'secondary';
      case 'suspended': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'default';
      case 'professional': return 'secondary';
      case 'basic': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading system owner dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Timewise K-12 System Owner
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {user?.firstName} {user?.lastName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {impersonation && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    <Eye className="h-3 w-3 mr-1" />
                    Viewing: {impersonation.districtName}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEndImpersonation}
                  >
                    End Impersonation
                  </Button>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/system-owner/workflows')}
              >
                <Workflow className="h-4 w-4 mr-2" />
                Workflow Management
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Districts</p>
                  <p className="text-2xl font-bold text-gray-900">{districts.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Districts</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {districts.filter(d => d.subscriptionStatus === 'active').length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trial Districts</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {districts.filter(d => d.subscriptionStatus === 'trial').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Enterprise</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {districts.filter(d => d.subscriptionTier === 'enterprise').length}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Districts Table */}
        <Card>
          <CardHeader>
            <CardTitle>District Management</CardTitle>
            <CardDescription>
              View and manage all customer districts. Click "Impersonate" to access any district's dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">District</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Tier</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {districts.map((district) => (
                    <tr key={district.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{district.name}</p>
                          <p className="text-sm text-gray-600">{district.slug}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getStatusBadgeVariant(district.subscriptionStatus)}>
                          {district.subscriptionStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getTierBadgeVariant(district.subscriptionTier)}>
                          {district.subscriptionTier}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-900">{district.contactEmail}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleImpersonate(district.id)}
                            disabled={impersonation?.districtId === district.id}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {impersonation?.districtId === district.id ? 'Current' : 'Impersonate'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/system-owner/districts/${district.id}`)}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Manage
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation('/system-owner/paf-overview')}
                          >
                            <ClipboardList className="h-3 w-3 mr-1" />
                            PAF Overview
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}